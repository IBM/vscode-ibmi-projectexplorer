/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { ProjectExplorerSchemaId, ProjectManager } from "../../projectManager";
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
                const validator = ProjectManager.getValidator();

                const schemaIds = Object.entries(ProjectExplorerSchemaId);
                for await (const [key, value] of schemaIds) {
                    assert.ok(value in validator.schemas);
                }
            }
        },
        {
            name: `Test validateSchema`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;
                const iProjFileUri = iProject.getProjectFileUri('iproj.json');
                const ibmiFileUri = iProject.getProjectFileUri('.ibmi.json');
                await workspace.fs.writeFile(iProjFileUri, new TextEncoder().encode(
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
                await workspace.fs.writeFile(ibmiFileUri, new TextEncoder().encode(
                    JSON.stringify({
                        "version": ["0.0.1"],
                        "build": {
                            "objlib": ["&OBJLIB"],
                            "tgtCcsid": ["37"],
                        }
                    }, null, 2)
                ));
                const iProjContent = (await workspace.fs.readFile(iProjFileUri)).toString();
                const ibmiContent = (await workspace.fs.readFile(ibmiFileUri)).toString();
                const iProjValidatorResult = ProjectManager.validateSchema(ProjectExplorerSchemaId.iproj, JSON.parse(iProjContent));
                const ibmiValidatorResult = ProjectManager.validateSchema(ProjectExplorerSchemaId.ibmi, JSON.parse(ibmiContent));

                assert.strictEqual(iProjValidatorResult.errors.length, 8);
                assert.strictEqual(ibmiValidatorResult.errors.length, 3);
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
                const last = children.length - 1;

                assert.strictEqual(children[last].label, 'Test Tree Item');
            }
        }
    ]
};