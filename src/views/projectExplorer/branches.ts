/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { Repository } from "../../import/git";
import Branch from "./branch";
import { ProjectManager } from "../../projectManager";

/**
 * Tree item for the Branches heading.
 */
export default class Branches extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branches;
  repository: Repository | undefined;

  constructor(public workspaceFolder: WorkspaceFolder, isGitStateInitialized: boolean, repository?: Repository) {
    super(l10n.t('Branches'), isGitStateInitialized ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);

    this.repository = repository;
    this.resourceUri = Uri.parse(`branches:`, true);
    this.contextValue = Branches.contextValue;
    this.iconPath = new ThemeIcon(isGitStateInitialized ? `repo` : `loading~spin`);
    this.tooltip = l10n.t('Branches');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    if (this.repository) {
      const branches = await this.repository.getBranches({});
      for (const branch of branches) {
        const iProject = ProjectManager.get(this.workspaceFolder);
        const library = await iProject!.getBranchLibraryName(branch.name!);
        items.push(new Branch(this.workspaceFolder, this.repository, branch, library));
      }
    }

    return items;
  }
}