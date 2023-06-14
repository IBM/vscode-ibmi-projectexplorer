/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, workspace } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import LocalIncludePath from "./localIncludePath";
import RemoteIncludePath from "./remoteIncludePath";
import * as path from "path";
import ErrorItem from "./errorItem";
import { Position } from "../../iproject";

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
    const unresolvedState = await iProject?.getUnresolvedState();
    const state = await iProject?.getState();
    if (unresolvedState && unresolvedState.includePath) {
      for await (let [index, includePath] of unresolvedState.includePath.entries()) {
        let position: Position | undefined;
        const includePathLength = unresolvedState.includePath.length;
        if (includePathLength > 1) {
          position = index === 0 ? 'first' : (index === includePathLength - 1 ? 'last' : 'middle');
        }

        let variable = undefined;
        if (includePath.startsWith('&')) {
          variable = includePath;
          includePath = state!.includePath![index];
        }

        if (includePath.startsWith('&')) {
          items.push(new ErrorItem(
            this.workspaceFolder,
            includePath,
            {
              description: l10n.t('Not specified'),
              contextValue: ContextValue.includePath +
                (position === 'first' ? ContextValue.first : '') +
                (position === 'last' ? ContextValue.last : '') +
                (position === 'middle' ? ContextValue.middle : '')
            }));
          continue;
        }

        let includePathUri = Uri.file(includePath);
        try {
          const statResult = await workspace.fs.stat(includePathUri);

          // Absolute local include path
          items.push(new LocalIncludePath(this.workspaceFolder, includePath, includePathUri, position, variable));
        } catch (e) {
          includePathUri = Uri.joinPath(this.workspaceFolder.uri, includePath);

          try {
            const statResult = await workspace.fs.stat(includePathUri);

            // Relative local include path
            items.push(new LocalIncludePath(this.workspaceFolder, includePath, includePathUri, position, variable));
          } catch (e) {
            const deployDir = iProject!.getDeployDir();
            if (includePath.startsWith('/') || !deployDir) {
              // Absolute remote include path
              items.push(new RemoteIncludePath(this.workspaceFolder, includePath, position, variable));
            } else {
              // Relative remote include path
              const absoluteIncludePath = path.posix.join(deployDir, includePath);
              items.push(new RemoteIncludePath(this.workspaceFolder, absoluteIncludePath, position, variable, { label: includePath }));
            }
          }
        }
      }
    }

    return items;
  }
}