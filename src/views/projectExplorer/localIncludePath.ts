/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { Position } from "./includePaths";

/**
 * Tree item for a local include path
 */
export default class LocalIncludePath extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePath;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, uri: Uri, position: Position) {
    super(includePath, TreeItemCollapsibleState.None);

    this.contextValue = LocalIncludePath.contextValue + ContextValue.local;
    if (position){
      this.contextValue +=
        position === 'first' ? ContextValue.first : '' +
        position === 'last' ? ContextValue.last : ContextValue.middle;
    }
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.tooltip = l10n.t('Name: {0}\n', includePath) +
      l10n.t('Path: {0}', uri.fsPath);
    this.iconPath = new ThemeIcon(`link`);
    this.command = {
      command: `revealInExplorer`,
      title:l10n.t('Reveal in Explorer'),
      arguments: [uri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}