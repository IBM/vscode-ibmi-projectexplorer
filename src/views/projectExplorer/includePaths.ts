/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import IncludePath from "./includePath";

export default class IncludePaths extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePaths;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(`Include Paths`, TreeItemCollapsibleState.Collapsed);

    this.contextValue = IncludePaths.contextValue;
    this.iconPath = new ThemeIcon(`list-flat`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const state = await iProject?.getState();
    if (state && state.includePath) {
      state.includePath.forEach(includePath => {
        items.push(new IncludePath(this.workspaceFolder, includePath));
      });
    }

    return items;
  }
}