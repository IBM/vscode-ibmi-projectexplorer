/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";

export default class IncludePaths extends TreeItem {
  static contextValue = `includePaths`;
  constructor(public workspaceFolder: WorkspaceFolder) {
    super(`Include Paths`, TreeItemCollapsibleState.Collapsed);

    this.contextValue = IncludePaths.contextValue;
    this.iconPath = new ThemeIcon(`list-flat`);
  }
}