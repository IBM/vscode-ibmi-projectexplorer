/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import * as path from "path";
import { ProjectTreeItem } from "./projectTreeItem";
import { ContextValue } from "../../typings";

export default class IFSFile extends ProjectTreeItem {
  static contextValue = ContextValue.ifsFile;

  constructor(public workspaceFolder: WorkspaceFolder, fullpath: string) {
    super(path.posix.basename(fullpath), TreeItemCollapsibleState.None);

    this.resourceUri = Uri.from({
      scheme: `streamfile`,
      path: fullpath
    });
    this.contextValue = IFSFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
  }

  getChildren(): ProjectTreeItem[] {
    return [];
  }
}