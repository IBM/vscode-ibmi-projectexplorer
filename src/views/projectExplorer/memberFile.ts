/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { IBMiMember } from "@halcyontech/vscode-ibmi-types";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";

/**
 * Tree item for a member file
 */
export default class MemberFile extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.memberFile;
  memberFileInfo: IBMiMember;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, memberFileInfo: IBMiMember, pathToObject: string) {
    const extension = memberFileInfo.extension.trim() !== '' ? memberFileInfo.extension : 'MBR';
    super(`${memberFileInfo.name}.${extension}`, TreeItemCollapsibleState.None);
    this.memberFileInfo = memberFileInfo;
    this.path = `${pathToObject}/${memberFileInfo.name}.${memberFileInfo.extension}`;
    this.contextValue = MemberFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.description = memberFileInfo.text;
    this.tooltip = `Name: ${memberFileInfo.name}\n` +
      `Path: ${this.path}\n` +
      (memberFileInfo.text?.trim() !== '' ? `Text: ${memberFileInfo.text}\n` : ``) +
      `Extension: ${extension}\n` +
      `Record Length: ${memberFileInfo.recordLength}\n` +
      `Changed: ${memberFileInfo.changed}\n` +
      (memberFileInfo.asp ? `ASP: ${memberFileInfo.asp}` : ``);
    this.resourceUri = this.getMemberResourceUri();
    this.command = {
      command: `vscode.open`,
      title: `Open Member`,
      arguments: [this.resourceUri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }

  getMemberResourceUri() {
    const path = `${this.memberFileInfo.asp ? `${this.memberFileInfo.asp}/` : ``}${this.memberFileInfo.library}/${this.memberFileInfo.file}/${this.memberFileInfo.name}.${this.memberFileInfo.extension}`;
    return Uri.parse(path).with({ scheme: `member`, path: `/${path}` });
  }
}