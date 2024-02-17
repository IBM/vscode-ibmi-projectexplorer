/*
 * (c) Copyright IBM Corp. 2024
 */

import { ThemeIcon, WorkspaceFolder, l10n } from "vscode";
import { ContextValue } from "../../ibmiProjectExplorer";
import { SourceInfo } from "./source";
import SourceFile from "./sourceFile";

/**
 * Tree item for a deleted source file
 */
export default class DeletedFile extends SourceFile {
  static contextValue = ContextValue.sourceFile;

  constructor(public workspaceFolder: WorkspaceFolder, sourceFileInfo: SourceInfo) {
    super(workspaceFolder, sourceFileInfo);

    this.iconPath = new ThemeIcon(`trash`);
    this.tooltip = l10n.t('Delete Upon Deploy\n') + this.tooltip;
    this.command = undefined;
    this.contextValue = DeletedFile.contextValue + ContextValue.deleted;
  }
}