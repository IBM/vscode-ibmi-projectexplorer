import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import * as path from "path";

export default class Variables extends TreeItem {
  static contextValue = `variables`;
  constructor(public workspaceFolder: WorkspaceFolder) {
    super(`Variables`, TreeItemCollapsibleState.Collapsed);

    this.contextValue = Variables.contextValue;
    this.iconPath = new ThemeIcon(`symbol-variable`);
  }
}