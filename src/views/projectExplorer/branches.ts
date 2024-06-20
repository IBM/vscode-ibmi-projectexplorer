/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { Repository } from "../../import/git";
import Branch from "./branch";

/**
 * Tree item for the Branches heading.
 */
export default class Branches extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branches;
  repository: Repository | undefined;

  constructor(public workspaceFolder: WorkspaceFolder, isGitStateInitialized: boolean, repository?: Repository) {
    super(l10n.t('Branches'), isGitStateInitialized ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);

    this.repository = repository;
    this.contextValue = Branches.contextValue;
    this.iconPath = new ThemeIcon(isGitStateInitialized ? `repo` : `sync~spin`);
    this.tooltip = l10n.t('Branches');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    if (this.repository) {
      const branches = await this.repository.getBranches({ remote: true });
      for (const branch of branches) {
        items.push(new Branch(this.workspaceFolder, this.repository, branch));
      }
    }

    return items;
  }
}