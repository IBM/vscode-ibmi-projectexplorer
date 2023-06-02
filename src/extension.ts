/*
 * (c) Copyright IBM Corp. 2023
 */

import { loadBase, getInstance } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { ExtensionContext, l10n, window, workspace } from 'vscode';
import { ProjectExplorerApi } from './projectExplorerApi';
import { initialise } from './testing';

export function activate(context: ExtensionContext): ProjectExplorerApi {
	console.log(l10n.t('Congratulations, your extension "vscode-ibmi-projectexplorer" is now active!'));

	loadBase();
	ProjectManager.initialize(context);

	const projectExplorer = new ProjectExplorer(context);
	const ibmi = getInstance();
	ibmi?.onEvent(`connected`, () => {
		projectExplorer.refresh();
		ProjectManager.getActiveProjectStatusBarItem().show();
	});
	ibmi?.onEvent(`deployLocation`, () => {
		projectExplorer.refresh();
	});
	ibmi?.onEvent(`disconnected`, () => {
		projectExplorer.refresh();
		ProjectManager.getActiveProjectStatusBarItem().hide();
	});

	const projectWatcher = workspace.createFileSystemWatcher(`**/{iproj.json,.ibmi.json,.env}`);
	projectWatcher.onDidChange(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			await iProject.updateState();
			await iProject.updateBuildMap();
		}
		projectExplorer.refresh();

		ProjectManager.fire('projects');
	});
	projectWatcher.onDidCreate(async (uri) => {
		projectExplorer.refresh();

		ProjectManager.fire('projects');
	});
	projectWatcher.onDidDelete(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			iProject.setState(undefined);
		}
		projectExplorer.refresh();

		ProjectManager.fire('projects');
	});

	const jobLog = new JobLog(context);
	const jobLogWatcher = workspace.createFileSystemWatcher(`**/*.logs/joblog.json`);
	jobLogWatcher.onDidChange(() => { jobLog.refresh(); });
	jobLogWatcher.onDidCreate(() => { jobLog.refresh(); });
	jobLogWatcher.onDidDelete(() => { jobLog.refresh(); });

	context.subscriptions.push(
		window.registerTreeDataProvider(`projectExplorer`, projectExplorer),
		window.registerTreeDataProvider(`jobLog`, jobLog),
		workspace.onDidChangeWorkspaceFolders((event) => {
			ProjectManager.clear();

			const removedWorkspaceFolders = event.removed;
			const activeProject = ProjectManager.getActiveProject();
			if (activeProject && removedWorkspaceFolders.includes(activeProject.workspaceFolder)) {
				ProjectManager.setActiveProject(undefined);
			}

			projectExplorer.refresh();
			jobLog.refresh();
		})
	);

	console.log(`Developer environment: ${process.env.DEV}`);
	if (process.env.DEV) {
	  // Run tests if not in production build
	  initialise(context);
	}

	return { projectManager: ProjectManager, projectExplorer: projectExplorer };
}

// this method is called when your extension is deactivated
export function deactivate() { }
