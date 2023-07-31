/*
 * (c) Copyright IBM Corp. 2023
 */

import { TreeItem, WorkspaceFolder } from "vscode";

/**
 * Represents a tree item in the Project Explorer
 */
export interface ProjectExplorerTreeItem extends TreeItem {

    workspaceFolder: WorkspaceFolder | undefined;

    /**
     * Get the children of this tree item.
     *
     * @return Children of this tree item.
     */
    getChildren(): ProjectExplorerTreeItem[] | Promise<ProjectExplorerTreeItem[]>;
}