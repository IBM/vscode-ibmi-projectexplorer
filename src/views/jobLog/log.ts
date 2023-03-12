import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { JobLogInfo } from "../../jobLog";

export default class Log extends TreeItem {
  static contextValue = `log`;
  constructor(public jobLogInfo: JobLogInfo) {
    super(jobLogInfo.createdTime.toLocaleString(), TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon(`archive`);
    this.contextValue = Log.contextValue;
  }
}