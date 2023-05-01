/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";

export default class Variables extends TreeItem {
  static contextValue = `variables`;
  constructor(public workspaceFolder: WorkspaceFolder, unresolvedVariableCount: number) {
    super(l10n.t('Variables'), TreeItemCollapsibleState.Collapsed);

    this.resourceUri = Uri.parse(`variables:${unresolvedVariableCount}`, true);
    this.contextValue = Variables.contextValue;
    this.iconPath = new ThemeIcon(`symbol-variable`);
  }
}