/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { JobLogInfo } from "../../jobLog";

export default class Log extends TreeItem {
  static contextValue = `log`;

  constructor(public jobLogInfo: JobLogInfo, isLocal: boolean = false) {
    super(jobLogInfo.createdTime.toLocaleString(), TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon('archive',
      isLocal ? new ThemeColor('joblog.local') : undefined);
    this.contextValue = Log.contextValue;
  }
}