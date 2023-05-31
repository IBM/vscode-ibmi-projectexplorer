/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";

/**
 * Tree item for a local include path
 */
export default class LocalIncludePath extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePath;
  uri: Uri;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, uri: Uri, custom?: { description?: string }) {
    super(includePath, TreeItemCollapsibleState.None);
    this.uri = uri;

    this.tooltip = l10n.t('Name: {0}\n', includePath) +
      l10n.t('Path: {0}', uri.fsPath);
    this.iconPath = new ThemeIcon(`link`);
    this.description = (custom && custom.description) ? custom.description : undefined;
    this.contextValue = LocalIncludePath.contextValue + ContextValue.local;
    if (!custom || !custom.description) {
      this.contextValue += ContextValue.configurable;
    }
    this.iconPath = new ThemeIcon(`link`);
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}