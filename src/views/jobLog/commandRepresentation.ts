/*
 * (c) Copyright IBM Corp. 2023
 */

import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for the representation of a command.
 */
export default class CommandRepresentation extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.commandRepresentation;
  commandInfo: string;

  constructor(public workspaceFolder: WorkspaceFolder, commandInfo: string) {
    super(commandInfo, TreeItemCollapsibleState.None);
    this.contextValue = CommandRepresentation.contextValue;
    this.commandInfo = commandInfo;
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}