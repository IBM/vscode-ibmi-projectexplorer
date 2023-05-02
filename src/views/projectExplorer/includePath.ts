/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";

export default class IncludePath extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePath;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string) {
    super(includePath, TreeItemCollapsibleState.None);

    this.contextValue = IncludePath.contextValue;
    this.iconPath = new ThemeIcon(`link`);
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}