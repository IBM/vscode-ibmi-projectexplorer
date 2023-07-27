/*
 * (c) Copyright IBM Corp. 2023
 */

import { Uri, workspace } from 'vscode';
import JobLog from "./views/jobLog";
import ProjectExplorer from "./views/projectExplorer";
import { ProjectManager } from './projectManager';
import { ProjectExplorerTreeItem } from './views/projectExplorer/projectExplorerTreeItem';
import Source from './views/projectExplorer/source';

export namespace ProjectFileWatcher {
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

    async function updateOnFileChange(uri: Uri, projectExplorer: ProjectExplorer, jobLog: JobLog, type: 'create' | 'change' | 'delete') {
        let elementToRefresh: ProjectExplorerTreeItem | undefined;
        const iProject = ProjectManager.getProjectFromUri(uri);

        if (iProject) {
            if (uri.path.endsWith('iproj.json') && (type === 'create' || type === 'change')) {
                iProject.setState(undefined);
                iProject.setBuildMap(undefined);
                iProject.setLibraryList(undefined);

                ProjectManager.fire({ type: 'projects' });
            } else if (uri.path.endsWith('iproj.json') && (type === 'delete')) {
                const activeProject = ProjectManager.getActiveProject();

                if (activeProject && iProject.workspaceFolder === activeProject.workspaceFolder) {
                    await ProjectManager.setActiveProject(undefined);
                }
            } else {
                const projectTreeItem = projectExplorer.getProjectTreeItem(iProject);

                if (projectTreeItem && projectTreeItem.children[0] instanceof Source) {
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