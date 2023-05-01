/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";

export default class ObjectLibrary extends TreeItem {
  static contextValue = `objectLibrary`;
  constructor(public workspaceFolder: WorkspaceFolder) {
    super(l10n.t("Object Libraries"), TreeItemCollapsibleState.Collapsed);

    this.resourceUri = workspaceFolder.uri;
    this.iconPath = new ThemeIcon(`root-folder`);
    this.contextValue = `objectLibrary`;
    this.tooltip = l10n.t("Object Libraries - Work with the set of libraries defined in the curlib, objlib, preUsrlibl, and postUsrlibl entries of the iproj.json")
  }
}