import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import * as path from "path";

export default class Variables extends TreeItem {
  static contextValue = `variable`;
  constructor(name: string, value?: string) {
    super(name, TreeItemCollapsibleState.None);

    this.contextValue = Variables.contextValue;
    this.description = value || `No value`;
    this.iconPath = new ThemeIcon(`symbol-property`);
    // TODO: on click, make editable
  }
}