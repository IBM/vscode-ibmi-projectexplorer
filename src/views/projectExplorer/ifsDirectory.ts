/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n, window } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import IFSFile from "./ifsFile";
import { getInstance, getVSCodeTools } from "../../ibmi";
import { ContextValue } from "../../ibmiProjectExplorer";
import * as vscodeIbmiTypes from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for an IFS directory.
 */
export default class IFSDirectory extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.ifsDirectory;
  ifsDirectoryInfo: vscodeIbmiTypes.IFSFile;

  constructor(public workspaceFolder: WorkspaceFolder, ifsDirectoryInfo: vscodeIbmiTypes.IFSFile, custom?: { label?: string, description?: string }) {
    super((custom && custom.label) ? custom.label : ifsDirectoryInfo.name, TreeItemCollapsibleState.Collapsed);
    this.ifsDirectoryInfo = ifsDirectoryInfo;

    this.contextValue = IFSDirectory.contextValue;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    const vsCodeTools = getVSCodeTools();
    this.tooltip = vsCodeTools?.ifsFileToToolTip(ifsDirectoryInfo.path, ifsDirectoryInfo);
    this.description = (custom && custom.description ? custom.description : undefined);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    if (ibmi && ibmi.getConnection()) {
      const files = await ibmi?.getContent().getFileList(this.ifsDirectoryInfo.path, { order: 'name' });
      if (files) {
        for (const file of files) {
          if (file.type === 'directory') {
            items.push(new IFSDirectory(this.workspaceFolder, file));
          } else {
            items.push(new IFSFile(this.workspaceFolder, file));
          }
        }
      }
    } else {
      window.showErrorMessage(l10n.t('Please connect to an IBM i'));
    }

    return items;
  }
}