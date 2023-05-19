/*
 * (c) Copyright IBM Corp. 2023
 */

import { Command, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";

/**
 * Tree item for error information
 */
export default class ErrorItem extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.error;

  constructor(public workspaceFolder: WorkspaceFolder | undefined, label: string, options: { description?: string, command?: Command } = {}) {
    super(label, TreeItemCollapsibleState.None);

    this.contextValue = ErrorItem.contextValue;
    this.description = options.description;
    this.command = options.command;
    this.iconPath = new ThemeIcon(`error`);
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}