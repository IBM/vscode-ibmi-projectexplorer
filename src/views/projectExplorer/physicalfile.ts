import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import * as path from "path";

export default class PhysicalFile extends TreeItem {
  static contextValue = `physicalfile`;
  library: string;
  file: string;
  constructor(fullpath: string, library:string, file:string, text:string) {
    super(`${path.posix.basename(fullpath)}`, TreeItemCollapsibleState.Collapsed);

    this.resourceUri = Uri.from({
      scheme: `physicalfile`,
      path: fullpath
    });
    this.library = library;
    this.file = file;
    this.description = "(PF)"
    this.tooltip = text;
    this.contextValue = PhysicalFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
  }
}