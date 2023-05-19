/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";
import { getInstance } from "../../ibmi";

/**
 * Tree item for the Library List heading
 */
export default class LibraryList extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.libraryList;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(l10n.t('Library List'), TreeItemCollapsibleState.Collapsed);

    this.contextValue = LibraryList.contextValue;
    this.iconPath = new ThemeIcon(`folder-library`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const iProject = ProjectManager.get(this.workspaceFolder);
    const libraryList = await iProject?.getLibraryList();
    if (libraryList) {
      for (const library of libraryList) {
        switch (library.libraryType) {
          case `SYS`:
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.systemLibrary));
            break;

          case `CUR`:
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.currentLibrary));
            break;

          case `USR`:
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.userLibrary));
            break;
        }
      }
    }

    return items;
  }
}