/*
 * (c) Copyright IBM Corp. 2024
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { SourceInfo } from "./source";

/**
 * Tree item for a source file
 */
export default class DeletedFile extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.sourceFile;
  sourceInfo: SourceInfo;

  constructor(public workspaceFolder: WorkspaceFolder, sourceFileInfo: SourceInfo) {
    super(sourceFileInfo.name, TreeItemCollapsibleState.None);

    this.sourceInfo = sourceFileInfo;
    this.contextValue = DeletedFile.contextValue;
    this.iconPath = new ThemeIcon(`trash`);
    this.tooltip = l10n.t('Delete upon deploy\n') + l10n.t('Name: {0}\n', sourceFileInfo.name) +
      l10n.t('Path: {0}', sourceFileInfo.localUri.fsPath);
    this.resourceUri = sourceFileInfo.localUri;
  }

  getChildren(): ProjectExplorerTreeItem[] {
    return [];
  }
}