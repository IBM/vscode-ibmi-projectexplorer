/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { JobLogInfo } from "../../jobLog";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import IleObject from "./ileObject";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for a log.
 */
export default class Log extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.log;
  jobLogInfo: JobLogInfo;

  constructor(public workspaceFolder: WorkspaceFolder, jobLogInfo: JobLogInfo, isLocal: boolean = false) {
    super(jobLogInfo.createdTime.toLocaleString(), TreeItemCollapsibleState.Collapsed);

    this.jobLogInfo = jobLogInfo;
    this.iconPath = new ThemeIcon('archive', isLocal ? new ThemeColor('joblog.local') : undefined);
    this.contextValue = Log.contextValue +
      (this.jobLogInfo.showFailedJobs ? ContextValue.showAllJobsAction : ContextValue.showFailedJobsAction);
    this.resourceUri = Uri.parse(`log:${this.jobLogInfo.severityLevel}`, true);
    this.tooltip = jobLogInfo.createdTime.toLocaleString();
  }

  getChildren(): ProjectExplorerTreeItem[] {
    let items: ProjectExplorerTreeItem[] = [];

    if (this.jobLogInfo.showFailedJobs) {
      items.push(...this.jobLogInfo.objects?.filter(object => object.failed).map(
        object => new IleObject(this.workspaceFolder, object, this.jobLogInfo.severityLevel)
      ));
    } else {
      items.push(...this.jobLogInfo.objects?.map(
        object => new IleObject(this.workspaceFolder, object, this.jobLogInfo.severityLevel)
      ));
    }
    return items;
  }
}