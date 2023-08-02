/*
 * (c) Copyright IBM Corp. 2023
 */

import { Command, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";

/**
 * Tree item for error information.
 */
export default class ErrorItem extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.error;

  constructor(public workspaceFolder: WorkspaceFolder | undefined, label: string, options: { description?: string, contextValue?: string, command?: Command, tooltip?: string } = {}) {
    super(label, TreeItemCollapsibleState.None);

    this.contextValue = ErrorItem.contextValue;
    this.description = options.description;
    this.contextValue = options.contextValue;
    this.command = options.command;
    this.tooltip = options.tooltip;
    this.iconPath = new ThemeIcon(`error`);
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}