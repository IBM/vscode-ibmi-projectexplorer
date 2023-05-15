/*
 * (c) Copyright IBM Corp. 2023
 */

import * as vscode from 'vscode';
import { loadBase, getInstance } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { ProjectExplorerApi } from './projectExplorerApi';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): ProjectExplorerApi {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ibmi-projectexplorer" is now active!');

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

	const projectWatcher = vscode.workspace.createFileSystemWatcher(`**/{iproj.json,.ibmi.json,.env}`);
	projectWatcher.onDidChange(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			await iProject.updateState();
		}
		projectExplorer.refresh();
	});
	projectWatcher.onDidCreate(async (uri) => { projectExplorer.refresh(); });
	projectWatcher.onDidDelete(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			iProject.setState(undefined);
		}
		projectExplorer.refresh();
	});

	const jobLog = new JobLog(context);
	const jobLogWatcher = vscode.workspace.createFileSystemWatcher(`**/*.logs/joblog.json`);
	jobLogWatcher.onDidChange(() => { jobLog.refresh(); });
	jobLogWatcher.onDidCreate(() => { jobLog.refresh(); });
	jobLogWatcher.onDidDelete(() => { jobLog.refresh(); });

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(`projectExplorer`, projectExplorer),
		vscode.window.registerTreeDataProvider(`jobLog`, jobLog),
		vscode.workspace.onDidChangeWorkspaceFolders((event) => {
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

	return { projectManager: ProjectManager, projectExplorer: projectExplorer };
}

// this method is called when your extension is deactivated
export function deactivate() { }
