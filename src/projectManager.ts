/*
 * (c) Copyright IBM Corp. 2023
 */

import { QuickPickItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { IProject } from "./iproject";
import { ProjectExplorerTreeItem } from "./views/projectExplorer/projectTreeItem";
import Project from "./views/projectExplorer/project";

export class ProjectManager {
    private static loaded: { [index: number]: IProject } = {};

    public static load(workspaceFolder: WorkspaceFolder) {
        if (!this.loaded[workspaceFolder.index]) {
            this.loaded[workspaceFolder.index] = new IProject(workspaceFolder);
        }
    }

    public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
        return this.loaded[workspaceFolder.index];
    }

    public static clear() {
        this.loaded = {};
    }

    public static loadProjects() {
        const workspaceFolders = workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
            workspaceFolders.map(folder => {
                ProjectManager.load(folder);
            });
        }
    }

    public static async selectProject(): Promise<IProject | undefined> {
        switch (Object.keys(this.loaded).length) {
            case 0:
                window.showErrorMessage('Please open a local workspace folder.');
                break;
            case 1:
                return this.loaded[0];
            default:
                const projectItems: QuickPickItem[] = [];
                for (const index in this.loaded) {
                    const project = this.loaded[index];

                    const state = await project.getState();
                    if (state) {
                        projectItems.push({ label: project.getName(), description: state.description });
                    }
                }

                const selectedProject = await window.showQuickPick(projectItems, {
                    placeHolder: 'Select a project'
                });

                if (selectedProject) {
                    for (const index in this.loaded) {
                        const project = this.loaded[index];

                        if (project.getName() === selectedProject.label) {
                            return project;
                        }
                    }
                }
        }

        return;
    }

    public static getProjects(): IProject[] {
        let projects = [];
        for (const index in this.loaded) {
            projects.push(this.loaded[index]);
        }

        return projects;
    }

    public static getProjectFromActiveTextEditor(): IProject | undefined {
        let activeFileUri = window.activeTextEditor?.document.uri;
        activeFileUri = activeFileUri?.scheme === 'file' ? activeFileUri : undefined;

        if (activeFileUri) {
            return this.getProjectFromUri(activeFileUri);
        }
    }

    public static getProjectFromUri(uri: Uri): IProject | undefined {
        for (const index in this.loaded) {
            const project = this.loaded[index];

            if (uri.fsPath.startsWith(project.workspaceFolder.uri.fsPath)) {
                return project;
            }
        }
    }

    public static getProjectFromTreeItem(element: ProjectExplorerTreeItem) {
        if (element.workspaceFolder) {
            return ProjectManager.get(element.workspaceFolder);

        }
    }

    public static pushExtensibleChildren(callback: (iProject: IProject) => Promise<ProjectExplorerTreeItem[]>) {
        Project.callBack.push(callback);
    }
}