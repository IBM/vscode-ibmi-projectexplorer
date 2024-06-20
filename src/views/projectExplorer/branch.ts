/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { Ref, Repository } from "../../import/git";
import { str } from "crc-32/crc32c";

/**
 * Tree item for a branch tree item.
 */
export default class Branch extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branch;
  repository: Repository;
  branch: Ref;
  library: string;

  constructor(public workspaceFolder: WorkspaceFolder, repository: Repository, branch: Ref) {
    super(branch.name!, TreeItemCollapsibleState.Collapsed);

    this.repository = repository;
    this.branch = branch;
    this.library = getBranchLibraryName(branch.name!);
    const isCurrentBranch = repository.state.HEAD?.name === branch.name
      && repository.state.HEAD?.commit === branch.commit;
    this.contextValue = Branch.contextValue +
      (isCurrentBranch ? ContextValue.active : '');
    this.description = this.library;
    this.iconPath = new ThemeIcon(`source-control`, isCurrentBranch ? new ThemeColor('projectExplorer.currentBranch') : undefined);
    this.tooltip = l10n.t('Branch: {0}\n', branch.name!) +
      l10n.t('Library: {0}', this.library);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    return items;
  }
}

export function getBranchLibraryName(currentBranch: string) {
  return `VS${(str(currentBranch, 0) >>> 0).toString(16).toUpperCase()}`;
}