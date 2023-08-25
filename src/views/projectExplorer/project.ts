/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";
import Variables from "./variables";
import ObjectLibraries from "./objectlibraries";
import { ContextValue } from "../../ibmiProjectExplorer";
import { IProject } from "../../iproject";
import IncludePaths from "./includePaths";
import Source from "./source";
import LibraryList from "./libraryList";
import { IProjectT } from "../../iProjectT";

/**
 * Tree item for a project.
 */
export default class Project extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;
  static callBack: ((iProject: IProject) => Promise<ProjectExplorerTreeItem[]>)[] = [];
  private extensibleChildren: ProjectExplorerTreeItem[] = [];
  public children: ProjectExplorerTreeItem[] = [];

  constructor(public workspaceFolder: WorkspaceFolder, state?: IProjectT) {
    super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.contextValue = Project.contextValue + ContextValue.inactive;
    this.description = state?.description;
    this.tooltip = l10n.t('Name: {0}\n', workspaceFolder.name) +
      l10n.t('Path: {0}\n', workspaceFolder.uri.fsPath) +
      (state?.description ? l10n.t('Description: {0}\n', state.description) : ``) +
      (state?.version ? l10n.t('Version: {0}\n', state.version) : ``) +
      (state?.repository ? l10n.t('Repository: {0}\n', state.repository) : ``) +
      (state?.license ? l10n.t('License: {0}\n', state.license) : ``) +
      (state?.buildCommand ? l10n.t('Build Command: {0}\n', state.buildCommand) : ``) +
      (state?.compileCommand ? l10n.t('Compile Command: {0}', state.compileCommand) : ``);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const iProject = ProjectManager.get(this.workspaceFolder);

    if (ibmi && ibmi.getConnection()) {
      const deploymentParameters = await iProject?.getDeploymentParameters();

      if (deploymentParameters && deploymentParameters.remotePath) {
        items.push(new Source(this.workspaceFolder, deploymentParameters));
      } else {
        items.push(ErrorItem.createNoDeployLocationError(this.workspaceFolder));
      }
    } else {
      items.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Source')));
    }

    const hasEnv = await iProject?.projectFileExists('.env');
    if (hasEnv) {
      let unresolvedVariableCount = 0;

      const possibleVariables = await iProject?.getVariables();
      const actualValues = await iProject?.getEnv();
      if (possibleVariables && actualValues) {
        unresolvedVariableCount = possibleVariables.filter(varName => !actualValues[varName]).length;
      }

      items.push(new Variables(this.workspaceFolder, unresolvedVariableCount));

    } else {
      items.push(ErrorItem.createNoEnvironmentVariablesError(this.workspaceFolder));
    }

    if (ibmi && ibmi.getConnection()) {
      items.push(new LibraryList(this.workspaceFolder));
      items.push(new ObjectLibraries(this.workspaceFolder));
    } else {
      items.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Library List')));
      items.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Object Libraries')));
    }

    items.push(new IncludePaths(this.workspaceFolder));

    for await (const extensibleChildren of Project.callBack) {
      let children: ProjectExplorerTreeItem[] = [];
      try {
        children = await extensibleChildren(iProject!);
      } catch (error) { }

      this.extensibleChildren.push(...children);
    }
    items.push(...this.extensibleChildren);

    this.children = items;
    return items;
  }

  getExtensibleChildren() {
    return this.extensibleChildren;
  }

  setActive() {
    this.contextValue = Project.contextValue + ContextValue.active;
    this.iconPath = new ThemeIcon(`root-folder`, new ThemeColor('projectExplorer.activeProject'));
  }
}