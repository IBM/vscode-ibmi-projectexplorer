import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";

export default class QSYSLib extends TreeItem {
static contextValue = `Library`;
  name: string;

  constructor(path: string, name: string) {
    super(name, TreeItemCollapsibleState.Collapsed);
      this.description = path;
      this.contextValue = `Library`;
      this.iconPath = new ThemeIcon(`symbol-folder`);
      this.name = name;
      this.tooltip = `Library ${path}`
  }
}