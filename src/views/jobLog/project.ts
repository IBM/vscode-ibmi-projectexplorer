/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectManager } from "../../projectManager";
import Log from "./log";
import ErrorItem from "../projectExplorer/errorItem";

/**
 * Tree item for a project
 */
export default class Project extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.project;

  constructor(public workspaceFolder: WorkspaceFolder, description?: string) {
    super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.contextValue = Project.contextValue + ContextValue.inactive;
    this.description = description;
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);

    await iProject?.readJobLog();
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
      items.push(new ErrorItem(
        this.workspaceFolder, l10n.t('No job log found'))
      );
    }

    return items;
  }
}