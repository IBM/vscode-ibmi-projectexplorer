/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for a variable.
 */
export default class Variable extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.variableItem;
  value?: string;

  constructor(public workspaceFolder: WorkspaceFolder, name: string, value?: string) {
    super(name, TreeItemCollapsibleState.None);

    this.value = value;
    this.resourceUri = Uri.parse(`variableItem:${value ? 'resolved' : 'unresolved'}`, true);
    this.contextValue = Variable.contextValue;
    this.description = value || l10n.t('No value');
    this.iconPath = new ThemeIcon(`pencil`);
    this.tooltip = l10n.t('Name: {0}\n', name) +
      (value ? l10n.t('Value: {0}', value) : ``);
    this.command = {
      command: `vscode-ibmi-projectexplorer.projectExplorer.editVariable`,
      arguments: [this],
      title: l10n.t('Edit Variable')
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}