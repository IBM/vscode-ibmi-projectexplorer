/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import { ProjectManager } from "../projectManager";
import { commands, window, workspace } from "vscode";
import { ProjectExplorerTreeItem } from "../views/projectExplorer/projectExplorerTreeItem";
import { IProject } from "../iproject";
import Project from "../views/projectExplorer/project";

export const projectManagerSuite: TestSuite = {
    name: `Project Manager Tests`,
    tests: [
        {
            name: `Test load`, test: async () => {
                ProjectManager.clear();
                ProjectManager.load(workspace.workspaceFolders![0]);
                const iProject = ProjectManager.getProjects()[0];

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test get`, test: async () => {
                const iProject = ProjectManager.get(workspace.workspaceFolders![0])!;

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getActiveProject`, test: async () => {
                const iProject = ProjectManager.getActiveProject()!;

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test setActiveProject`, test: async () => {
                ProjectManager.setActiveProject(undefined);
                ProjectManager.setActiveProject(workspace.workspaceFolders![0]);
                const iProject = ProjectManager.getProjects()[0];

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getActiveProjectStatusBarItem`, test: async () => {
                const activeStatusBarItem = ProjectManager.getActiveProjectStatusBarItem();

                assert.ok(activeStatusBarItem.text.includes('Project: bob-recursive-example'));
            }
        },
        {
            name: `Test getProjects`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getProjectFromName`, test: async () => {
                const iProject = ProjectManager.getProjectFromName('bob-recursive-example')!;

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getProjectFromActiveTextEditor`, test: async () => {
                const iProjUri = ProjectManager.getProjects()[0].getProjectFileUri('iproj.json');
                const doc = await workspace.openTextDocument(iProjUri);
                await window.showTextDocument(doc);
                const iProject = ProjectManager.getProjectFromActiveTextEditor()!;
                await commands.executeCommand("workbench.action.closeActiveEditor");

                assert.strictEqual(iProject!.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getProjectFromUri`, test: async () => {
                const iProjUri = ProjectManager.getProjects()[0].getProjectFileUri('iproj.json');
                const iProject = ProjectManager.getProjectFromUri(iProjUri)!;

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test getProjectFromTreeItem`, test: async () => {
                const projectExplorerTreeItem: ProjectExplorerTreeItem = {
                    workspaceFolder: workspace.workspaceFolders![0],
                    getChildren: () => {
                        return [];
                    }
                };
                const iProject = ProjectManager.getProjectFromTreeItem(projectExplorerTreeItem)!;

                assert.strictEqual(iProject.getName(), 'bob-recursive-example');
            }
        },
        {
            name: `Test pushExtensibleChildren`, test: async () => {
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
                const projectTreeItem = new Project(workspace.workspaceFolders![0], 'SAMPLE PROJECT');
                const children = await projectTreeItem.getChildren();
                Project.callBack = [];

                assert.strictEqual(children[5].label, 'Test Tree Item');
            }
        }
    ]
};
