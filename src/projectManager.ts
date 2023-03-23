/*
 * (c) Copyright IBM Corp. 2023
 */

import { QuickPickItem, window, workspace, WorkspaceFolder } from "vscode";
import { IProject } from "./iproject";

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

    public static async selectProject() {
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
}