/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
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
    this.description = value || l10n.t('No value');
    this.iconPath = new ThemeIcon(`pencil`);
    this.tooltip = l10n.t('Name: {0}\n', name) +
      (value ? l10n.t('Value: {0}', value) : ``);
    this.command = {
      command: `vscode-ibmi-projectexplorer.updateVariable`,
      arguments: [this.workspaceFolder, name, value],
      title: l10n.t('Update value')
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}