// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import { workspace } from 'vscode';
import { loadBase, getInstance } from './ibmi';
import ProjectExplorer, { ProjectManager } from './views/projectExplorer';

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
	projectWatcher.onDidChange(async (uri) => {
		const workspaceFolders = workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const changedWorkspaceFolder = workspaceFolders.filter(workspaceFolder =>
				uri.fsPath.startsWith(workspaceFolder.uri.fsPath)
			)[0];
			const iProject = ProjectManager.get(changedWorkspaceFolder);
			if (iProject) {
				await iProject.read();
			}
		}
		projectExplorer.refresh();
	});
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
	
	// Display a physical file
	const createFilePreview = async (content:string, library:string, file:string, member:string) =>{
		// Local file path if the file has been saved by the user
		let filePath = vscode.Uri.parse(path.join('/tmp',library, file, member));
		try{
			// Check if it exists
			await vscode.workspace.fs.stat(filePath);
		}
		catch(e){
			// If it doesn't exist, create the file
			filePath = vscode.Uri.parse('untitled:' + path.join('/tmp',library, file, member));
			new vscode.WorkspaceEdit().createFile(filePath, {overwrite: true});
		}
			vscode.workspace.openTextDocument(filePath).then(document => {
				// Write the content to the file
				const edit = new vscode.WorkspaceEdit();
				edit.replace(filePath, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount + 1, 0)) , content);
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
	vscode.commands.registerCommand('showMemberContent', async(library: string, file: string, member: string, memberUri:vscode.Uri | null)=>{
		const instance = getInstance();
		if (instance){
			let content:string;
			try {
				// if this works its a table member
				const table = await instance.getContent()?.getTable(library, file, member);
				content = JSON.stringify(table);
				createFilePreview(content, library, file, member);
			}catch (e){
				// if this works its a source member
				vscode.commands.executeCommand('vscode.open', memberUri)
			}
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
