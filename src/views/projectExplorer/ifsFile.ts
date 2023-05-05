/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import * as vscodeIbmiTypes from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for an IFS file
 */
export default class IFSFile extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.ifsFile;
  ifsFileInfo: vscodeIbmiTypes.IFSFile;

  constructor(public workspaceFolder: WorkspaceFolder, ifsFileInfo: vscodeIbmiTypes.IFSFile) {
    super(ifsFileInfo.name, TreeItemCollapsibleState.None);
    this.ifsFileInfo = ifsFileInfo;
    this.contextValue = IFSFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.tooltip = `Name: ${ifsFileInfo.name}\n` +
      `Path: ${ifsFileInfo.path}\n`;
    this.resourceUri = this.getIFSFileResourceUri();
    this.command = {
      command: `vscode.open`,
      title: `Open Stream File`,
      arguments: [this.resourceUri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }

  getIFSFileResourceUri() {
    const path = this.ifsFileInfo.path;
    return Uri.parse(path).with({ scheme: `streamfile`, path });
  }
}