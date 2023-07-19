/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
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
import LibraryList from "./libraryList";
import * as path from "path";

/**
 * Tree item for a project
 */
export default class Project extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;
  static callBack: ((iProject: IProject) => Promise<ProjectExplorerTreeItem[]>)[] = [];
  private extensibleChildren: ProjectExplorerTreeItem[] = [];

  constructor(public workspaceFolder: WorkspaceFolder, description?: string) {
    super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.contextValue = Project.contextValue + ContextValue.inactive;
    this.description = description;
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    if (ibmi && ibmi.getConnection()) {
      const iProject = ProjectManager.get(this.workspaceFolder);

      const deployDir = iProject!.getDeployDir();
      if (deployDir) {
        items.push(new Source(this.workspaceFolder, deployDir));
      } else {
        const defaultDeployLocation = iProject?.getDefaultDeployDir();

        items.push(new ErrorItem(this.workspaceFolder, l10n.t('Source'), {
          description: l10n.t('Please configure deploy location'),
          contextValue: ErrorItem.contextValue + ContextValue.setDeployLocation,
          command: {
            command: `code-for-ibmi.setDeployLocation`,
            title: l10n.t('Set Deploy Location'),
            arguments: [undefined, this.workspaceFolder, defaultDeployLocation]
          }
        }));
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
        items.push(new ErrorItem(this.workspaceFolder, l10n.t('Variables'), {
          description: l10n.t('Please configure environment file'),
          contextValue: ErrorItem.contextValue + ContextValue.createEnv,
          command: {
            command: `vscode-ibmi-projectexplorer.createEnv`,
            arguments: [this.workspaceFolder],
            title: l10n.t('Create .env')
          }
        }));
      }

      items.push(new LibraryList(this.workspaceFolder));
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
    } else {
      items.push(new ErrorItem(undefined, l10n.t('Please connect to an IBM i'), {
        contextValue: ErrorItem.contextValue + ContextValue.openConnectionBrowser,
        command: {
          command: `connectionBrowser.focus`,
          title: l10n.t('Open Connection Browser')
        }
      }));
    }

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