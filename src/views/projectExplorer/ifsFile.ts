/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import * as vscodeIbmiTypes from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for an IFS file.
 */
export default class IFSFile extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.ifsFile;
  ifsFileInfo: vscodeIbmiTypes.IFSFile;

  constructor(public workspaceFolder: WorkspaceFolder, ifsFileInfo: vscodeIbmiTypes.IFSFile) {
    super(ifsFileInfo.name, TreeItemCollapsibleState.None);

    this.ifsFileInfo = ifsFileInfo;
    this.contextValue = IFSFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.tooltip = l10n.t('Name: {0}\n', ifsFileInfo.name) +
      l10n.t('Path: {0}\n', ifsFileInfo.path) +
      (ifsFileInfo.size ? l10n.t('Size: {0}\n', ifsFileInfo.size) : ``) +
      (ifsFileInfo.owner ? l10n.t('Owner: {0}\n', ifsFileInfo.owner) : ``) +
      (ifsFileInfo.modified ? l10n.t('Modified: {0}', ifsFileInfo.modified.toLocaleString()) : ``);
    this.resourceUri = this.getIFSFileResourceUri();
    this.command = {
      command: `vscode.open`,
      title: l10n.t('Open Stream File'),
      arguments: [this.resourceUri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }

  getIFSFileResourceUri() {
    const path = this.ifsFileInfo.path;
    return Uri.parse(path).with({ scheme: `streamfile` });
  }
}