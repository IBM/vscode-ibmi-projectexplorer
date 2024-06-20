/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for the Branches heading.
 */
export default class Branches extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branches;

  constructor(public workspaceFolder: WorkspaceFolder, isGitStateInitialized: boolean) {
    super(l10n.t('Branches'), isGitStateInitialized ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);

    this.contextValue = Branches.contextValue;
    this.iconPath = new ThemeIcon(isGitStateInitialized ? `source-control` : `sync~spin`);
    this.tooltip = l10n.t('Branches');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);

    return items;
  }
}