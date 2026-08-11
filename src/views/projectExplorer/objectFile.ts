/*
 * (c) Copyright IBM Corp. 2023
 */

import { IBMiObject } from "@halcyontech/vscode-ibmi-types";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, window } from "vscode";
import { getInstance, getVSCodeTools } from "../../ibmi";
import { ContextValue } from "../../ibmiProjectExplorer";
import MemberFile from "./memberFile";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";

/**
 * Tree item for an object file.
 */
export default class ObjectFile extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.objectFile;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, public readonly object: IBMiObject, pathToLibrary: string) {
    const type = object.type.startsWith(`*`) ? object.type.substring(1) : object.type;
    super(`${object.name}.${type}`);

    this.object = object;
    this.path = `${pathToLibrary}/${object.name}.${type}`;
    this.collapsibleState = object.attribute === 'PF' ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
    this.contextValue = ObjectFile.contextValue +
      (type ? `.${type}` : ``) +
      (object.sourceFile ? `.SPF` : ``);
    const icon = objectFileIcons.get(type.toLowerCase()) || `file`;
    this.iconPath = new ThemeIcon(icon);
    this.description = (object.text.trim() !== '' ? `${object.text} ` : ``) +
      (object.attribute?.trim() !== '' ? `(${object.attribute})` : '');
    this.resourceUri = this.getObjectResourceUri();
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const connection = ibmi?.getConnection();
    if (ibmi && connection) {
      const content = connection.getContent();
      const members = await content.getMemberList({
        library: this.object.library,
        sourceFile: this.object.name,
        members: `*`,
        extensions: `*`,
        sort: { order: 'name' }
      });
      if (members) {
        for (const member of members) {
          items.push(new MemberFile(this.workspaceFolder, member, this.path));
        }
      }
    } else {
      window.showErrorMessage(l10n.t('Please connect to an IBM i'));
    }

    return items;
  }

  async getToolTip() {
    const ibmi = getInstance();
    const path = [this.object.library, this.object.name].join(`/`);
    const vsCodeTools = getVSCodeTools();
    if (this.object.sourceFile) {
      const connection = ibmi?.getConnection();
      if (connection) {
        return await vsCodeTools?.sourcePhysicalFileToToolTip(connection, path, this.object);
      }
    } else {
      return vsCodeTools?.objectToToolTip(path, this.object);
    }
  }

  getObjectResourceUri() {
    const type = this.object.type.startsWith(`*`) ? this.object.type.substring(1) : this.object.type;
    const path = `${this.object.library}/${this.object.name}.${type}`;
    return Uri.parse(path).with({ scheme: `object`, path: `/${path}` });
  }
}

let objectFileIcons = new Map<string, string>([
  ['file', `database`],
  ['cmd', `terminal`],
  ['module', `extensions`],
  ['pgm', `file-binary`],
  ['dtaara', `clippy`],
  ['dtaq', `list-ordered`],
  ['jobq', `checklist`],
  ['lib', `library`],
  ['meddfn', `save-all`],
  ['outq', `symbol-enum`],
  ['pnlgrp', `book`],
  ['sbsd', `server-process`],
  ['srvpgm', `file-submodule`],
  ['usrspc', `chrome-maximize`]
]);