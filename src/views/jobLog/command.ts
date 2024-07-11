/*
 * (c) Copyright IBM Corp. 2023
 */

import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for a command.
 */
export default class Command extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.command;
  cmd: string;

  constructor(public workspaceFolder: WorkspaceFolder, cmd: string) {
    super(cmd, TreeItemCollapsibleState.None);

    this.contextValue = Command.contextValue;
    this.cmd = cmd;
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}