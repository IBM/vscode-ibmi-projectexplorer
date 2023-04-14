/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";

export default class LibraryList extends TreeItem {
  static contextValue = `libraryList`;
  constructor(public workspaceFolder: WorkspaceFolder) {
    super(`Library List`, TreeItemCollapsibleState.Collapsed);

    this.contextValue = LibraryList.contextValue;
    this.iconPath = new ThemeIcon(`folder-library`);
  }
}