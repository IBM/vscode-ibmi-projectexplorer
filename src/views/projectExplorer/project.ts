/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";
import Variables from "./variables";
import ObjectLibraries from "./objectlibraries";
import { ContextValue } from "../../projectExplorerApi";
import { IProject } from "../../iproject";
import IncludePaths from "./includePaths";
import Source from "./source";

/**
 * Tree item for a project
 */
export default class Project extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;
  static callBack: ((iProject: IProject) => Promise<ProjectExplorerTreeItem[]>)[] = [];
  private extensibleChildren: ProjectExplorerTreeItem[] = [];

  constructor(public workspaceFolder: WorkspaceFolder, description?: string) {
    super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);

    this.resourceUri = workspaceFolder.uri;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.contextValue = Project.contextValue + ContextValue.inactive;
    this.description = description;
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);

    const ibmi = getInstance();
    const deploymentDirs = ibmi?.getStorage().getDeployment()!;
    const localDir = this.resourceUri?.fsPath!;
    const remoteDir = deploymentDirs[localDir];

    // First load the IFS browser stuff
    if (remoteDir) {
      items.push(new Source(this.workspaceFolder, remoteDir));
    } else {
      items.push(new ErrorItem(this.workspaceFolder, `Source`, {
        description: `Please configure remote directory`,
        command: {
          command: `code-for-ibmi.setDeployLocation`,
          title: `Set deploy location`,
          arguments: [{}, this.resourceUri]
        }
      }));
    }

    // Then load the variable specific stuff
    await iProject?.read();

    const hasEnv = await iProject?.projectFileExists('.env');
    if (hasEnv) {
      let unresolvedVariableCount = 0;

      const possibleVariables = iProject?.getVariables();
      const actualValues = await iProject?.getEnv();
      if (possibleVariables && actualValues) {
        unresolvedVariableCount = possibleVariables.filter(varName => !actualValues[varName]).length;
      }

      items.push(new Variables(this.workspaceFolder, unresolvedVariableCount));

    } else {
      items.push(new ErrorItem(this.workspaceFolder, `Variables`, {
        description: `Please configure environment file`,
        command: {
          command: `vscode-ibmi-projectmode.createEnv`,
          arguments: [this.workspaceFolder],
          title: `Create project .env`
        }
      }));
    }

    items.push(new ObjectLibraries(this.workspaceFolder));
    items.push(new IncludePaths(this.workspaceFolder));

    for await (const extensibleChildren of Project.callBack) {
      let children: ProjectExplorerTreeItem[] = [];
      try {
        children = await extensibleChildren(iProject!);
      } catch (error) { }

      this.extensibleChildren.push(...children);
    }
    items.push(...this.extensibleChildren);

    return items;
  }

  getExtensibleChildren() {
    return this.extensibleChildren;
  }

  setActive() {
    this.contextValue = Project.contextValue + ContextValue.active;
    this.iconPath = new ThemeIcon(`root-folder`);
  }
}