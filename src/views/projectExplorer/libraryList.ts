/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";

export type Position = 'first' | 'last' | 'middle';

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
            items.push(new Library(this.workspaceFolder, library.libraryInfo, LibraryType.currentLibrary, variable));
            break;

          case `USR`:
            let libraryType = LibraryType.defaultUserLibrary;
            let position: Position | undefined;

            if (state?.preUsrlibl && state.preUsrlibl.includes(library.libraryInfo.name)) {
              const listLength = state.preUsrlibl.length;
              libraryType = LibraryType.preUserLibrary;

              const index = state.preUsrlibl.indexOf(library.libraryInfo.name);
              if (unresolvedState?.preUsrlibl![index].startsWith('&')) {
                variable = unresolvedState?.preUsrlibl![index];
              }

              if (listLength > 1) {
                position = index === 0 ? 'first' : (index === listLength - 1 ? 'last' : 'middle');
              }
              
            } else if (state?.postUsrlibl && state.postUsrlibl.includes(library.libraryInfo.name)) {
              const listLength = state.postUsrlibl.length;
              libraryType = LibraryType.postUserLibrary;

              const index = state.postUsrlibl.indexOf(library.libraryInfo.name);
              if (unresolvedState?.postUsrlibl![index].startsWith('&')) {
                variable = unresolvedState?.postUsrlibl![index];
              }

              if (listLength > 1) {
                position = index === 0 ? 'first' : (index === listLength - 1 ? 'last' : 'middle');
              }
            }

            items.push(new Library(this.workspaceFolder, library.libraryInfo, libraryType, variable, position));
            break;
        }
      }
    }

    return items;
  }
}