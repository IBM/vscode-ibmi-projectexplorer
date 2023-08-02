/*
 * (c) Copyright IBM Corp. 2023
 */

import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { Uri, workspace } from 'vscode';

/**
 * Represents a project file watcher.
 */
export class ProjectFileWatcher {
    /**
     * Initialize the project file watcher to listen to changes to all files.
     * 
     * @param projectExplorer The Project Explorer view.
     * @param jobLog The Job Log view.
     */
    static initialize(projectExplorer: ProjectExplorer, jobLog: JobLog) {
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
    const iProject = ProjectManager.getProjectFromUri(uri);

    if (iProject) {
        if ((type === 'create' || type === 'change') && (uri.fsPath.endsWith('iproj.json') || uri.fsPath.endsWith('.ibmi.json') || uri.fsPath.endsWith('.env'))) {
            iProject.setState(undefined);
            iProject.setBuildMap(undefined);
            iProject.setLibraryList(undefined);

            ProjectManager.fire({ type: 'projects' });
        } else if (type === 'delete' && uri.fsPath.endsWith('iproj.json')) {
            const activeProject = ProjectManager.getActiveProject();

            if (activeProject && iProject.workspaceFolder === activeProject.workspaceFolder) {
                await ProjectManager.setActiveProject(undefined);
            }
        } else if (uri.fsPath.endsWith('.logs/joblog.json')) {
            jobLog.refresh();
        }
    }

    projectExplorer.refresh();
}