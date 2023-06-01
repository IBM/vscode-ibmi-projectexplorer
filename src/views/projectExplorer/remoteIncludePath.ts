/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, WorkspaceFolder } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import IFSDirectory from "./ifsDirectory";
import * as path from "path";
import { Position } from "./includePaths";

/**
 * Tree item for a remote include path
 */
export default class RemoteIncludePath extends IFSDirectory {
  static contextValue = ContextValue.includePath;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, position: Position, custom?: { label?: string}) {
    super(workspaceFolder,
      {
        type: 'directory',
        name: path.posix.basename(includePath),
        path: includePath
      },
      {
        label: custom?.label || includePath
      }
    );

    this.contextValue = RemoteIncludePath.contextValue;
    this.contextValue +=
      position === 'first' ? ContextValue.first : '' +
      position === 'last' ? ContextValue.last : '' +
      position === 'middle' ? ContextValue.middle : '';

    this.iconPath = new ThemeIcon(`link`);
  }
}