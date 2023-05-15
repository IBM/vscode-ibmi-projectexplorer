/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";

/**
 * Tree item for a variable
 */
export default class Variable extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.variable;

  constructor(public workspaceFolder: WorkspaceFolder, name: string, value?: string) {
    super(name, TreeItemCollapsibleState.None);

    this.resourceUri = Uri.parse(`variable:${value ? 'resolved' : 'unresolved'}`, true);
    this.contextValue = Variable.contextValue;
    this.description = value || `No value`;
    this.iconPath = new ThemeIcon(`pencil`);
    this.command = {
      command: `vscode-ibmi-projectexplorer.updateVariable`,
      arguments: [this.workspaceFolder, name, value],
      title: `Update value`
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}