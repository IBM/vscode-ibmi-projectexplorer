/*
 * (c) Copyright IBM Corp. 2023
 */

import { ExtensionContext, QuickPickItem, StatusBarAlignment, StatusBarItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { IProject } from "./iproject";
import { ProjectExplorerTreeItem } from "./views/projectExplorer/projectExplorerTreeItem";
import Project from "./views/projectExplorer/project";

export class ProjectManager {
    private static loaded: { [index: number]: IProject } = {};
    private static activeProject: IProject | undefined;
    private static activeProjectStatusBarItem: StatusBarItem;

    public static load(workspaceFolder: WorkspaceFolder) {
        if (!this.loaded[workspaceFolder.index]) {
            const iProject = new IProject(workspaceFolder);
            this.loaded[workspaceFolder.index] = iProject;

            if (!this.activeProject) {
                this.setActiveProject(workspaceFolder);
            }
        }
    }

    public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
        return this.loaded[workspaceFolder.index];
    }

    public static getActiveProject(): IProject | undefined {
        return this.activeProject;
    }

    public static getActiveProjectStatusBarItem(): StatusBarItem {
        return this.activeProjectStatusBarItem;
    }

    public static clear() {
        this.loaded = {};
    }

    public static initialize(context: ExtensionContext) {
        this.activeProjectStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 9);
        context.subscriptions.push(this.activeProjectStatusBarItem);
        this.setActiveProject(undefined);

        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            workspaceFolders.map(folder => {
                this.load(folder);
            });
        }
    }

    public static setActiveProject(workspaceFolder: WorkspaceFolder | undefined) {
        if (workspaceFolder) {
            this.activeProject = this.loaded[workspaceFolder.index];
            this.activeProjectStatusBarItem.text = `$(root-folder) Project: ${this.activeProject.workspaceFolder.name}`;
            this.activeProjectStatusBarItem.tooltip = `Active project: ${this.activeProject.workspaceFolder}`;
            this.activeProjectStatusBarItem.command = {
                command: `vscode-ibmi-projectexplorer.setActiveProject`,
                title: `Set Active Project`
            };
        } else {
            this.activeProject = undefined;
            this.activeProjectStatusBarItem.text = `$(root-folder) Project: $(circle-slash)`;
            this.activeProjectStatusBarItem.tooltip = `Please open a local workspace folder`;
            this.activeProjectStatusBarItem.command = {
                command: 'workbench.action.files.openFolder',
                title: 'Open folder'
            };
        }
    }

    public static getProjects(): IProject[] {
        let projects = [];
        for (const index in this.loaded) {
            projects.push(this.loaded[index]);
        }

        return projects;
    }

    public static getProjectFromName(name: string): IProject | undefined {
        for (const index in this.loaded) {
            const iProject = this.loaded[index];

            if (iProject.getName() === name) {
                return iProject;
            }
        }
    }

    public static getProjectFromActiveTextEditor(): IProject | undefined {
        let activeFileUri = window.activeTextEditor?.document.uri;
        activeFileUri = activeFileUri?.scheme === 'file' ? activeFileUri : undefined;

        if (activeFileUri) {
            return this.getProjectFromUri(activeFileUri);
        }
    }

    public static getProjectFromUri(uri: Uri): IProject | undefined {
        const workspaceFolder = workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            return this.get(workspaceFolder);
        }
    }

    public static getProjectFromTreeItem(element: ProjectExplorerTreeItem) {
        if (element.workspaceFolder) {
            return this.get(element.workspaceFolder);
        }
    }

    public static pushExtensibleChildren(callback: (iProject: IProject) => Promise<ProjectExplorerTreeItem[]>) {
        Project.callBack.push(callback);
    }
}