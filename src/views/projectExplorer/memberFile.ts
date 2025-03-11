/*
 * (c) Copyright IBM Corp. 2023
 */

import { MarkdownString, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { IBMiMember } from "@halcyontech/vscode-ibmi-types";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { getInstance, getVSCodeTools } from "../../ibmi";

/**
 * Tree item for a member file.
 */
export default class MemberFile extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.memberFile;
  memberFileInfo: IBMiMember;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, memberFileInfo: IBMiMember, pathToObject: string) {
    const extension = memberFileInfo.extension.trim() !== '' ? memberFileInfo.extension : 'MBR';
    super(`${memberFileInfo.name}.${extension}`, TreeItemCollapsibleState.None);
    this.memberFileInfo = memberFileInfo;
    this.path = `${pathToObject}/${memberFileInfo.name}.${extension}`;
    this.contextValue = MemberFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.description = memberFileInfo.text;
    this.resourceUri = this.getMemberResourceUri();
    const vsCodeTools = getVSCodeTools();
    this.tooltip = vsCodeTools?.memberToToolTip([memberFileInfo.library, memberFileInfo.file, `${memberFileInfo.name}.${extension}`].join(`/`), memberFileInfo);
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