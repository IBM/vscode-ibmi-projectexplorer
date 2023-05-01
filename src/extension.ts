/*
 * (c) Copyright IBM Corp. 2023
 */

import path = require('path');
import { loadBase, getInstance } from './ibmi';
import { ProjectManager } from './projectManager';
import JobLog from './views/jobLog';
import ProjectExplorer from './views/projectExplorer';
import { ExtensionContext, Position, Range, TreeItem, Uri, WorkspaceEdit, commands, l10n, window, workspace } from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(l10n.t('Congratulations, your extension "vscode-ibmi-projectexplorer" is now active!'));

	loadBase();

	ProjectManager.loadProjects();

	const projectExplorer = new ProjectExplorer(context);

	const ibmi = getInstance();
	ibmi?.onEvent(`connected`, () => { projectExplorer.refresh(); });
	// @ts-ignore
	ibmi?.onEvent(`deployLocation`, () => { projectExplorer.refresh(); });

	const projectWatcher = workspace.createFileSystemWatcher(`**/*.{env,json}`);
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

	const jobLogWatcher = workspace.createFileSystemWatcher(`**/*.logs/joblog.json`);
	jobLogWatcher.onDidChange(() => { jobLog.refresh(); });
	jobLogWatcher.onDidCreate(() => { jobLog.refresh(); });
	jobLogWatcher.onDidDelete(() => { jobLog.refresh(); });

	context.subscriptions.push(
		window.registerTreeDataProvider(
			`projectExplorer`,
			projectExplorer
		),
		window.registerTreeDataProvider(
			`jobLog`,
			jobLog
		),
		workspace.onDidChangeWorkspaceFolders(() => {
			ProjectManager.clear();

			projectExplorer.refresh();
			jobLog.refresh();
		})
	);

	// Commands
	context.subscriptions.push(
		commands.registerCommand(`vscode-ibmi-projectexplorer.addToIncludePaths`, async (element: TreeItem) => {
			const includePath = (element as any).path;
			if (includePath) {
				const iProject = await ProjectManager.selectProject();
				if (iProject) {
					await iProject.addToIncludePaths(includePath);
				}
			} else {
				window.showErrorMessage(l10n.t('Failed to retrieve path to directory'));
			}
		})
	);

	// Display a physical file
	const createFilePreview = async (content: string, library: string, file: string, member: string) => {
		// Local file path if the file has been saved by the user
		let filePath = Uri.parse(path.join('/tmp', library, file, member));
		try {
			// Check if it exists
			await workspace.fs.stat(filePath);
		}
		catch (e) {
			// If it doesn't exist, create the file
			filePath = Uri.parse('untitled:' + path.join('/tmp', library, file, member));
			new WorkspaceEdit().createFile(filePath, { overwrite: true });
		}
		workspace.openTextDocument(filePath).then(document => {
			// Write the content to the file
			const edit = new WorkspaceEdit();
			edit.replace(filePath, new Range(new Position(0, 0), new Position(document.lineCount + 1, 0)), content);
			return workspace.applyEdit(edit).then(success => {
				if (success) {
					window.showTextDocument(document);
				} else {
					window.showInformationMessage(l10n.t('Error: Could not write the content of the file'));
				}
			});

		});
	};

	// Show content for an IBM i member
	commands.registerCommand('showMemberContent', async (library: string, file: string, member: string, memberUri: Uri | null) => {
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
				commands.executeCommand('vscode.open', memberUri);
			}
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
