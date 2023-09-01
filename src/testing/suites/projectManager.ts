/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { ProjectManager } from "../../projectManager";
import { commands, window, workspace } from "vscode";
import { ProjectExplorerTreeItem } from "../../views/projectExplorer/projectExplorerTreeItem";
import { IProject } from "../../iproject";
import Project from "../../views/projectExplorer/project";
import { TextEncoder } from "util";

export const projectManagerSuite: TestSuite = {
    name: `Project Manager Tests`,
    beforeEach: async () => {
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            for await (const folder of workspaceFolders) {
                await ProjectManager.load(folder);
            }
        }
    },
    tests: [
        {
            name: `Test getValidator`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;
                const validator = ProjectManager.getValidator();
                const schema = validator.schemas['/iproj'];
                const fileUri = iProject.getProjectFileUri('iproj.json');
                await workspace.fs.writeFile(fileUri, new TextEncoder().encode(
                    JSON.stringify({
                        "version": "0.0.2",
                        "description": ["SAMPLE PROJECT"],
                        "objlib": ["&OBJLIB"],
                        "curlib": ["&CURLIB"],
                        "includePath": "includes",
                        "preUsrlibl": "&lib1",
                        "postUsrlibl": "&lib3",
                        "setIBMiEnvCmd": "",
                        "extensions": ""
                    }, null, 2)
                ));
                const content = (await workspace.fs.readFile(fileUri)).toString();
                const validatorResult = validator.validate(JSON.parse(content), schema);

                assert.ok('/iproj' in validator.schemas);
                assert.strictEqual(validatorResult.errors.length, 8);
            }
        },
        {
            name: `Test load`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                ProjectManager.clear();
                await ProjectManager.load(workspaceFolder);
                const iProject = ProjectManager.getProjects()[0];

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test get`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test clear`, test: async () => {
                ProjectManager.clear();
                const iProjects = ProjectManager.getProjects();

                assert.strictEqual(iProjects.length, 0);
            }
        },
        {
            name: `Test getActiveProject`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.getActiveProject()!;

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test setActiveProject`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                await ProjectManager.setActiveProject(undefined);
                const iProject1 = ProjectManager.getActiveProject();
                await ProjectManager.setActiveProject(workspaceFolder);
                const iProject2 = ProjectManager.getActiveProject();

                assert.strictEqual(iProject1, undefined);
                assert.strictEqual(iProject2?.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test getActiveProjectStatusBarItem`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const activeStatusBarItem = ProjectManager.getActiveProjectStatusBarItem();

                assert.ok(activeStatusBarItem.text.includes(`Project: ${workspaceFolder.name}`));
            }
        },
        {
            name: `Test getProjects`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.getProjects()[0];

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test getProjectFromName`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.getProjectFromName(workspaceFolder.name)!;

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test getProjectFromActiveTextEditor`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProjUri = ProjectManager.getProjects()[0].getProjectFileUri('iproj.json');
                const doc = await workspace.openTextDocument(iProjUri);
                await window.showTextDocument(doc);
                const iProject = ProjectManager.getProjectFromActiveTextEditor()!;
                await commands.executeCommand("workbench.action.closeActiveEditor");

                assert.strictEqual(iProject!.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test getProjectFromUri`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProjUri = ProjectManager.getProjects()[0].getProjectFileUri('iproj.json');
                const iProject = ProjectManager.getProjectFromUri(iProjUri)!;

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test getProjectFromTreeItem`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const projectExplorerTreeItem: ProjectExplorerTreeItem = {
                    workspaceFolder: workspaceFolder,
                    getChildren: () => {
                        return [];
                    }
                };
                const iProject = ProjectManager.getProjectFromTreeItem(projectExplorerTreeItem)!;

                assert.strictEqual(iProject.getName(), workspaceFolder.name);
            }
        },
        {
            name: `Test pushExtensibleChildren`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                ProjectManager.pushExtensibleChildren(async (iProject: IProject) => {
                    const projectExplorerTreeItem: ProjectExplorerTreeItem = {
                        workspaceFolder: iProject.workspaceFolder,
                        getChildren: () => {
                            return [];
                        },
                        label: 'Test Tree Item'
                    };

                    return [projectExplorerTreeItem];
                });
                const projectTreeItem = new Project(workspaceFolder, { description: 'SAMPLE PROJECT' });
                const children = await projectTreeItem.getChildren();
                Project.callBack = [];

                assert.strictEqual(children[5].label, 'Test Tree Item');
            }
        }
    ]
};