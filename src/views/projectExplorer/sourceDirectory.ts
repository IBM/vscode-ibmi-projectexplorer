/*
 * (c) Copyright IBM Corp. 2023
 */

import { FileType, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n, workspace } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { SourceInfo } from "./source";
import SourceFile from "./sourceFile";

/**
 * Tree item for a source directory
 */
export default class SourceDirectory extends TreeItem implements ProjectExplorerTreeItem {
    static contextValue = ContextValue.sourceDirectory;
    sourceInfo: SourceInfo;

    constructor(public workspaceFolder: WorkspaceFolder, sourceDirectoryInfo: SourceInfo) {
        super(sourceDirectoryInfo.name, TreeItemCollapsibleState.Collapsed);

        this.sourceInfo = sourceDirectoryInfo;
        this.contextValue = SourceDirectory.contextValue;
        this.iconPath = new ThemeIcon(`symbol-folder`);
        this.tooltip = l10n.t('Name: {0}\n', sourceDirectoryInfo.name) +
            l10n.t('Path: {0}', sourceDirectoryInfo.localUri.fsPath);
        this.resourceUri = sourceDirectoryInfo.localUri;
    }

    async getChildren(): Promise<ProjectExplorerTreeItem[]> {
        let items: ProjectExplorerTreeItem[] = [];

        for (const child of this.sourceInfo.children) {
            try {
                const statResult = await workspace.fs.stat(child.localUri);
                if (statResult.type === FileType.Directory) {
                    items.push(new SourceDirectory(this.workspaceFolder, child));
                } else {
                    items.push(new SourceFile(this.workspaceFolder, child));
                }
            } catch (e) { }
        }

        items.sort((a, b) => {
            const fileTypeA = a instanceof SourceDirectory ? 0 : 1;
            const fileTypeB = b instanceof SourceDirectory ? 0 : 1;

            return fileTypeA - fileTypeB || a.label!.toString().localeCompare(b.label!.toString());
        });

        return items;
    }
}