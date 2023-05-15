/*
 * (c) Copyright IBM Corp. 2023
 */

import { WorkspaceFolder } from "vscode";
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
        label: 'Source',
        description: remoteDir
      }
    );

    this.contextValue = Source.contextValue;
  }
}