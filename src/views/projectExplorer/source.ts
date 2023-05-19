/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, WorkspaceFolder, l10n } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import IFSDirectory from "./ifsDirectory";
import * as path from "path";

export default class Source extends IFSDirectory {
  static contextValue = ContextValue.source;

  constructor(public workspaceFolder: WorkspaceFolder, remoteDir: string) {
    super(workspaceFolder,
      {
        type: 'directory',
        name: path.posix.basename(remoteDir),
        path: remoteDir
      },
      {
        label: l10n.t('Source'),
        description: remoteDir
      }
    );

    this.contextValue = Source.contextValue;
    this.iconPath = new ThemeIcon(`server-environment`);
  }
}