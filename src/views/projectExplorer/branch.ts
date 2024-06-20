/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n, window } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { Ref, Repository } from "../../import/git";
import { getInstance } from "../../extensions/ibmi";
import Library, { LibraryType } from "./library";
import ObjectFile from "./objectFile";
import ErrorItem from "./errorItem";

/**
 * Tree item for a branch tree item.
 */
export default class Branch extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.branch;
  repository: Repository;
  branch: Ref;
  library: string;

  constructor(public workspaceFolder: WorkspaceFolder, repository: Repository, branch: Ref, library: string) {
    super(branch.name!, TreeItemCollapsibleState.Collapsed);

    this.repository = repository;
    this.branch = branch;
    this.library = library;
    const isCurrentBranch = repository.state.HEAD?.name === branch.name
      && repository.state.HEAD?.commit === branch.commit;
    this.contextValue = Branch.contextValue +
      (isCurrentBranch ? ContextValue.active : '');
    this.description = library;
    this.iconPath = new ThemeIcon(`source-control`, isCurrentBranch ? new ThemeColor('projectExplorer.currentBranch') : undefined);
    this.tooltip = l10n.t('Branch: {0}\n', branch.name!) +
      l10n.t('Library: {0}', library);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    if (ibmi && ibmi.getConnection()) {
      const libraryExists = await ibmi.getContent().checkObject({ library: `QSYS`, name: this.library, type: `*LIB` })
      if (libraryExists) {
        const objectFiles = await ibmi?.getContent().getObjectList({ library: this.library, }, 'name');
        if (objectFiles) {
          for (const objectFile of objectFiles) {
            if (objectFile.type === "*LIB") {
              items.push(new Library(this.workspaceFolder, objectFile, LibraryType.library));
            } else {
              items.push(new ObjectFile(this.workspaceFolder, objectFile, `/QSYS.LIB/${this.library}.LIB`));
            }
          }
        }
      } else {
        items.push(ErrorItem.libraryDoesNotExistError(this.workspaceFolder, this.library));
      }
    } else {
      window.showErrorMessage(l10n.t('Please connect to an IBM i'));
    }

    return items;
  }
}