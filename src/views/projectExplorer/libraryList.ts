/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";
import { Position } from "../../iproject";

/**
 * Tree item for the Library List heading.
 */
export default class LibraryList extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.libraryList;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(l10n.t('Library List'), TreeItemCollapsibleState.Collapsed);

    this.contextValue = LibraryList.contextValue;
    this.iconPath = new ThemeIcon(`folder-library`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const unresolvedState = await iProject?.getUnresolvedState();
    const state = await iProject?.getState();
    const libraryList = await iProject?.getLibraryList();
    if (libraryList) {
      for (const library of libraryList) {
        let variable = undefined;

        switch (library.libraryType) {
          case `SYS`:
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.systemLibrary));
            break;

          case `CUR`:
            if (unresolvedState?.curlib?.startsWith('&')) {
              variable = unresolvedState?.curlib;
            }
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.currentLibrary, undefined, variable));
            break;

          case `USR`:
            let libraryType = LibraryType.defaultUserLibrary;
            let position: Position | undefined;

            if (state?.preUsrlibl && state.preUsrlibl.includes(library.libraryInfo.name)) {
              libraryType = LibraryType.preUserLibrary;

              const index = state.preUsrlibl.indexOf(library.libraryInfo.name);
              if (unresolvedState?.preUsrlibl![index].startsWith('&')) {
                variable = unresolvedState?.preUsrlibl![index];
              }

              const listLength = state.preUsrlibl.filter(lib => !lib.startsWith('&')).length;
              if (listLength > 1) {
                position = index === 0 ? 'first' : (index === listLength - 1 ? 'last' : 'middle');
              }

            } else if (state?.postUsrlibl && state.postUsrlibl.includes(library.libraryInfo.name)) {
              libraryType = LibraryType.postUserLibrary;

              const index = state.postUsrlibl.indexOf(library.libraryInfo.name);
              if (unresolvedState?.postUsrlibl![index].startsWith('&')) {
                variable = unresolvedState?.postUsrlibl![index];
              }

              const listLength = state.postUsrlibl.filter(lib => !lib.startsWith('&')).length;
              if (listLength > 1) {
                position = index === 0 ? 'first' : (index === listLength - 1 ? 'last' : 'middle');
              }
            }

            items.push(new Library(this.workspaceFolder, library.libraryInfo, libraryType, position, variable));
            break;
        }
      }
    }

    return items;
  }
}