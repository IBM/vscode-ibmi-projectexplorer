/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { JobLogInfo } from "../../jobLog";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import Command from "./command";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for a log.
 */
export default class Log extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.log;
  jobLogInfo: JobLogInfo;
  onlyShowFailedCommands : boolean;
  showSeverityLevels: number;

  constructor(public workspaceFolder: WorkspaceFolder, jobLogInfo: JobLogInfo, isLocal: boolean = false) {
    super(jobLogInfo.createdTime.toLocaleString(), TreeItemCollapsibleState.Collapsed);

    this.jobLogInfo = jobLogInfo;
    this.iconPath = new ThemeIcon('archive', isLocal ? new ThemeColor('joblog.local') : undefined);
    this.contextValue = Log.contextValue;
    this.onlyShowFailedCommands = false;
    this.showSeverityLevels = 0;
  }

  toggleShowFailed(): void {
    this.onlyShowFailedCommands = this.onlyShowFailedCommands === false ? true : false;
  }

  setSeverityLevel(severityLevel: number): void {
    this.showSeverityLevels = severityLevel;
  }

  getChildren(): ProjectExplorerTreeItem[] {
    let items: ProjectExplorerTreeItem[] = [];

    const jobLogInfo = this.jobLogInfo;

    if (this.onlyShowFailedCommands) {
      items.push(...jobLogInfo.commands?.filter(
        command => command.failed
      ).map(
        command => new Command(this.workspaceFolder, command, this.showSeverityLevels)
      ));
    }else{
      items.push(...jobLogInfo.commands?.map(
        command => new Command(this.workspaceFolder, command, this.showSeverityLevels)
      ));
    }
    return items;
  }
}