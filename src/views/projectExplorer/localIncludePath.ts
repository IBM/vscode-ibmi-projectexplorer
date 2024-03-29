/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ContextValue } from "../../ibmiProjectExplorer";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { Position } from "../../iproject";

/**
 * Tree item for a local include path.
 */
export default class LocalIncludePath extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePath;
  variable?: string;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, uri: Uri, position?: Position, variable?: string) {
    super(includePath, TreeItemCollapsibleState.None);
    this.variable = variable;

    this.tooltip = l10n.t('Name: {0}\n', includePath) +
      l10n.t('Path: {0}', uri.fsPath);
    this.description = variable ? variable : undefined;
    this.contextValue = LocalIncludePath.contextValue + ContextValue.local +
      (position === 'first' ? ContextValue.first : '') +
      (position === 'last' ? ContextValue.last : '') +
      (position === 'middle' ? ContextValue.middle : '') +
      (!variable ? ContextValue.configurable : '');
    this.iconPath = new ThemeIcon(`link`);
    this.command = {
      command: `revealInExplorer`,
      title: l10n.t('Reveal in Explorer'),
      arguments: [uri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}