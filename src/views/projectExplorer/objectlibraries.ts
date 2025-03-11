/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n, window } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";
import { ContextValue } from "../../ibmiProjectExplorer";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";

/**
 * Tree item for the Object Libraries heading.
 */
export default class ObjectLibraries extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.objectLibraries;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(l10n.t('Object Libraries'), TreeItemCollapsibleState.Collapsed);
    this.iconPath = new ThemeIcon(`symbol-class`, new ThemeColor(`icon.foreground`));
    this.contextValue = ObjectLibraries.contextValue;
    this.tooltip = l10n.t('Work with the set of libraries defined in the curlib, objlib, preUsrlibl, and postUsrlibl entries of the iproj.json');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const iProject = ProjectManager.get(this.workspaceFolder);
    const objLibs = await iProject?.getObjectLibraries();
    const values = await iProject!.getEnv();
    if (objLibs) {
      for (let [library, libraryTypes] of objLibs) {
        let variable = undefined;
        if (library.startsWith('&')) {
          variable = library;
          library = iProject!.resolveVariable(library, values);
        }

        if (!library || // empty strings end up returning all libraries - so flag as invalid
          library.startsWith('&')) {
          items.push(ErrorItem.createLibraryNotSpecifiedError(this.workspaceFolder, library));
          continue;
        }

        try {
          if (ibmi && ibmi.getConnection()) {
            const connection = ibmi?.getConnection();
            const libraryInfo = await connection?.getContent().getObjectList({ library: 'QSYS', object: library, types: ['*LIB'] }, 'name');
            if (libraryInfo) {
              const libTreeItem = new Library(this.workspaceFolder, libraryInfo[0], LibraryType.library, undefined, variable, libraryTypes);
              items.push(libTreeItem);
            }
          } else {
            window.showErrorMessage(l10n.t('Please connect to an IBM i'));
          }
        } catch (error: any) {
          items.push(ErrorItem.createLibraryError(this.workspaceFolder, library, variable, error));
          continue;
        }
      }
    }

    return items;
  }
}