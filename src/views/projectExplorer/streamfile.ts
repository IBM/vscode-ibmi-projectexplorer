/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import * as path from "path";

export default class Streamfile extends TreeItem {
  static contextValue = `streamfile`;
  constructor(fullpath: string) {
    super(path.posix.basename(fullpath), TreeItemCollapsibleState.None);

    this.resourceUri = Uri.from({
      scheme: `streamfile`,
      path: fullpath
    });
    this.contextValue = Streamfile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
  }
}