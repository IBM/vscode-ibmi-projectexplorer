/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";

export enum LibraryType {
  library,
  systemLibrary,
  currentLibrary,
  userLibrary
}

export default class QSYSLib extends TreeItem {
  static contextValue = `library`;
  name: string;
  type: LibraryType;

  constructor(public workspaceFolder: WorkspaceFolder, path: string, name: string, type: LibraryType) {
    super(name, TreeItemCollapsibleState.Collapsed);
    this.description = path;
    this.contextValue = QSYSLib.contextValue;
    this.name = name;
    this.tooltip = `Library ${path}`;
    this.type = type;

    let iconColor: ThemeColor | undefined;
    switch (type) {
      case LibraryType.systemLibrary:
        iconColor = new ThemeColor('projectExplorer.systemLibrary');
        break;
      case LibraryType.currentLibrary:
        iconColor = new ThemeColor('projectExplorer.currentLibrary');
        break;
      case LibraryType.userLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        break;
      default:
        iconColor = undefined;
    }
    this.iconPath = new ThemeIcon(`library`, iconColor);
  }
}