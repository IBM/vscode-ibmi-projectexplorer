/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectTreeItem } from "./projectTreeItem";
import { ProjectManager } from "../../projectManager";
import Library from "./library";
import { ContextValue } from "../../typings";

export default class ObjectLibrary extends ProjectTreeItem {
  static contextValue = ContextValue.objectLibrary;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super("Object Libraries", TreeItemCollapsibleState.Collapsed);

    this.resourceUri = workspaceFolder.uri;
    this.iconPath = new ThemeIcon(`root-folder`);
    this.contextValue = this.contextValue;
    this.tooltip = "Object Libraries - Work with the set of libraries defined in the curlib, objlib, preUsrlibl, and postUsrlibl entries of the iproj.json"
  }

  async getChildren(): Promise<ProjectTreeItem[]> {
    let items: ProjectTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const state = await iProject?.getState();
    if (state) {
      const objLibs = new Set<string>();
      if (state.curlib) {
        objLibs.add(state.curlib.toUpperCase());
      }
      if (state.preUsrlibl) {
        for (const lib of state.preUsrlibl) {
          objLibs.add(lib.toUpperCase());
        }
      }
      if (state.postUsrlibl) {
        for (const lib of state.postUsrlibl) {
          objLibs.add(lib.toUpperCase());
        }
      }

      state.objlib ? objLibs.add(state.objlib.toUpperCase()) : null;

      for (const lib of objLibs) {
        const libTreeItem = new Library(this.workspaceFolder, `/QSYS.LIB/${lib}`, lib);
        items.push(libTreeItem);
      }
    }

    return items;
  }
}