/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, workspace } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import LocalIncludePath from "./localIncludePath";
import RemoteIncludePath from "./remoteIncludePath";
import { getInstance } from "../../ibmi";
import * as path from "path";

export type Position = 'first' | 'last' | 'middle';

/**
 * Tree item for Include Paths heading
 */
export default class IncludePaths extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.includePaths;

  constructor(public workspaceFolder: WorkspaceFolder) {
    super(l10n.t('Include Paths'), TreeItemCollapsibleState.Collapsed);

    this.contextValue = IncludePaths.contextValue;
    this.iconPath = new ThemeIcon(`list-flat`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const state = await iProject?.getState();
    if (state && state.includePath) {

      const includePathLength = state.includePath.length;

      for await (const [index, includePath] of state.includePath.entries()) {

        const position : Position = 
          index === 0 ? 'first' :
          (index === includePathLength - 1 ? 'last' : 'middle');

        let includePathUri = Uri.file(includePath);
        try {
          const statResult = await workspace.fs.stat(includePathUri);

          // Absolute local include path
          items.push(new LocalIncludePath(this.workspaceFolder, includePath, includePathUri, position));
        } catch (e) {
          includePathUri = Uri.joinPath(this.workspaceFolder.uri, includePath);

          try {
            const statResult = await workspace.fs.stat(includePathUri);

            // Relative local include path
            items.push(new LocalIncludePath(this.workspaceFolder, includePath, includePathUri, position));
          } catch (e) {
            if (includePath.startsWith('/')) {
              // Absolute remote include path
              items.push(new RemoteIncludePath(this.workspaceFolder, includePath, position));
            } else {
              // Relative remote include path
              const remoteDir = await iProject!.getRemoteDir();
              const absoluteIncludePath = path.posix.join(remoteDir, includePath);
              items.push(new RemoteIncludePath(this.workspaceFolder, absoluteIncludePath, position, { label: includePath }));
            }
          }
        }
      }
    }

    return items;
  }
}