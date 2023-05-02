/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";

export default class IncludePath extends TreeItem {
  static contextValue = `includePath`;
  constructor(public workspaceFolder: WorkspaceFolder, includePath: string) {
    super(includePath, TreeItemCollapsibleState.None);

    this.contextValue = IncludePath.contextValue;
    this.iconPath = new ThemeIcon(`link`);
  }
}