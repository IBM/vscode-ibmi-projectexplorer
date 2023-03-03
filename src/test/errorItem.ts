import { Command, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";

export default class ErrorItem extends TreeItem {
  constructor(label: string, options: {description?: string, command?: Command} = {}) {
    super(label, TreeItemCollapsibleState.None);

    this.description = options.description;
    this.command = options.command;

    this.iconPath = new ThemeIcon(`error`);
  }
}