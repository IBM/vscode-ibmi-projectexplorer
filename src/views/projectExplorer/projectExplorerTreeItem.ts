/*
 * (c) Copyright IBM Corp. 2023
 */

import * as vscode from "vscode";

export abstract class ProjectExplorerTreeItem extends vscode.TreeItem {

    abstract workspaceFolder: vscode.WorkspaceFolder | undefined;

    /**
     * Get the children of this tree item.
     *
     * @return Children of this tree item.
     */
    abstract getChildren(): ProjectExplorerTreeItem[] | Promise<ProjectExplorerTreeItem[]>;
}