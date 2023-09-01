/*
 * (c) Copyright IBM Corp. 2023
 */

import { Command, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import Library from "./library";
import { Position } from "../../iproject";
import { EnvironmentManager } from "../../environmentManager";

/**
 * Tree item for error information.
 */
export default class ErrorItem extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.error;

  private constructor(public workspaceFolder: WorkspaceFolder | undefined, label: string, options: { description?: string, contextValue?: string, command?: Command, tooltip?: string } = {}) {
    super(label, TreeItemCollapsibleState.None);

    this.description = options.description;
    this.contextValue = options.contextValue ? options.contextValue : ErrorItem.contextValue;
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

  static createNoIProjError(workspaceFolder: WorkspaceFolder): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      workspaceFolder.name,
      {
        description: l10n.t('Please configure project metadata'),
        contextValue: ErrorItem.contextValue + ContextValue.createIProj,
        command: {
          command: 'vscode-ibmi-projectexplorer.createIProj',
          arguments: [workspaceFolder],
          title: l10n.t('Create iproj.json')
        }
      }
    );
  }

  static createResolveIProjError(workspaceFolder: WorkspaceFolder, errors: string): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      workspaceFolder.name,
      {
        description: l10n.t('Please resolve project metadata'),
        contextValue: ErrorItem.contextValue + ContextValue.resolveIProj,
        tooltip: l10n.t('This project contains the following errors:\n{0}', errors),
        command: {
          command: 'vscode-ibmi-projectexplorer.projectExplorer.iprojShortcut',
          arguments: [{ workspaceFolder: workspaceFolder }],
          title: l10n.t('Open iproj.json')
        }
      }
    );
  }

  static createNoConnectionError(workspaceFolder: WorkspaceFolder, label: string): ErrorItem {
    const isInMerlin = EnvironmentManager.isInMerlin();

    return new ErrorItem(
      workspaceFolder,
      label,
      {
        description: l10n.t('Please connect to an IBM i'),
        contextValue: ErrorItem.contextValue + ContextValue.openConnectionBrowser,
        command: {
          command: isInMerlin ? `ibmideveloper.connectionBrowser.focus` : `connectionBrowser.focus`,
          title: l10n.t('Open Connection Browser')
        }
      }
    );
  }

  static createNoDeployLocationError(workspaceFolder: WorkspaceFolder): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      l10n.t('Source'),
      {
        description: l10n.t('Please configure deploy location'),
        contextValue: ErrorItem.contextValue + ContextValue.setDeployLocation,
        command: {
          command: `vscode-ibmi-projectexplorer.setDeployLocation`,
          title: l10n.t('Set Deploy Location'),
          arguments: [workspaceFolder]
        }
      }
    );
  }

  static createNoEnvironmentVariablesError(workspaceFolder: WorkspaceFolder): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      l10n.t('Variables'),
      {
        description: l10n.t('Please configure environment file'),
        contextValue: ErrorItem.contextValue + ContextValue.createEnv,
        command: {
          command: `vscode-ibmi-projectexplorer.createEnv`,
          arguments: [workspaceFolder],
          title: l10n.t('Create .env')
        }
      }
    );
  }

  static createRetrieveEnvironmentVariablesError(workspaceFolder: WorkspaceFolder): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      l10n.t('Unable to retrieve environment variables')
    );
  }

  static createLibraryNotSpecifiedError(workspaceFolder: WorkspaceFolder, library: string): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      library,
      {
        description: l10n.t('Not specified'),
        contextValue: Library.contextValue
      }
    );
  }

  static createLibraryError(workspaceFolder: WorkspaceFolder, library: string, variable: string | undefined, error: string): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      library,
      {
        description: variable,
        contextValue: Library.contextValue,
        tooltip: error
      }
    );
  }

  static createIncludePathNotSpecifiedError(workspaceFolder: WorkspaceFolder, includePath: string, position: Position | undefined): ErrorItem {
    return new ErrorItem(
      workspaceFolder,
      includePath,
      {
        description: l10n.t('Not specified'),
        contextValue: ContextValue.includePath +
          (position === 'first' ? ContextValue.first : '') +
          (position === 'last' ? ContextValue.last : '') +
          (position === 'middle' ? ContextValue.middle : '')
      }
    );
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}