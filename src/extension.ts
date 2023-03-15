// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { loadBase, getInstance } from './ibmi';
import ProjectExplorer from './views/projectExplorer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ibm-projectmode" is now active!');

	const projectExplorer = new ProjectExplorer(context);

	loadBase();

	const ibmi = getInstance();
	ibmi?.onEvent(`connected`, () => {
		projectExplorer.refresh();
	});

	// @ts-ignore
	ibmi?.onEvent(`deployLocation`, () => {
		projectExplorer.refresh();
	});

	const projectWatcher = vscode.workspace.createFileSystemWatcher(`**/*.{env,json}`);
	projectWatcher.onDidChange(() => { projectExplorer.refresh(); });
	projectWatcher.onDidCreate(() => { projectExplorer.refresh(); });
	projectWatcher.onDidDelete(() => { projectExplorer.refresh(); });

	// Tree views
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(
			`projectExplorer`,
			projectExplorer
		)
	);

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand(`vscode-ibmi-projectmode.addToIncludes`, (element: vscode.TreeItem) => {
			const path = (element as any).path;
			if (path) {
				const ibmi = getInstance();
				const deploymentDirs = ibmi?.getStorage().getDeployment()!;
				const localDir = projectElement.resourceUri?.path!; //TODO: Fix
				const remoteDir = deploymentDirs[localDir]; //TODO: Fix

				const iProject = ProjectManager.get(projectElement.workspaceFolder); //TODO: Fix
				if (remoteDir && remoteDir !== path && path.startsWith(remoteDir)) {
					//Add relative path to remoteDir to include paths
					const relativePath = path.relative(remoteDir, path);
					iProject.addToIncludes(relativePath);
				} else {
					//Add absolute path to include paths
					iProject.addToIncludes(path);
				}
			} else {
				vscode.window.showErrorMessage('Failed to retrieve path to directory.');
			}
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
