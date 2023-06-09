/*
 * (c) Copyright IBM Corp. 2023
 */

import { EventEmitter, ExtensionContext, l10n, StatusBarAlignment, StatusBarItem, Uri, window, workspace, WorkspaceFolder, commands } from "vscode";
import { IProject } from "./iproject";
import { ProjectExplorerTreeItem } from "./views/projectExplorer/projectExplorerTreeItem";
import Project from "./views/projectExplorer/project";

/**
 * * `projects` event is fired when there is a change to some project (create, update, or delete)
 * * `activeProject` event is fired when there is a change to the active project
 * * `libraryList` event is fired when there is a change to a project's library list
 * * `deployLocation` event is fired when there is a change to a project's deploy location
 */
export type ProjectExplorerEventT = 'projects' | 'activeProject' | 'libraryList' | 'deployLocation';

/**
 * Project explorer event
 */
export interface ProjectExplorerEvent {
    /**
     * Type of event
     */
    type: ProjectExplorerEventT;

    /**
     * Project associated with event
     */
    iProject?: IProject
}

export class ProjectManager {
    private static loaded: { [index: number]: IProject } = {};
    private static activeProject: IProject | undefined;
    private static activeProjectStatusBarItem: StatusBarItem;
    private static emitter: EventEmitter<ProjectExplorerEvent> = new EventEmitter();
    private static events: { event: ProjectExplorerEventT, func: Function }[] = [];

    public static initialize(context: ExtensionContext) {
        this.emitter.event(e => {
            this.events.filter(event => event.event === e.type)
                .forEach(event => event.func(e.iProject));
        });

        this.activeProjectStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 9);
        context.subscriptions.push(this.activeProjectStatusBarItem);
        this.setActiveProject(undefined);
        this.activeProjectStatusBarItem.show();

        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            workspaceFolders.map(folder => {
                this.load(folder);
            });
        }
    }

    public static onEvent(event: ProjectExplorerEventT, func: Function) {
        this.events.push({ event, func });
    }

    public static fire(event: ProjectExplorerEvent) {
        this.emitter?.fire(event);
    }

    public static load(workspaceFolder: WorkspaceFolder) {
        if (!this.loaded[workspaceFolder.index]) {
            const iProject = new IProject(workspaceFolder);
            this.loaded[workspaceFolder.index] = iProject;

            if (!this.activeProject) {
                this.setActiveProject(workspaceFolder);
            }
        }

        ProjectManager.fire({ type: 'projects' });
    }

    public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
        return this.loaded[workspaceFolder.index];
    }

    public static clear() {
        this.loaded = {};
    }

    public static getActiveProject(): IProject | undefined {
        return this.activeProject;
    }

    public static setActiveProject(workspaceFolder: WorkspaceFolder | undefined) {
        if (workspaceFolder) {
            this.activeProject = this.loaded[workspaceFolder.index];
            this.activeProjectStatusBarItem.text = '$(root-folder) ' + l10n.t('Project: {0}', this.activeProject.workspaceFolder.name);
            this.activeProjectStatusBarItem.tooltip = l10n.t('Active project: {0}', this.activeProject.workspaceFolder.name);
            this.activeProjectStatusBarItem.command = {
                command: `vscode-ibmi-projectexplorer.projectExplorer.setActiveProject`,
                title: l10n.t('Set Active Project')
            };
        } else {
            this.activeProject = undefined;
            this.activeProjectStatusBarItem.text = '$(root-folder) ' + l10n.t('Project:') + ' $(circle-slash)';
            this.activeProjectStatusBarItem.tooltip = l10n.t('Please open a local workspace folder');
            this.activeProjectStatusBarItem.command = {
                command: 'workbench.action.addRootFolder',
                title: l10n.t('Add folder to workspace')
            };
        }

        commands.executeCommand('setContext', 'vscode-ibmi-projectexplorer.hasActiveProject', this.activeProject ? true : false);
        this.fire({ type: 'activeProject', iProject: this.activeProject });
    }

    public static getActiveProjectStatusBarItem(): StatusBarItem {
        return this.activeProjectStatusBarItem;
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