/*
 * (c) Copyright IBM Corp. 2023
 */

import { Uri, workspace } from 'vscode';
import JobLog from "./views/jobLog";
import ProjectExplorer from "./views/projectExplorer";
import { ProjectManager } from './projectManager';
import { ProjectExplorerTreeItem } from './views/projectExplorer/projectExplorerTreeItem';
import Source from './views/projectExplorer/source';

/**
 * Represents a project file watcher.
 */
export namespace ProjectFileWatcher {
    /**
     * Initialize the project file watcher to listen to changes to all files.
     * 
     * @param projectExplorer The Project Explorer view.
     * @param jobLog The Job Log view.
     */
    export function initialize(projectExplorer: ProjectExplorer, jobLog: JobLog) {
        const projectWatcher = workspace.createFileSystemWatcher(`**/**`);

        projectWatcher.onDidCreate(async (uri) => {
            await updateOnFileChange(uri, projectExplorer, jobLog, 'create');
        });

        projectWatcher.onDidChange(async (uri) => {
            await updateOnFileChange(uri, projectExplorer, jobLog, 'change');
        });

        projectWatcher.onDidDelete(async (uri) => {
            await updateOnFileChange(uri, projectExplorer, jobLog, 'delete');
        });
    }

    /**
     * Update a project's state, build map, library list, and job logs depending on
     * if a project file changes.
     * 
     * @param uri The resource that was changed.
     * @param projectExplorer The Project Explorer view.
     * @param jobLog The Job Log view.
     * @param type The type of file change event.
     */
    async function updateOnFileChange(uri: Uri, projectExplorer: ProjectExplorer, jobLog: JobLog, type: 'create' | 'change' | 'delete') {
        let elementToRefresh: ProjectExplorerTreeItem | undefined;
        const iProject = ProjectManager.getProjectFromUri(uri);

        if (iProject) {
            if (uri.fsPath.endsWith('iproj.json') && (type === 'create' || type === 'change')) {
                iProject.setState(undefined);
                iProject.setBuildMap(undefined);
                iProject.setLibraryList(undefined);

                ProjectManager.fire({ type: 'projects' });
            } else if (uri.path.endsWith('iproj.json') && (type === 'delete')) {
                const activeProject = ProjectManager.getActiveProject();

                if (activeProject && iProject.workspaceFolder === activeProject.workspaceFolder) {
                    await ProjectManager.setActiveProject(undefined);
                }
            } else if (uri.fsPath.endsWith('.ibmi.json')) {
                iProject.setBuildMap(undefined);
            } else if (uri.fsPath.endsWith('.env')) {
                iProject.setState(undefined);
                iProject.setLibraryList(undefined);
            } else {
                const projectTreeItem = projectExplorer.getProjectTreeItem(iProject);

                if (projectTreeItem && projectTreeItem.children.length > 0 && projectTreeItem.children[0] instanceof Source) {
                    elementToRefresh = projectTreeItem.children[0];
                }

                if (uri.path.endsWith('.logs/joblog.json')) {
                    jobLog.refresh();
                }
            }
        }

        projectExplorer.refresh(elementToRefresh);
    }
}