/*
 * (c) Copyright IBM Corp. 2023
 */

import { TreeItem, WorkspaceFolder } from "vscode";

/**
 * Represents a tree item in the Project Explorer view.
 */
export interface ProjectExplorerTreeItem extends TreeItem {

    /**
     * The workspace folder associated with the tree item.
     */
    workspaceFolder: WorkspaceFolder | undefined;

    /**
     * Get the children of this tree item.
     *
     * @return Children of this tree item.
     */
    getChildren(): ProjectExplorerTreeItem[] | Promise<ProjectExplorerTreeItem[]>;
}