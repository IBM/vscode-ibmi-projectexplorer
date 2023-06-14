/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, WorkspaceFolder } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import IFSDirectory from "./ifsDirectory";
import * as path from "path";
import { Position } from "../../iproject";

/**
 * Tree item for a remote include path
 */
export default class RemoteIncludePath extends IFSDirectory {
  static contextValue = ContextValue.includePath;
  variable?: string;

  constructor(public workspaceFolder: WorkspaceFolder, includePath: string, position?: Position, variable?: string, custom?: { label?: string }) {
    super(workspaceFolder,
      {
        type: 'directory',
        name: path.posix.basename(includePath),
        path: includePath
      },
      {
        label: (custom && custom.label) ? custom.label : includePath,
        description: variable ? variable : undefined,
      }
    );
    this.variable = variable;

    this.contextValue = RemoteIncludePath.contextValue + ContextValue.remote +
      (position === 'first' ? ContextValue.first : '') +
      (position === 'last' ? ContextValue.last : '') +
      (position === 'middle' ? ContextValue.middle : '') +
      (!variable ? ContextValue.configurable : '');
    this.iconPath = new ThemeIcon(`link`);
  }
}