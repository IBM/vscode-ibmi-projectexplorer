/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";

/**
 * Tree item for the Library List heading
 */
export default class LibraryList extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.libraryList;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(`Library List`, TreeItemCollapsibleState.Collapsed);

    this.contextValue = LibraryList.contextValue;
    this.iconPath = new ThemeIcon(`folder-library`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const libraryList = await iProject?.getLibraryList();
    if (libraryList) {
      let lib, type;
      for (const line of libraryList) {
        lib = line.substring(0, 10).trim();
        type = line.substring(12);

        switch (type) {
          case `SYS`:
            items.push(new Library(this.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.systemLibrary));
            break;

          case `CUR`:
            items.push(new Library(this.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.currentLibrary));
            break;

          case `USR`:
            items.push(new Library(this.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.userLibrary));
            break;
        }
      }
    }

    return items;
  }
}