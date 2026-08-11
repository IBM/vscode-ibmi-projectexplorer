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
  object: IBMiObject;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, objectFileInfo: IBMiObject, pathToLibrary: string) {
    const type = objectFileInfo.type.startsWith(`*`) ? objectFileInfo.type.substring(1) : objectFileInfo.type;
    super(`${objectFileInfo.name}.${type}`);

    this.object = objectFileInfo;
    this.path = `${pathToLibrary}/${objectFileInfo.name}.${type}`;
    this.collapsibleState = objectFileInfo.attribute === 'PF' ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
    this.contextValue = ObjectFile.contextValue +
      (type ? `.${type}` : ``) +
      (objectFileInfo.sourceFile ? `.SPF` : ``);
    const icon = objectFileIcons.get(type.toLowerCase()) || `file`;
    this.iconPath = new ThemeIcon(icon);
    this.description = (objectFileInfo.text.trim() !== '' ? `${objectFileInfo.text} ` : ``) +
      (objectFileInfo.attribute?.trim() !== '' ? `(${objectFileInfo.attribute})` : '');
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