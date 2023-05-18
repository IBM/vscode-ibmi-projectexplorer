/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import MemberFile from "./memberFile";
import { getInstance } from "../../ibmi";
import { ContextValue } from "../../projectExplorerApi";
import { IBMiObject } from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for an object file
 */
export default class ObjectFile extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.objectFile;
  objectFileInfo: IBMiObject;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, objectFileInfo: IBMiObject, pathToLibrary: string) {
    const type = objectFileInfo.type.startsWith(`*`) ? objectFileInfo.type.substring(1) : objectFileInfo.type;
    super(`${objectFileInfo.name}.${type}`);

    this.objectFileInfo = objectFileInfo;
    this.path = `${pathToLibrary}/${objectFileInfo.name}.${type}`;
    this.collapsibleState = objectFileInfo.attribute === 'PF' ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
    this.contextValue = ObjectFile.contextValue;
    const icon = objectFileIcons.get(type.toLowerCase()) || `file`;
    this.iconPath = new ThemeIcon(icon);
    this.description = (objectFileInfo.text.trim() !== '' ? `${objectFileInfo.text} ` : ``) +
      (objectFileInfo.attribute?.trim() !== '' ? `(${objectFileInfo.attribute})` : '');
    this.tooltip = `Name: ${objectFileInfo.name}\n` +
      `Path: ${this.path}\n` +
      (objectFileInfo.text.trim() !== '' ? `Text: ${objectFileInfo.text}\n` : ``) +
      `Attribute: ${objectFileInfo.attribute}\n` +
      `Type: ${objectFileInfo.type}`;
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const members = await ibmi?.getContent().getMemberList(this.objectFileInfo.library, this.objectFileInfo.name, undefined, undefined, { order: 'name' });
    if (members) {
      for (const member of members) {
        items.push(new MemberFile(this.workspaceFolder, member, this.path));
      }
    }

    return items;
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