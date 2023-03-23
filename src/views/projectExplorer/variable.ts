/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";

export default class Variables extends TreeItem {
  static contextValue = `variable`;
  constructor(private workspaceFolder: WorkspaceFolder, name: string, value?: string) {
    super(name, TreeItemCollapsibleState.None);

    this.resourceUri = Uri.parse(`variable:${value ? 'resolved' : 'unresolved'}`, true);
    this.contextValue = Variables.contextValue;
    this.description = value || `No value`;
    this.iconPath = new ThemeIcon(`pencil`);

    this.command = {
      command: `vscode-ibmi-projectmode.updateVariable`,
      arguments: [this.workspaceFolder, name, value],
      title: `Update value`
    };
  }
}