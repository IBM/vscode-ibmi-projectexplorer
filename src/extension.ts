/*
 * (c) Copyright IBM Corp. 2023
 */

import path = require('path');
import * as vscode from 'vscode';
import { loadBase, getInstance } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ibm-projectmode" is now active!');

	loadBase();

	ProjectManager.loadProjects();

	const projectExplorer = new ProjectExplorer(context);

	const ibmi = getInstance();
	ibmi?.onEvent(`connected`, () => { projectExplorer.refresh(); });
	// @ts-ignore
	ibmi?.onEvent(`deployLocation`, () => { projectExplorer.refresh(); });

	const projectWatcher = vscode.workspace.createFileSystemWatcher(`**/*.{env,json}`);
	projectWatcher.onDidChange(async (uri) => {
		const iProject = ProjectManager.getProjectFromUri(uri);
		if (iProject) {
			await iProject.read();
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
		vscode.window.registerTreeDataProvider(
			`projectExplorer`,
			projectExplorer
		),
		vscode.window.registerTreeDataProvider(
			`jobLog`,
			jobLog
		),
		vscode.workspace.onDidChangeWorkspaceFolders(() => {
			ProjectManager.clear();

			projectExplorer.refresh();
			jobLog.refresh();
		})
	);

	// Display a physical file
	const createFilePreview = async (content: string, library: string, file: string, member: string) => {
		// Local file path if the file has been saved by the user
		let filePath = vscode.Uri.parse(path.join('/tmp', library, file, member));
		try {
			// Check if it exists
			await vscode.workspace.fs.stat(filePath);
		}
		catch (e) {
			// If it doesn't exist, create the file
			filePath = vscode.Uri.parse('untitled:' + path.join('/tmp', library, file, member));
			new vscode.WorkspaceEdit().createFile(filePath, { overwrite: true });
		}
		vscode.workspace.openTextDocument(filePath).then(document => {
			// Write the content to the file
			const edit = new vscode.WorkspaceEdit();
			edit.replace(filePath, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount + 1, 0)), content);
			return vscode.workspace.applyEdit(edit).then(success => {
				if (success) {
					vscode.window.showTextDocument(document);
				} else {
					vscode.window.showInformationMessage('Error: Could not write the content of the file');
				}
			});

		});
	};


	// Show content for an IBM i member
	vscode.commands.registerCommand('showMemberContent', async (library: string, file: string, member: string, memberUri: vscode.Uri | null) => {
		const instance = getInstance();
		if (instance) {
			let content: string;
			try {
				// if this works its a table member
				const table = await instance.getContent()?.getTable(library, file, member);
				content = JSON.stringify(table);
				createFilePreview(content, library, file, member);
			} catch (e) {
				// if this works its a source member
				vscode.commands.executeCommand('vscode.open', memberUri)
			}
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
