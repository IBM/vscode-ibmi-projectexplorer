/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { CommandInfo, parseDateTime } from "../../jobLog";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import Message from "./message";
import { ContextValue } from "../../projectExplorerApi";

/**
 * Tree item for a command
 */
export default class Command extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.command;
  commandInfo: CommandInfo;

  constructor(public workspaceFolder: WorkspaceFolder, commandInfo: CommandInfo) {
    super(commandInfo.cmd, TreeItemCollapsibleState.Collapsed);

    this.commandInfo = commandInfo;
    let highSeverity = false;
    commandInfo.msgs?.forEach(msg => {
      if (msg.severity >= 30) {
        highSeverity = true;
        return;
      }
    });
    this.iconPath = highSeverity ? new ThemeIcon(`code`, new ThemeColor('errorForeground')) : new ThemeIcon(`code`);
    this.contextValue = Command.contextValue;
    this.description = parseDateTime(commandInfo.cmd_time).toLocaleString();
  }

  getChildren(): ProjectExplorerTreeItem[] {
    let items: ProjectExplorerTreeItem[] = [];

    const commandInfo = this.commandInfo;
    if (commandInfo.msgs) {
      items.push(...commandInfo.msgs?.map(
        msgs => new Message(this.workspaceFolder, msgs)
      ));
    }

    return items;
  }
}