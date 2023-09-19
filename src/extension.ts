/*
 * (c) Copyright IBM Corp. 2023
 */

import { loadBase } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { ExtensionContext, l10n, window, workspace } from 'vscode';
import { IBMiProjectExplorer } from './ibmiProjectExplorer';
import { ProjectFileWatcher } from './fileWatcher';
import { ConfigurationManager } from './configurationManager';
import { run } from './test';

export let extensionContext: ExtensionContext;

export async function activate(context: ExtensionContext): Promise<IBMiProjectExplorer> {
	console.log(l10n.t('Congratulations, your extension "vscode-ibmi-projectexplorer" is now active!'));
	extensionContext = context;

	// Load Code for IBM i API
	loadBase();

	// Initialize projects
	await ProjectManager.initialize(context);

	// Initialize configuration manager
	ConfigurationManager.initialize(context);

	// Setup tree views
	const projectExplorer = new ProjectExplorer(context);
	const projectExplorerTreeView = window.createTreeView(`projectExplorer`, { treeDataProvider: projectExplorer, showCollapseAll: true });
	const jobLog = new JobLog(context);
	const jobLogTreeView = window.createTreeView(`jobLog`, { treeDataProvider: jobLog, showCollapseAll: true });

	// Initialize file watcher
	ProjectFileWatcher.initialize(projectExplorer, jobLog);

	context.subscriptions.push(
		projectExplorerTreeView,
		jobLogTreeView,
		workspace.onDidChangeWorkspaceFolders(async (event) => {
			ProjectManager.clear();

			const removedWorkspaceFolders = event.removed;
			const activeProject = ProjectManager.getActiveProject();
			if (activeProject && removedWorkspaceFolders.includes(activeProject.workspaceFolder)) {
				await ProjectManager.setActiveProject(undefined);
			}

			projectExplorer.refresh();
			jobLog.refresh();
		}),
		window.onDidChangeActiveTextEditor(async (event) => {
			if (event && event.document.uri) {
				const workspaceFolder = workspace.getWorkspaceFolder(event?.document.uri);

				if (workspaceFolder) {
					const iProject = ProjectManager.get(workspaceFolder);

					if (iProject && await iProject.projectFileExists('iproj.json')) {
						const activeProject = ProjectManager.getActiveProject();

						if (activeProject && iProject.workspaceFolder !== activeProject.workspaceFolder) {
							await ProjectManager.setActiveProject(workspaceFolder);
							projectExplorer.refresh();
						}
					}
				}
			}
		})
	);

	// Setup tests
	if (process.env.testing) {
		// Run tests if testing environment variable is set
		await run(false);
	}

	return { projectManager: ProjectManager, projectExplorer: projectExplorer, jobLog: jobLog };
}

export function deactivate() { }
