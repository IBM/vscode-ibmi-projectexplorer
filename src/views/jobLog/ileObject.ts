/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ObjectInfo } from "../../jobLog";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import Message from "./message";
import { ContextValue } from "../../ibmiProjectExplorer";
import Command from "./command";

/**
 * Tree item for an ILE object.
 */
export default class IleObject extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.ileObject;
  objectInfo: ObjectInfo;
  showSeverityLevels: number;

  constructor(public workspaceFolder: WorkspaceFolder, objectInfo: ObjectInfo, severityLevel?: number) {
    super(objectInfo.object, TreeItemCollapsibleState.Collapsed);

    this.objectInfo = objectInfo;
    this.contextValue = IleObject.contextValue;
    this.showSeverityLevels = severityLevel ? severityLevel : 0;
    this.description = objectInfo.source;
    this.iconPath = objectInfo.failed ? new ThemeIcon('error', new ThemeColor('joblog.failed.true')) :
      new ThemeIcon('pass', new ThemeColor('joblog.failed.false'));
  }


  getChildren(): ProjectExplorerTreeItem[] {
    let items: ProjectExplorerTreeItem[] = [];

    items.push(new Command(this.workspaceFolder, this.objectInfo.cmd));

    if (this.objectInfo.msgs) {
      items.push(...this.objectInfo.msgs?.filter(msg => msg.severity >= this.showSeverityLevels).map(
        msg => new Message(this.workspaceFolder, msg)
      ));
    }

    return items;
  }
}