/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import IFSFile from "./ifsFile";
import { getInstance } from "../../ibmi";
import { ContextValue } from "../../projectExplorerApi";
import * as vscodeIbmiTypes from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for an IFS directory
 */
export default class IFSDirectory extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.ifsDirectory;
  ifsDirectoryInfo: vscodeIbmiTypes.IFSFile;

  constructor(public workspaceFolder: WorkspaceFolder, ifsDirectoryInfo: vscodeIbmiTypes.IFSFile, custom?: { label?: string, description?: string }) {
    super(ifsDirectoryInfo.name, TreeItemCollapsibleState.Collapsed);
    this.ifsDirectoryInfo = ifsDirectoryInfo;

    this.contextValue = IFSDirectory.contextValue;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.tooltip = l10n.t('Name: {0}\n', ifsDirectoryInfo.name) +
      l10n.t('Path: {0}', ifsDirectoryInfo.path);
    if (custom) {
      if (custom.label) {
        this.label = custom.label;
      }

      if (custom.description) {
        this.description = custom.description;
      }
    }
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
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

    return items;
  }
}