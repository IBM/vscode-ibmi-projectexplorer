/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { IProjectT } from "../../iProjectT";
import { getInstance } from "../../ibmi";
import { ContextValue } from "../../ibmiProjectExplorer";
import { IProject } from "../../iproject";
import { ProjectManager } from "../../projectManager";
import ErrorItem from "./errorItem";
import IncludePaths from "./includePaths";
import LibraryList from "./libraryList";
import ObjectLibraries from "./objectlibraries";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import Source from "./source";
import Variables from "./variables";
import Branches from "./branches";
import { GitManager } from "../../gitManager";

/**
 * Tree item for a project.
 */
export default class Project extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;
  static callBack: ((iProject: IProject) => Promise<ProjectExplorerTreeItem[]>)[] = [];
  private readonly extensibleChildren: ProjectExplorerTreeItem[] = [];
  public readonly children: ProjectExplorerTreeItem[] = [];

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
    this.children.splice(0, this.children.length);
    this.extensibleChildren.splice(0, this.extensibleChildren.length);

    const ibmi = getInstance();
    const iProject = ProjectManager.get(this.workspaceFolder);

    if (ibmi && ibmi.getConnection()) {
      const deploymentParameters = await iProject?.getDeploymentParameters();

      if (deploymentParameters && deploymentParameters.remotePath) {
        this.children.push(new Source(this.workspaceFolder, deploymentParameters));
      } else {
        this.children.push(ErrorItem.createNoDeployLocationError(this.workspaceFolder));
      }
    } else {
      this.children.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Source')));
    }

    const hasEnv = await iProject?.projectFileExists('.env');
    if (hasEnv) {
      let unresolvedVariableCount = 0;

      const possibleVariables = await iProject?.getVariables();
      const actualValues = await iProject?.getEnv();
      if (possibleVariables && actualValues) {
        unresolvedVariableCount = possibleVariables.filter(varName => !actualValues[varName]).length;
      }

      this.children.push(new Variables(this.workspaceFolder, unresolvedVariableCount));

    } else {
      this.children.push(ErrorItem.createNoEnvironmentVariablesError(this.workspaceFolder));
    }

    if (ibmi && ibmi.getConnection()) {
      this.children.push(new LibraryList(this.workspaceFolder));
      this.children.push(new ObjectLibraries(this.workspaceFolder));
    } else {
      this.children.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Library List')));
      this.children.push(ErrorItem.createNoConnectionError(this.workspaceFolder, l10n.t('Object Libraries')));
    }

    if (GitManager.isGitApiInitialized()) {
      const repository = iProject?.getGitRepository();
      if (repository) {
        this.children.push(new Branches(this.workspaceFolder, true, repository));
      } else {
        this.children.push(ErrorItem.initializeNoGitRepositoryError(this.workspaceFolder));
      }
    } else {
      this.children.push(new Branches(this.workspaceFolder, false));
    }

    this.children.push(new IncludePaths(this.workspaceFolder));

    for await (const extensibleChildren of Project.callBack) {
      let children: ProjectExplorerTreeItem[] = [];
      try {
        children = await extensibleChildren(iProject!);
      } catch (error) { }

      this.extensibleChildren.push(...children);
    }

    return [...this.children, ...this.extensibleChildren];
  }

  getExtensibleChildren() {
    return this.extensibleChildren;
  }

  setActive() {
    this.contextValue = Project.contextValue + ContextValue.active;
    this.iconPath = new ThemeIcon(`root-folder`, new ThemeColor('projectExplorer.activeProject'));
  }
}