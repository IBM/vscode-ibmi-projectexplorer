import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import * as path from "path";

export default class IFSFolder extends TreeItem {
  static contextValue = `directory`;
  constructor(ifsFolder: string, customTitle?: string) {
    super(customTitle || path.posix.basename(ifsFolder), TreeItemCollapsibleState.Collapsed);

    if (customTitle) {
      this.description = ifsFolder;
    }

    this.resourceUri = Uri.from({
      scheme: `streamfile`,
      path: ifsFolder
    });
    this.contextValue = IFSFolder.contextValue;
    this.iconPath = new ThemeIcon(`symbol-folder`);
  }
}