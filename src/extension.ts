/*
 * (c) Copyright IBM Corp. 2023
 */

import { loadBase, getInstance } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { ExtensionContext, Uri, l10n, window, workspace } from 'vscode';
import { ProjectExplorerApi } from './projectExplorerApi';
import { DeploymentPath } from '@halcyontech/vscode-ibmi-types/api/Storage';

export function activate(context: ExtensionContext): ProjectExplorerApi {
	console.log(l10n.t('Congratulations, your extension "vscode-ibmi-projectexplorer" is now active!'));

	loadBase();
	ProjectManager.initialize(context);

	const ibmi = getInstance();
	const projectExplorer = new ProjectExplorer(context);
	let currentDeploymentStorage: DeploymentPath;
	ibmi?.onEvent(`connected`, () => {
		projectExplorer.refresh();

		currentDeploymentStorage = ibmi?.getStorage().getDeployment();
	});
	ibmi?.onEvent(`deployLocation`, () => {
		projectExplorer.refresh();

		const newDeploymentStorage = ibmi?.getStorage().getDeployment();
		for (const [workspaceFolderPath, deployLocation] of Object.entries(newDeploymentStorage)) {
			if (!currentDeploymentStorage || currentDeploymentStorage[workspaceFolderPath] !== deployLocation) {
				const iProject = ProjectManager.getProjectFromUri(Uri.file(workspaceFolderPath));
				ProjectManager.fire({ name: 'deployLocation', iProject: iProject });
			}
		}

		currentDeploymentStorage = newDeploymentStorage;
	});
	ibmi?.onEvent(`disconnected`, () => {
		projectExplorer.refresh();
	});

	const projectWatcher = workspace.createFileSystemWatcher(`**/{iproj.json,.ibmi.json,.env}`);
	projectWatcher.onDidChange(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			await iProject.updateState();
			await iProject.updateBuildMap();
		}
		projectExplorer.refresh();

		ProjectManager.fire({ name: 'projects' });
	});
	projectWatcher.onDidCreate(async (uri) => {
		projectExplorer.refresh();

		ProjectManager.fire({ name: 'projects' });
	});
	projectWatcher.onDidDelete(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			iProject.setState(undefined);
		}
		projectExplorer.refresh();

		ProjectManager.fire({ name: 'projects' });
	});

	const jobLog = new JobLog(context);
	const jobLogWatcher = workspace.createFileSystemWatcher(`**/*.logs/joblog.json`);
	jobLogWatcher.onDidChange(() => { jobLog.refresh(); });
	jobLogWatcher.onDidCreate(() => { jobLog.refresh(); });
	jobLogWatcher.onDidDelete(() => { jobLog.refresh(); });

	const projectExplorerTreeView = window.createTreeView(`projectExplorer`, { treeDataProvider: projectExplorer, showCollapseAll: true });
	const jobLogTreeView = window.createTreeView(`jobLog`, { treeDataProvider: jobLog, showCollapseAll: true });
	context.subscriptions.push(
		projectExplorerTreeView,
		jobLogTreeView,
		workspace.onDidChangeWorkspaceFolders((event) => {
			ProjectManager.clear();

			const removedWorkspaceFolders = event.removed;
			const activeProject = ProjectManager.getActiveProject();
			if (activeProject && removedWorkspaceFolders.includes(activeProject.workspaceFolder)) {
				ProjectManager.setActiveProject(undefined);
			}

			projectExplorer.refresh();
			jobLog.refresh();
		}),
		window.onDidChangeActiveTextEditor((event) => {
			if (event && event.document.uri) {
				const workspaceFolder = workspace.getWorkspaceFolder(event?.document.uri);
				ProjectManager.setActiveProject(workspaceFolder);
			}
		})
	);

	return { projectManager: ProjectManager, projectExplorer: projectExplorer };
}

// this method is called when your extension is deactivated
export function deactivate() { }
