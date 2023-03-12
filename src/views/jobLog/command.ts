import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { CommandInfo, parseDateTime } from "../../jobLog";

export default class Command extends TreeItem {
  static contextValue = `command`;
  constructor(public commandInfo: CommandInfo) {
    super(commandInfo.cmd, TreeItemCollapsibleState.Collapsed);

    let highSeverity = false;
    commandInfo.msgs?.forEach(msg => {
      if(msg.severity >= 30) {
        highSeverity = true;
        return;
      }
    });

    this.iconPath = highSeverity ? new ThemeIcon(`code`, new ThemeColor('errorForeground')) : new ThemeIcon(`code`) ;

    this.contextValue = Command.contextValue;
    this.description = parseDateTime(commandInfo.cmd_time).toLocaleString();
  }
}