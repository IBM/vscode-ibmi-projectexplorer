/*
 * (c) Copyright IBM Corp. 2023
 */

import { Command, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for error information.
 */
export default class ErrorItem extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.error;

  private constructor(public workspaceFolder: WorkspaceFolder | undefined, label: string, options: { description?: string, contextValue?: string, command?: Command, tooltip?: string } = {}) {
    super(label, TreeItemCollapsibleState.None);

    this.contextValue = ErrorItem.contextValue;
    this.description = options.description;
    this.contextValue = options.contextValue;
    this.command = options.command;
    this.tooltip = options.tooltip;
    this.iconPath = new ThemeIcon(`error`);
  }

  static createNoWorkspaceFolderError(): ErrorItem {
    return new ErrorItem(
      undefined,
      l10n.t('Please open a local workspace folder'),
      {
        contextValue: ErrorItem.contextValue + ContextValue.addFolderToWorkspace,
        command: {
          command: 'workbench.action.addRootFolder',
          title: l10n.t('Add Folder to Workspace')
        }
      }
    );
  }

  static createNoJobLogError(workspaceFolder: WorkspaceFolder): ErrorItem {
    return new ErrorItem(
      workspaceFolder, l10n.t('No job log found')
    );
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}