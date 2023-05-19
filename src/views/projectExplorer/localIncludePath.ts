/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";

/**
 * Tree item for a local include path
 */
export default class LocalIncludePath extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePath;
  uri: Uri;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, uri: Uri) {
    super(includePath, TreeItemCollapsibleState.None);
    this.uri = uri;

    this.contextValue = LocalIncludePath.contextValue + ContextValue.local;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.tooltip = `Name: ${includePath}\n` +
      `Path: ${uri.fsPath}\n`;
    this.iconPath = new ThemeIcon(`link`);
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}