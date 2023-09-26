/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { CommandInfo } from "../../jobLog";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import Message from "./message";
import { ContextValue } from "../../ibmiProjectExplorer";
import CommandRepresentation from "./commandRepresentation";

/**
 * Tree item for a command.
 */
export default class Command extends TreeItem implements ProjectExplorerTreeItem {
    static contextValue = ContextValue.command;
  commandInfo: CommandInfo;
  showSeverityLevels: number;

  constructor(public workspaceFolder: WorkspaceFolder, commandInfo: CommandInfo, severityLevel?: number) {
    super(commandInfo.object, TreeItemCollapsibleState.Collapsed);

    this.commandInfo = commandInfo;
    this.contextValue = Command.contextValue;
    this.showSeverityLevels = severityLevel ? severityLevel : 0;

    this.description = commandInfo.source;
    this.iconPath = commandInfo.failed ? new ThemeIcon('error', new ThemeColor('joblog.failed.true')) :
      new ThemeIcon('pass', new ThemeColor('joblog.failed.false'));
  }


  getChildren(): ProjectExplorerTreeItem[] {
    let items: ProjectExplorerTreeItem[] = [];

    const commandInfo = this.commandInfo;
    items.push(new CommandRepresentation(this.workspaceFolder, commandInfo.cmd));

    if (commandInfo.msgs) {
      items.push(...commandInfo.msgs?.filter(
        msg => msg.severity >= this.showSeverityLevels
      ).map(
        msg => new Message(this.workspaceFolder, msg)
      ));
    }
    
    return items;
  }
}