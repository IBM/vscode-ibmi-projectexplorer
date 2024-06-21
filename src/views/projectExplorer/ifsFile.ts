/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import * as vscodeIbmiTypes from "@halcyontech/vscode-ibmi-types";
import { getInstance } from "../../ibmi";

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
    const ibmi = getInstance();
    this.tooltip = ibmi?.getContent().ifsFileToToolTip(ifsFileInfo.path, ifsFileInfo);
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