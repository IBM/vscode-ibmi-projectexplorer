/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../projectExplorerApi";
import { SourceInfo } from "./source";

/**
 * Tree item for a source file
 */
export default class SourceFile extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.ifsFile;
  sourceInfo: SourceInfo;

  constructor(public workspaceFolder: WorkspaceFolder, sourceInfo: SourceInfo) {
    super(sourceInfo.name, TreeItemCollapsibleState.None);

    this.sourceInfo = sourceInfo;
    this.contextValue = SourceFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.tooltip = l10n.t('Name: {0}\n', sourceInfo.name) +
      l10n.t('Path: {0}\n', sourceInfo.uri.fsPath);
    this.resourceUri = sourceInfo.uri;
    this.command = {
      command: `vscode.open`,
      title: l10n.t('Open File'),
      arguments: [this.resourceUri]
    };
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}