/*
 * (c) Copyright IBM Corp. 2023
 */

import { Validator } from "jsonschema";
import { EventEmitter, ExtensionContext, StatusBarAlignment, StatusBarItem, Uri, WorkspaceFolder, commands, l10n, window, workspace } from "vscode";
import { ConfigurationManager, ConfigurationSection } from "./configurationManager";
import { IProject } from "./iproject";
import Project from "./views/projectExplorer/project";
import { ProjectExplorerTreeItem } from "./views/projectExplorer/projectExplorerTreeItem";

/**
 * Project explorer events each serve a different purpose:
 * - `projects` event is fired when there is a change to some project (create, update, or delete)
 * - `activeProject` event is fired when there is a change to the active project
 * - `libraryList` event is fired when there is a change to a project's library list
 * - `deployLocation` event is fired when there is a change to a project's deploy location
 * - `build` event is fired when a build is finished
 * - `compile` event is fired when a compile is finished
 */
export type ProjectExplorerEventT = 'projects' | 'activeProject' | 'libraryList' | 'deployLocation' | 'build' | 'compile';
export type ProjectExplorerEventCallback = (iProject?: IProject) => void;
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

/**
 * Represents a manager for IBM i projects.
 */
export class ProjectManager {
    /**
     * An object representing 
     */
    private static loaded: { [index: number]: IProject } = {};

    /**
     * The currently active project.
     */
    private static activeProject: IProject | undefined;

    /**
     * The status bar item for the active project.
     */
    private static activeProjectStatusBarItem: StatusBarItem;

    /**
     * The JSON schema validator used for validating a project against the `iproj.json`
     * schema.
     */
    private static validator: Validator;

    /**
     * An event emitter used to create and manage project explorer events for others
     * to subscribe to.
     */
    private static emitter: EventEmitter<ProjectExplorerEvent> = new EventEmitter();

    /**
     * An array of events that store an association between an event and a subscriber's
     * call back function.
     */
    private static events: { event: ProjectExplorerEventT, callback: ProjectExplorerEventCallback}[] = [];

    /**
     * Initialize the project manager by setting up the JSON schema validator, the 
     * project explorer event emitter, the active project status bar item, and each
     * workspace folder as a project.
     * 
     * @param context An extension context.
     */
    public static async initialize(context: ExtensionContext) {
        this.validator = new Validator();
        const iprojJsonContent = (await workspace.fs.readFile(Uri.file(context.asAbsolutePath('schema/iproj.schema.json')))).toString();
        const iprojJsonSchema = JSON.parse(iprojJsonContent);
        iprojJsonSchema.id = '/iproj';
        this.validator.addSchema(iprojJsonSchema);

        this.emitter.event(e => {
            this.events.filter(event => event.event === e.type)
                .forEach(event => event.callback(e.iProject));
        });

        this.activeProjectStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 9);
        context.subscriptions.push(this.activeProjectStatusBarItem);
        await this.setActiveProject(undefined);
        this.activeProjectStatusBarItem.show();

        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            for await (const folder of workspaceFolders) {
                await this.load(folder);
            }
        }
    }

    /**
     * Get the JSON schema validator used for validating a project against the `iproj.json`
     * schema.
     * 
     * @returns The JSON schema validator.
     */
    public static getValidator(): Validator {
        return this.validator;
    }

    /**
     * Subscribe a function to be called when a given project explorer event is fired.
     * 
     * @param event 
     * @param func 
     */
    public static onEvent(event: ProjectExplorerEventT, callback: ProjectExplorerEventCallback) {
        this.events.push({ event, callback });
    }

    /**
     * Notify all listeners subscribed to a project explorer event.
     * 
     * @param event A project explorer event.
     */
    public static fire(event: ProjectExplorerEvent) {
        this.emitter?.fire(event);
    }

    /**
     * Load a workspace folder as a project.
     * 
     * @param workspaceFolder A workspace folder.
     */
    public static async load(workspaceFolder: WorkspaceFolder) {
        const iProject = new IProject(workspaceFolder);
        if (!this.loaded[workspaceFolder.index]) {
            this.loaded[workspaceFolder.index] = iProject;
        }

        if (!this.activeProject && await iProject.projectFileExists('iproj.json')) {
            await this.setActiveProject(workspaceFolder);
        }

        ProjectManager.fire({ type: 'projects' });
    }

    /**
     * Get the project associated with a workspace folder.
     * 
     * @param workspaceFolder A workspace folder.
     * @returns A project or `undefined`.
     */
    public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
        return this.loaded[workspaceFolder.index];
    }

    /**
     * Clear all loaded projects.
     */
    public static clear() {
        this.loaded = {};
    }

    /**
     * Get the currently active project.
     * 
     * @returns The active project.
     */
    public static getActiveProject(): IProject | undefined {
        return this.activeProject;
    }

    /**
     * Set the active project given a workspace folder. *Note* that setting the active 
     * project to be `undefined` will remove the current active project.
     * 
     * @param workspaceFolder A workspace folder or `undefined`.
     */
    public static async setActiveProject(workspaceFolder: WorkspaceFolder | undefined) {
        // Check if active project is already set to given workspace folder
        if (workspaceFolder === this.activeProject?.workspaceFolder) {
            return;
        }

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
            this.activeProjectStatusBarItem.text = '$(root-folder) ' + l10n.t('Project: {0}', '$(circle-slash)');
            this.activeProjectStatusBarItem.tooltip = l10n.t('Please open a local workspace folder');
            this.activeProjectStatusBarItem.command = {
                command: 'workbench.action.addRootFolder',
                title: l10n.t('Add folder to workspace')
            };
        }

        const disableUserLibraryList = ConfigurationManager.get(ConfigurationSection.disableUserLibraryList);
        if (disableUserLibraryList) {
            await commands.executeCommand('setContext', 'code-for-ibmi:libraryListDisabled', this.activeProject ? true : false);
        }
        await commands.executeCommand('setContext', 'vscode-ibmi-projectexplorer:hasActiveProject', this.activeProject ? true : false);
        this.fire({ type: 'activeProject', iProject: this.activeProject });
    }

    /**
     * Get the status bar item for the active project.
     * 
     * @returns The active project status bar item.
     */
    public static getActiveProjectStatusBarItem(): StatusBarItem {
        return this.activeProjectStatusBarItem;
    }

    /**
     * Get all projects.
     * 
     * @returns An array of projects
     */
    public static getProjects(): IProject[] {
        let projects = [];
        for (const index in this.loaded) {
            projects.push(this.loaded[index]);
        }

        return projects;
    }

    /**
     * Get the project with a given name.
     * 
     * @param name The name of a project.
     * @returns A project or `undefined`.
     */
    public static getProjectFromName(name: string): IProject | undefined {
        for (const index in this.loaded) {
            const iProject = this.loaded[index];

            if (iProject.getName() === name) {
                return iProject;
            }
        }
    }

    /**
     * Get the project associated with the currently active text editor.
     * 
     * @returns A project or `undefined`.
     */
    public static getProjectFromActiveTextEditor(): IProject | undefined {
        let activeFileUri = window.activeTextEditor?.document.uri;
        activeFileUri = activeFileUri?.scheme === 'file' ? activeFileUri : undefined;

        if (activeFileUri) {
            return this.getProjectFromUri(activeFileUri);
        }
    }

    /**
     * Get the project associated with a uri.
     * 
     * @param uri The uri of a resource in the workspace.
     * @returns A project or `undefined`.
     */
    public static getProjectFromUri(uri: Uri): IProject | undefined {
        const workspaceFolder = workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            return this.get(workspaceFolder);
        }
    }

    /**
     * Get the project associated with a tree item in the Project Explorer view.
     * 
     * @param element A tree item in the Project Explorer view.
     * @returns A project or `undefined`.
     */
    public static getProjectFromTreeItem(element: ProjectExplorerTreeItem): IProject | undefined {
        if (element.workspaceFolder) {
            return this.get(element.workspaceFolder);
        }
    }

    /**
     * Push custom tree items to the Project Explorer view using a call back function that will be invoked
     * when expanding project tree items when connected.
     * 
     * @param callback A function that returns the tree items to be rendered given the project.
     */
    public static pushExtensibleChildren(callback: (iProject: IProject) => Promise<ProjectExplorerTreeItem[]>) {
        Project.callBack.push(callback);
    }
}