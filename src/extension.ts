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

	const projectExplorer = new ProjectExplorer();

	loadBase();

	const ibmi = getInstance();
	ibmi?.onEvent(`connected`, () => {
		projectExplorer.refresh();
	});

	// @ts-ignore
	ibmi?.onEvent(`deployLocation`, () => {
		projectExplorer.refresh();
	});

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(
			`projectExplorer`,
			projectExplorer
		)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
