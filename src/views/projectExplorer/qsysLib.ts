/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, l10n } from "vscode";

export default class QSYSLib extends TreeItem {
  static contextValue = `Library`;
  name: string;

  constructor(path: string, name: string) {
    super(name, TreeItemCollapsibleState.Collapsed);
    this.description = path;
    this.contextValue = `Library`;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.name = name;
    this.tooltip = l10n.t(`Library {0}`, path);
  }
}