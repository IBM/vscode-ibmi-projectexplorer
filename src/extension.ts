// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { loadBase, getInstance } from './ibmi';
import JobLog from './views/jobLog';
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

	const jobLog = new JobLog(context);

	const jobLogWatcher = vscode.workspace.createFileSystemWatcher(`**/*.logs/{joblog.json,output.log}`);
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
		)
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
