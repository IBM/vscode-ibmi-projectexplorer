/*
 * (c) Copyright IBM Corp. 2023
 */

import { Validator, ValidatorResult } from "jsonschema";
import * as path from "path";
import { EventEmitter, ExtensionContext, FileType, StatusBarAlignment, StatusBarItem, Uri, WorkspaceFolder, commands, l10n, window, workspace } from "vscode";
import { ConfigurationManager, ConfigurationSection } from "./configurationManager";
import { IProject } from "./iproject";
import { IProjectT } from "./iProjectT";
import Project from "./views/projectExplorer/project";
import { ProjectExplorerTreeItem } from "./views/projectExplorer/projectExplorerTreeItem";

/**
 * Project explorer schema ids:
 * - `iproj` - `schema/iproj.schema.json`
 * - `ibmi` - `schema/ibmi.schema.json`
 */
export enum ProjectExplorerSchemaId {
    iproj = '/iproj',
    ibmi = '/ibmi'
};

/**
 * Project explorer events each serve a different purpose:
 * - `projects` event is fired when there is a change to some project (create, update, or delete)
 * - `activeProject` event is fired when there is a change to the active project
 * - `libraryList` event is fired when there is a change to a project's library list
 * - `buildMap` event is fired when there is a change to a project's `.ibmi.json` file
 * - `deployLocation` event is fired when there is a change to a project's deploy location
 * - `build` event is fired when a build is finished
 * - `compile` event is fired when a compile is finished
 * - `includePaths` event is fired when there is a change to a project's include paths
 */
export type ProjectExplorerEventT =
    'projects' |
    'activeProject' |
    'libraryList' |
    'buildMap' |
    'deployLocation' |
    'build' |
    'compile' |
    'includePaths';
export type ProjectExplorerEventCallback = (iProject?: IProject, uri?: Uri) => void;

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

    /**
     * A uri associated with the event
     */
    uri?: Uri
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
    private static events: { event: ProjectExplorerEventT, callback: ProjectExplorerEventCallback }[] = [];

    /**
     * Initialize the project manager by setting up the JSON schema validator, the 
     * project explorer event emitter, the active project status bar item, and each
     * workspace folder as a project.
     * 
     * @param context An extension context.
     */
    public static async initialize(context: ExtensionContext) {
        this.validator = new Validator();
        const schemaIds = Object.entries(ProjectExplorerSchemaId);
        for await (const [key, value] of schemaIds) {
            const schemaContent = (await workspace.fs.readFile(Uri.file(context.asAbsolutePath(`schema/${key}.schema.json`)))).toString();
            const parsedSchema = JSON.parse(schemaContent);
            parsedSchema.id = value;
            this.validator.addSchema(parsedSchema);
        }

        this.emitter.event(e => {
            this.events.filter(event => event.event === e.type)
                .forEach(event => event.callback(e?.iProject, e?.uri));
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
     * Validate an object against a project explorer schema.
     * @param id The project explorer schema id.
     * @param instance The object to validate.
     * @returns A `ValidatorResult` object.
     */
    public static validateSchema(id: ProjectExplorerSchemaId, instance: any): ValidatorResult {
        const validator = this.getValidator();
        const schema = validator.schemas[id];
        return validator.validate(instance, schema);
    }

    /**
     * Subscribe a function to be called when a given project explorer event is fired.
     * 
     * @param event A project explorer event.
     * @param callback The function to subscribe.
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
            await iProject.load();
            this.loaded[workspaceFolder.index] = iProject;

            const metadataExists = await iProject.projectFileExists('iproj.json');
            if (!metadataExists) {
                this.scanAndAddSubIProjects(workspaceFolder.uri, false);
            }
        }

        if (!this.activeProject && await iProject.projectFileExists('iproj.json')) {
            await this.setActiveProject(workspaceFolder);
        }

        this.fire({ type: 'projects' });
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

        const disableUserLibraryListView = ConfigurationManager.get(ConfigurationSection.disableUserLibraryListView);
        if (disableUserLibraryListView) {
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

    /**
     * Scan the given uri for projects containing an iproj.json file and prompt
     * the user to add them to the workspace.
     *  
     * @param uri The uri of the location to scan.
     * @param notifyOnNoProjectsFound True to notify the user if no projects were found and false otherwise.
     */
    public static async scanAndAddSubIProjects(uri: Uri, notifyOnNoProjectsFound: boolean): Promise<void> {
        // Scan for subprojects
        const projectScanDepth = ConfigurationManager.get(ConfigurationSection.projectScanDepth);
        const scanDepth = projectScanDepth && typeof projectScanDepth === 'number' ? projectScanDepth : 2;
        const subIProjectUris = await this.scanSubIProjects(uri, scanDepth);

        // Prompt user to add subprojects
        const subIProjectUrisToOpen: { readonly uri: Uri; readonly name?: string }[] = [];
        if (subIProjectUris.length === 1) {
            // Single project to open
            const result = await window.showWarningMessage(l10n.t('An iproj.json file was detected in the {0} subdirectory of {1}. Would you like to open this project?', path.parse(subIProjectUris[0].fsPath).name, uri.fsPath), l10n.t('Yes'), l10n.t('No'));
            if (result === l10n.t('Yes')) {
                subIProjectUrisToOpen.push({ uri: subIProjectUris[0], name: path.parse(subIProjectUris[0].fsPath).name });
            }
        } else if (subIProjectUris.length > 1) {
            // Multiple projects to open
            const result = await window.showWarningMessage(l10n.t('Several iproj.json files were detected in the subdirectories of {0}. Would you like to select some of these projects to open?', uri.fsPath), l10n.t('Yes'), l10n.t('No'));
            if (result === l10n.t('Yes')) {
                const items = [];
                for await (const uri of subIProjectUris) {
                    try {
                        const iprojUri = Uri.file(path.join(uri.fsPath, 'iproj.json'));
                        const content = (await workspace.fs.readFile(iprojUri)).toString();
                        const state: IProjectT | undefined = JSON.parse(content);
                        if (state) {
                            items.push({
                                label: path.parse(uri.fsPath).name,
                                description: state.description || "",
                                detail: uri.fsPath,
                                picked: true,
                                uri: uri
                            });
                        }
                    } catch {
                        items.push({
                            label: path.parse(uri.fsPath).name,
                            detail: uri.fsPath,
                            picked: true,
                            uri: uri
                        });
                    }
                }

                const chosenItems = await window.showQuickPick(items, {
                    title: l10n.t('Select the projects you would like to open'),
                    canPickMany: true,
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (chosenItems && chosenItems.length > 0) {
                    const chosenSubIProjectUris = chosenItems.map(item => {
                        return { uri: item.uri, name: path.parse(item.uri.fsPath).name };
                    });

                    subIProjectUrisToOpen.push(...chosenSubIProjectUris);
                }
            }
        } else {
            // No projects to open
            if (notifyOnNoProjectsFound) {
                window.showErrorMessage(l10n.t('No subprojects found under the current workspace folder(s)'));
                return;
            }
        }

        if (subIProjectUrisToOpen.length > 0) {
            workspace.updateWorkspaceFolders(0, workspace.workspaceFolders?.length, ...subIProjectUrisToOpen);
        }
    }

    /**
     * Get the URIs for subdirectories that have an iproj.json file.
     * 
     * @param uri The uri of the location to scan.
     * @param scanDepth The depth of directories to scan.
     * @param currentDepth The current depth of the scan.
     * @returns The URIs for all sub projects.
     */
    public static async scanSubIProjects(uri: Uri, scanDepth: number, currentDepth: number = 0): Promise<Uri[]> {
        currentDepth = currentDepth + 1;

        // Retrieve subprojects
        const subIProjectUris: Uri[] = [];
        const subDirectoryUris = (await workspace.fs.readDirectory(uri))
            .filter((folder) => folder[1] === FileType.Directory)
            .map((folder) => Uri.joinPath(uri, folder[0]));
        for await (const uri of subDirectoryUris) {
            try {
                const iprojUri = Uri.file(path.join(uri.fsPath, 'iproj.json'));
                await workspace.fs.stat(iprojUri);

                // Project found
                subIProjectUris.push(uri);
                continue;
            } catch (e) {
                // Project not found
            }

            if (currentDepth !== scanDepth) {
                subIProjectUris.push(...(await this.scanSubIProjects(uri, scanDepth, currentDepth)));
            }
        }

        return subIProjectUris;
    }
}