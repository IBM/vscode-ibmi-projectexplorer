/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { ProjectManager } from "../../projectManager";
import Log from "./log";
import { IProjectT } from "../../iProjectT";
import ErrorItem from "./errorItem";

/**
 * Tree item for a project.
 */
export default class Project extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;

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
      (state?.license ? l10n.t('License: {0}', state.license) : ``);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);

    const jobLogs = iProject?.getJobLogs().slice().reverse();
    const jobLogExists = await iProject?.projectFileExists('joblog.json');

    if (jobLogs) {
      items.push(...jobLogs?.map((jobLog, index) => {
        if (index === 0 && jobLogExists) {
          // Local job log
          return new Log(this.workspaceFolder, jobLogs[0], true);
        } else {
          // Old job logs in memory
          return new Log(this.workspaceFolder, jobLog);
        }
      }
      ));
    } else {
      items.push(ErrorItem.createNoJobLogError(this.workspaceFolder));
    }

    return items;
  }
}