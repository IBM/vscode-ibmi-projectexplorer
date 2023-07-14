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

  constructor(public workspaceFolder: WorkspaceFolder, sourceFileInfo: SourceInfo) {
    super(sourceFileInfo.name, TreeItemCollapsibleState.None);

    this.sourceInfo = sourceFileInfo;
    this.contextValue = SourceFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.tooltip = l10n.t('Name: {0}\n', sourceFileInfo.name) +
      l10n.t('Path: {0}\n', sourceFileInfo.uri.fsPath);
    this.resourceUri = sourceFileInfo.uri;
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