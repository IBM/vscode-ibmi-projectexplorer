/*
 * (c) Copyright IBM Corp. 2023
 */

import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { Ref } from "../../import/git";
import { str } from "crc-32/crc32c";

/**
 * Tree item for a branch tree item.
 */
export default class Branch extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branch;
  branch: Ref;
  library: string;

  constructor(public workspaceFolder: WorkspaceFolder, branch: Ref) {
    super(branch.name!, TreeItemCollapsibleState.Collapsed);

    this.branch = branch;
    this.library = getBranchLibraryName(branch.name!);
    this.contextValue = Branch.contextValue;
    this.description = this.library;
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