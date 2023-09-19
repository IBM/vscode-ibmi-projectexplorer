/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { ProjectManager } from "../../projectManager";
import { workspace } from "vscode";
import { iProjectMock, ibmiJsonMock } from "../constants";
import { IBMiJsonT } from "../../ibmiJsonT";

export const buildMapSuite: TestSuite = {
    name: `Build Map Tests`,
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];

        await iProject.updateIProj(iProjectMock);
        await iProject.updateIBMiJson(ibmiJsonMock, iProject.workspaceFolder.uri);
    },
    tests: [
        {
            name: `Test getBuildMap`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const buildMap = await iProject.getBuildMap();
                const rootIBMiJson = buildMap?.get(iProject.workspaceFolder.uri.fsPath);

                assert.deepStrictEqual(rootIBMiJson, ibmiJsonMock);
            }
        },
        {
            name: `Test updateBuildMap`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                iProject.setBuildMap(undefined);
                await iProject.updateBuildMap();
                const buildMap = await iProject.getBuildMap();
                const rootIBMiJson = buildMap?.get(iProject.workspaceFolder.uri.fsPath);

                assert.deepStrictEqual(rootIBMiJson, ibmiJsonMock);
            }
        },
        {
            name: `Test setBuildMap`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const newBuildMap: Map<string, IBMiJsonT> = new Map();
                newBuildMap.set(iProject.workspaceFolder.uri.fsPath, {
                    "version": "0.0.2",
                    "build": {
                        "objlib": "&MYLIB",
                        "tgtCcsid": "256"
                    }
                });
                iProject.setBuildMap(newBuildMap);
                const buildMap = await iProject.getBuildMap();
                const rootIBMiJson = buildMap?.get(iProject.workspaceFolder.uri.fsPath);

                assert.deepStrictEqual(rootIBMiJson, {
                    "version": "0.0.2",
                    "build": {
                        "objlib": "&MYLIB",
                        "tgtCcsid": "256"
                    }
                });
            }
        },
        {
            name: `Test getUnresolvedIBMiJson`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const unresolvedIBMiJson = await iProject.getUnresolvedIBMiJson(iProject.workspaceFolder.uri);

                assert.deepStrictEqual(unresolvedIBMiJson, ibmiJsonMock);
            }
        },
        {
            name: `Test getIbmiJson`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const ibmiJson1 = await iProject.getIBMiJson(iProject.workspaceFolder.uri);
                await workspace.fs.delete(iProject.getProjectFileUri('.ibmi.json', iProject.workspaceFolder.uri));
                await iProject.updateBuildMap();
                const ibmiJson2 = await iProject.getIBMiJson(iProject.workspaceFolder.uri);

                assert.deepStrictEqual(ibmiJson1, ibmiJsonMock);
                assert.deepStrictEqual(ibmiJson2, {
                    "version": "0.0.1",
                    "build": {
                        "objlib": "&OBJLIB",
                        "tgtCcsid": undefined
                    }
                });
            }
        },
        {
            name: `Test updateIBMiJson`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.updateIBMiJson({
                    "version": "0.0.2",
                    "build": {
                        "objlib": "&MYLIB",
                        "tgtCcsid": "256"
                    }
                }, iProject.workspaceFolder.uri);
                const ibmiJson = await iProject.getIBMiJson(iProject.workspaceFolder.uri);

                assert.deepStrictEqual(ibmiJson, {
                    "version": "0.0.2",
                    "build": {
                        "objlib": "&MYLIB",
                        "tgtCcsid": "256"
                    }
                });
            }
        }
    ]
};