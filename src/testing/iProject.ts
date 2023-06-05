/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import * as path from "path";
import { ProjectManager } from "../projectManager";
import { EnvironmentVariables } from "../iproject";
import { LibraryType } from "../views/projectExplorer/library";

export const iProjectSuite: TestSuite = {
    name: `iProject Tests`,
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];

        await iProject.createEnv();
        await iProject.setEnv('curlib', 'QGPL');
        await iProject.setEnv('lib1', 'SYSTOOLS');
        await iProject.setEnv('lib3', 'QSYSINC');
        await iProject.setEnv('path1', 'PATH1');

        await iProject.updateIProj({
            "version": "0.0.1",
            "description": "SAMPLE PROJECT",
            "objlib": "&objlib",
            "curlib": "&curlib",
            "includePath": ["includes", "QPROTOSRC", "&path1", "&path2"],
            "preUsrlibl": ["&lib1", "&lib2"],
            "postUsrlibl": ["&lib3", "&lib4"],
            "setIBMiEnvCmd": []
        });
    },
    tests: [
        {
            name: `Test getProjectFileUri`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const iProjFileUri = iProject.getProjectFileUri('iproj.json');
                const joblogFileUri = iProject.getProjectFileUri('joblog.json');
                const outputFileUri = iProject.getProjectFileUri('output.log');
                const envFilePath = iProject.getProjectFileUri('.env');

                assert.ok(iProjFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, 'iproj.json')));
                assert.ok(joblogFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'joblog.json')));
                assert.ok(outputFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'output.log')));
                assert.ok(envFilePath.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.env')));
            }
        },
        {
            name: `Test projectFileExists`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const iProjExists = await iProject.projectFileExists('iproj.json');
                const joblogExists = await iProject.projectFileExists('joblog.json');
                const outputExists = await iProject.projectFileExists('output.log');
                const envExists = await iProject.projectFileExists('.env');

                assert.ok(iProjExists);
                assert.strictEqual(joblogExists, false);
                assert.strictEqual(outputExists, false);
                assert.ok(envExists);
            }
        },
        {
            name: `Test getState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "QGPL",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2"],
                    "preUsrlibl": ["SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test updateState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                iProject.setState(undefined);
                await iProject.updateState();
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "QGPL",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2"],
                    "preUsrlibl": ["SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test setState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                iProject.setState({
                    "version": "0.0.2",
                    "description": "NEW SAMPLE PROJECT",
                });
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.2",
                    "description": "NEW SAMPLE PROJECT",
                });
            }
        },
        {
            name: `Test getUnresolvedState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const unresolvedState = await iProject.getUnresolvedState()!;

                assert.deepStrictEqual(unresolvedState, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "&curlib",
                    "includePath": ["includes", "QPROTOSRC", "&path1", "&path2"],
                    "preUsrlibl": ["&lib1", "&lib2"],
                    "postUsrlibl": ["&lib3", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test resolveLibrary`, test: async () => {
                const envVars: EnvironmentVariables = {
                    'lib1': 'TEMP_LIB_1',
                    'lib2': 'TEMP_LIB_2'
                };

                const iProject = ProjectManager.getProjects()[0];
                const env1 = iProject.resolveLibrary('&lib1', envVars);
                const env2 = iProject.resolveLibrary('&lib2', envVars);
                const env3 = iProject.resolveLibrary('&lib3', envVars);

                assert.strictEqual(env1, 'TEMP_LIB_1');
                assert.strictEqual(env2, 'TEMP_LIB_2');
                assert.strictEqual(env3, '&lib3');
            }
        },
        {
            name: `Test addToIncludePaths`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.addToIncludePaths('/some/path');
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "QGPL",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2", "/some/path"],
                    "preUsrlibl": ["SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test removeFromIncludePaths`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.removeFromIncludePaths('includes');
                await iProject.removeFromIncludePaths('&path1');
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "QGPL",
                    "includePath": ["QPROTOSRC", "&path2"],
                    "preUsrlibl": ["SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test getLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const libraryList = (await iProject.getLibraryList())!;

                assert.ok(libraryList.find(lib => lib.libraryInfo.name === 'QGPL' && lib.libraryType === 'CUR'));
                assert.ok(libraryList.find(lib => lib.libraryInfo.name === 'SYSTOOLS' && lib.libraryType === 'USR'));
                assert.ok(libraryList.find(lib => lib.libraryInfo.name === 'QSYSINC' && lib.libraryType === 'USR'));
            }
        },
        {
            name: `Test addToLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.addToLibraryList('MYLIB1', 'preUsrlibl');
                await iProject.addToLibraryList('MYLIB2', 'postUsrlibl');
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "QGPL",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2"],
                    "preUsrlibl": ["MYLIB1", "SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4", "MYLIB2"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test setCurrentLibrary`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setCurrentLibrary('MYLIB');
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "MYLIB",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2"],
                    "preUsrlibl": ["SYSTOOLS", "&lib2"],
                    "postUsrlibl": ["QSYSINC", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test removeFromLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.removeFromLibraryList('QGPL', LibraryType.currentLibrary);
                await iProject.removeFromLibraryList('QSYSINC', LibraryType.postUserLibrary);
                await iProject.removeFromLibraryList('SYSTOOLS', LibraryType.preUserLibrary);
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&objlib",
                    "curlib": "&curlib",
                    "includePath": ["includes", "QPROTOSRC", "PATH1", "&path2"],
                    "preUsrlibl": ["&lib1", "&lib2"],
                    "postUsrlibl": ["&lib3", "&lib4"],
                    "setIBMiEnvCmd": []
                });
            }
        },
        {
            name: `Test createProject`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.createProject('NEW SAMPLE PROJECT');
                const state = await iProject.getState()!;

                assert.deepStrictEqual(state, {
                    "description": "NEW SAMPLE PROJECT",
                    "objlib": undefined,
                    "curlib": undefined,
                    "includePath": undefined,
                    "postUsrlibl": undefined,
                    "preUsrlibl": undefined
                });
            }
        },
        {
            name: `Test createEnv`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.createEnv();
                const env = await iProject.getEnv();

                assert.deepStrictEqual(env, {
                    "objlib": '',
                    "curlib": '',
                    "lib1": '',
                    "lib2": '',
                    "lib3": '',
                    "lib4": '',
                    "path1": '',
                    "path2": '',
                });
            }
        },
        {
            name: `Test getEnv`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const env = await iProject.getEnv();

                assert.deepStrictEqual(env, {
                    "objlib": '',
                    "curlib": 'QGPL',
                    "lib1": 'SYSTOOLS',
                    "lib2": '',
                    "lib3": 'QSYSINC',
                    "lib4": '',
                    "path1": 'PATH1',
                    "path2": '',
                });
            }
        },
        {
            name: `Test setEnv`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setEnv('var', 'VAR');
                await iProject.setEnv('lib2', 'MYLIB');
                const env = await iProject.getEnv();

                assert.deepStrictEqual(env, {
                    "objlib": '',
                    "curlib": 'QGPL',
                    "lib1": 'SYSTOOLS',
                    "lib2": 'MYLIB',
                    "lib3": 'QSYSINC',
                    "lib4": '',
                    "path1": 'PATH1',
                    "path2": '',
                    "var": 'VAR'
                });
            }
        },
        {
            name: `Test getVariables`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const variables = await iProject.getVariables();

                assert.deepStrictEqual(variables, ['curlib', 'objlib', 'lib3', 'lib4', 'lib1', 'lib2', 'path1', 'path2']);
            }
        },
        {
            name: `Test getObjectLibraries`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const objLibs = await iProject.getObjectLibraries();

                assert.deepStrictEqual(objLibs, new Set(['&objlib', '&curlib', '&lib1', '&lib2', '&lib3', '&lib4']));
            }
        },
        {
            name: `Test getRemoteDir`, test: async () => {
            }
        }
    ]
};
