/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import Library from "./library";
import { ContextValue } from "../../projectExplorerApi";
import { getInstance } from "../../ibmi";

/**
 * Tree item for the Object Libraries heading
 */
export default class ObjectLibraries extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.objectLibraries;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super("Object Libraries", TreeItemCollapsibleState.Collapsed);
    this.iconPath = new ThemeIcon(`symbol-class`, new ThemeColor(`icon.foreground`));
    this.contextValue = ObjectLibraries.contextValue;
    this.tooltip = "Object Libraries - Work with the set of libraries defined in the curlib, objlib, preUsrlibl, and postUsrlibl entries of the iproj.json"
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const objLibs = await iProject?.getObjectLibraries();
    if (objLibs) {
      for (const objLib of objLibs) {
        const ibmi = getInstance();
        const libraryInfo = await ibmi?.getContent().getObjectList({ library: 'QSYS', object: objLib, types: ['*LIB'] }, 'name');
        if (libraryInfo) {
          const libTreeItem = new Library(this.workspaceFolder, libraryInfo[0]);
          items.push(libTreeItem);
        }
      }
    }

    return items;
  }
}