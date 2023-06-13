/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n, window } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import Library, { LibraryType } from "./library";
import { ContextValue } from "../../projectExplorerApi";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";

/**
 * Tree item for the Object Libraries heading
 */
export default class ObjectLibraries extends ProjectExplorerTreeItem {
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
      for (let objLib of objLibs) {
        let variable = undefined;
        if (objLib.startsWith('&')) {
          variable = objLib;
          objLib = iProject!.resolveVariable(objLib, values);
        }

        if (objLib.startsWith('&')) {
          items.push(new ErrorItem(
            this.workspaceFolder,
            objLib,
            {
              description: l10n.t('Not specified'),
              contextValue: Library.contextValue
            }));
          continue;
        }

        try {
          const libraryInfo = await ibmi?.getContent().getObjectList({ library: 'QSYS', object: objLib, types: ['*LIB'] }, 'name');
          if (libraryInfo) {
            const libTreeItem = new Library(this.workspaceFolder, libraryInfo[0], LibraryType.library, variable);
            items.push(libTreeItem);
          }
        } catch (error: any) {
          items.push(new ErrorItem(
            this.workspaceFolder,
            objLib,
            {
              description: variable,
              contextValue: Library.contextValue,
              tooltip: error
            }));
          continue;
        }
      }
    }

    return items;
  }
}