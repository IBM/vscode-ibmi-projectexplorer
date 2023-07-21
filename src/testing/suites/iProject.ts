/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import * as path from "path";
import { ProjectManager } from "../../projectManager";
import { ProjectFileType } from "../../iproject";
import { LibraryType } from "../../views/projectExplorer/library";
import { workspace } from "vscode";
import { getInstance } from "../../ibmi";
import { iProjectMock, ibmiJsonMock } from "../constants";
import { TextEncoder } from "util";

let deployLocation: string;

export const iProjectSuite: TestSuite = {
    name: `iProject Tests`,
    beforeAll: async () => {
        for await (const fileToDelete of ['joblog.json', 'output.log']) {
            try {
                const iProject = ProjectManager.getProjects()[0];
                await workspace.fs.delete(iProject.getProjectFileUri(fileToDelete as ProjectFileType));
            } catch { }
        }

        const iProject = ProjectManager.getProjects()[0];
        const ibmi = getInstance();
        const storage = ibmi?.getStorage()!;
        const existingPaths = storage.getDeployment();
        deployLocation = ibmi!.getConnection().getTempRemote(iProject.getName());
        existingPaths[iProject.workspaceFolder.uri.fsPath] = deployLocation;
        await storage.setDeployment(existingPaths);
    },
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];

        await iProject.createEnv();
        await iProject.updateEnv('CURLIB', 'QGPL');
        await iProject.updateEnv('lib1', 'SYSTOOLS');
        await iProject.updateEnv('lib3', 'QSYSINC');
        await iProject.updateEnv('path1', 'PATH1');

        await iProject.updateIProj(iProjectMock);
        await iProject.updateIBMiJson(ibmiJsonMock, iProject.workspaceFolder.uri);
    },
    tests: [
        {
            name: `Test getProjectFileUri`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const iProjFileUri = iProject.getProjectFileUri('iproj.json');
                const ibmiJsonFilePath = iProject.getProjectFileUri('.ibmi.json', iProject.workspaceFolder.uri);
                const joblogFileUri = iProject.getProjectFileUri('joblog.json');
                const outputFileUri = iProject.getProjectFileUri('output.log');
                const envFilePath = iProject.getProjectFileUri('.env');

                assert.ok(iProjFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, 'iproj.json')));
                assert.ok(ibmiJsonFilePath.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.ibmi.json')));
                assert.ok(joblogFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'joblog.json')));
                assert.ok(outputFileUri.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'output.log')));
                assert.ok(envFilePath.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.env')));
            }
        },
        {
            name: `Test projectFileExists`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const iProjExists = await iProject.projectFileExists('iproj.json');
                const ibmiJsonExists = await iProject.projectFileExists('.ibmi.json', iProject.workspaceFolder.uri);
                const joblogExists = await iProject.projectFileExists('joblog.json');
                const outputExists = await iProject.projectFileExists('output.log');
                const envExists = await iProject.projectFileExists('.env');

                assert.ok(iProjExists);
                assert.ok(ibmiJsonExists);
                assert.ok(!joblogExists);
                assert.ok(!outputExists);
                assert.ok(envExists);
            }
        },
        {
            name: `Test resolveVariable`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const env = await iProject.getEnv();
                const env1 = iProject.resolveVariable('&OBJLIB', env);
                const env2 = iProject.resolveVariable('&CURLIB', env);
                const env3 = iProject.resolveVariable('&path1', env);
                const env4 = iProject.resolveVariable('&path2', env);
                const env5 = iProject.resolveVariable('&lib1', env);
                const env6 = iProject.resolveVariable('&lib2', env);
                const env7 = iProject.resolveVariable('&lib3', env);
                const env8 = iProject.resolveVariable('&lib4', env);

                assert.strictEqual(env1, '&OBJLIB');
                assert.strictEqual(env2, 'QGPL');
                assert.strictEqual(env3, 'PATH1');
                assert.strictEqual(env4, '&path2');
                assert.strictEqual(env5, 'SYSTOOLS');
                assert.strictEqual(env6, '&lib2');
                assert.strictEqual(env7, 'QSYSINC');
                assert.strictEqual(env8, '&lib4');
            }
        },
        {
            name: `Test getState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const state = await iProject.getState();

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&OBJLIB",
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
                const state = await iProject.getState();

                assert.deepStrictEqual(state, {
                    "version": "0.0.1",
                    "description": "SAMPLE PROJECT",
                    "objlib": "&OBJLIB",
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
                    "description": "NEW SAMPLE PROJECT"
                });
                const state = await iProject.getState();

                assert.deepStrictEqual(state, {
                    "version": "0.0.2",
                    "description": "NEW SAMPLE PROJECT"
                });
            }
        },
        {
            name: `Test getUnresolvedState`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const unresolvedState = await iProject.getUnresolvedState();

                assert.deepStrictEqual(unresolvedState, iProjectMock);
            }
        },
        {
            name: `Test addToIncludePaths`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.addToIncludePaths('includes');
                await iProject.addToIncludePaths(deployLocation);
                await iProject.addToIncludePaths(path.parse(deployLocation).dir);
                await iProject.addToIncludePaths('/some/path');
                const state1 = await iProject.getState();
                const unresolvedState1 = await iProject.getUnresolvedState();
                await iProject.updateIProj({
                    "version": "0.0.2"
                });
                await iProject.addToIncludePaths('/some/path');
                const state2 = await iProject.getState();
                const unresolvedState2 = await iProject.getUnresolvedState();

                assert.deepStrictEqual(state1?.includePath, ['includes', 'QPROTOSRC', 'PATH1', '&path2', deployLocation, path.parse(deployLocation).dir, '/some/path']);
                assert.deepStrictEqual(unresolvedState1?.includePath, ['includes', 'QPROTOSRC', '&path1', '&path2', deployLocation, path.parse(deployLocation).dir, '/some/path']);
                assert.deepStrictEqual(state2?.includePath, ['/some/path']);
                assert.deepStrictEqual(unresolvedState2?.includePath, ['/some/path']);
            }
        },
        {
            name: `Test configureAsVariable`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.updateIProj({
                    "version": "0.0.2",
                    "includePath": ["path1"],
                    "preUsrlibl": ["SYSTOOLS"],
                    "postUsrlibl": ["QSYSINC"]
                });
                await iProject.configureAsVariable('includePath', 'path', '/some/path');
                await iProject.configureAsVariable('includePath', 'path1', 'path1',);
                await iProject.configureAsVariable('preUsrlibl', 'lib1', 'SYSTOOLS');
                await iProject.configureAsVariable('postUsrlibl', 'lib2', 'QSYSINC');
                const state = await iProject.getState();
                const unresolvedState = await iProject.getUnresolvedState();

                assert.deepStrictEqual(state, {
                    "version": "0.0.2",
                    "includePath": ["path1"],
                    "preUsrlibl": ["SYSTOOLS"],
                    "postUsrlibl": ["QSYSINC"]
                });
                assert.deepStrictEqual(unresolvedState, {
                    "version": "0.0.2",
                    "includePath": ["&path1"],
                    "preUsrlibl": ["&lib1"],
                    "postUsrlibl": ["&lib2"]
                });
            }
        },
        {
            name: `Test removeFromIncludePaths`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.removeFromIncludePaths('includes');
                await iProject.removeFromIncludePaths('&path1');
                await iProject.removeFromIncludePaths('/some/path');
                const state = await iProject.getState();
                const unresolvedState = await iProject.getUnresolvedState();

                assert.deepStrictEqual(state?.includePath, ['QPROTOSRC', '&path2']);
                assert.deepStrictEqual(unresolvedState?.includePath, ['QPROTOSRC', '&path2']);
            }
        },
        {
            name: `Test moveIncludePath`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.moveIncludePath('includes', 'up');
                await iProject.moveIncludePath('&path2', 'down');
                await iProject.moveIncludePath('/some/path', 'down');
                const state1 = await iProject.getState();
                const unresolvedState1 = await iProject.getUnresolvedState();
                await iProject.moveIncludePath('includes', 'down');
                await iProject.moveIncludePath('&path2', 'up');
                const state2 = await iProject.getState();
                const unresolvedState2 = await iProject.getUnresolvedState();

                assert.deepStrictEqual(state1?.includePath, ['includes', 'QPROTOSRC', 'PATH1', '&path2']);
                assert.deepStrictEqual(unresolvedState1?.includePath, ['includes', 'QPROTOSRC', '&path1', '&path2']);
                assert.deepStrictEqual(state2?.includePath, ['QPROTOSRC', 'includes', '&path2', 'PATH1']);
                assert.deepStrictEqual(unresolvedState2?.includePath, ['QPROTOSRC', 'includes', '&path2', '&path1']);
            }
        },
        {
            name: `Test setAsTargetLibraryForCompiles`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setAsTargetLibraryForCompiles('MYLIB1');
                const state1 = await iProject.getState();
                const unresolvedState1 = await iProject.getUnresolvedState();
                await iProject.updateIProj({
                    "version": "0.0.2"
                });
                await iProject.setAsTargetLibraryForCompiles('MYLIB2');
                const state2 = await iProject.getState();
                const unresolvedState2 = await iProject.getUnresolvedState();

                assert.strictEqual(state1?.objlib, 'MYLIB1');
                assert.strictEqual(unresolvedState1?.objlib, '&OBJLIB');
                assert.strictEqual(state2?.objlib, 'MYLIB2');
                assert.strictEqual(unresolvedState2?.objlib, '&OBJLIB');
            }
        },
        {
            name: `Test setTargetLibraryForCompiles`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setTargetLibraryForCompiles('MYLIB', 'OBJLIB2', iProject.workspaceFolder.uri);
                const unresolvedIBMiJson = await iProject.getUnresolvedIBMiJson(iProject.workspaceFolder.uri);
                const env = await iProject.getEnv();
                const env1 = iProject.resolveVariable('&OBJLIB2', env);

                assert.strictEqual(unresolvedIBMiJson?.build?.objlib, '&OBJLIB2');
                assert.strictEqual(env1, 'MYLIB');
            }
        },
        {
            name: `Test setTargetCCSIDForCompiles`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setTargetCCSIDForCompiles('37', iProject.workspaceFolder.uri);
                await iProject.setTargetCCSIDForCompiles('256', iProject.workspaceFolder.uri);
                const unresolvedIBMiJson = await iProject.getUnresolvedIBMiJson(iProject.workspaceFolder.uri);

                assert.strictEqual(unresolvedIBMiJson?.build?.tgtCcsid, '256');
            }
        },
        {
            name: `Test getLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const libraryList = (await iProject.getLibraryList())!;
                const lib1 = libraryList.find(lib => lib.libraryInfo.name === 'QGPL');
                const lib2 = libraryList.find(lib => lib.libraryInfo.name === 'SYSTOOLS');
                const lib3 = libraryList.find(lib => lib.libraryInfo.name === 'QSYSINC');

                assert.deepStrictEqual(lib1, {
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QGPL',
                        attribute: 'PROD',
                        text: 'General Purpose Library'
                    },
                    libraryType: 'CUR'
                });
                assert.deepStrictEqual(lib2, {
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'SYSTOOLS',
                        attribute: 'PROD',
                        text: 'System Library for DB2'
                    },
                    libraryType: 'USR'
                });
                assert.deepStrictEqual(lib3, {
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QSYSINC',
                        attribute: 'PROD',
                        text: ''
                    },
                    libraryType: 'USR'
                });
            }
        },
        {
            name: `Test updateLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                let libraryList = (await iProject.getLibraryList())!;
                await iProject.updateIProj({
                    "version": "0.0.2",
                    "curlib": "&CURLIB",
                });
                await iProject.updateLibraryList();
                libraryList = (await iProject.getLibraryList())!;
                const lib1 = libraryList.find(lib => lib.libraryInfo.name === 'QGPL');
                const lib2 = libraryList.find(lib => lib.libraryInfo.name === 'SYSTOOLS');
                const lib3 = libraryList.find(lib => lib.libraryInfo.name === 'QSYSINC');

                assert.deepStrictEqual(lib1, {
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QGPL',
                        attribute: 'PROD',
                        text: 'General Purpose Library'
                    },
                    libraryType: 'CUR'
                });
                assert.strictEqual(lib2, undefined);
                assert.strictEqual(lib3, undefined);
            }
        },
        {
            name: `Test setLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                iProject.setLibraryList([
                    {
                        libraryInfo: {
                            library: 'QSYS',
                            type: '*LIB',
                            name: 'MYLIB',
                            attribute: 'TEST',
                            text: 'Test Library'
                        },
                        libraryType: 'USR'
                    }
                ]);
                const libraryList = await iProject.getLibraryList();

                assert.strictEqual(libraryList?.length, 1);
            }
        },
        {
            name: `Test addToLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.addToLibraryList('SYSTOOLS', 'preUsrlibl');
                await iProject.addToLibraryList('QSYSINC', 'postUsrlibl');
                const state1 = await iProject.getState();
                const unresolvedState1 = await iProject.getUnresolvedState();
                await iProject.addToLibraryList('MYLIB1', 'preUsrlibl');
                await iProject.addToLibraryList('MYLIB2', 'postUsrlibl');
                const state2 = await iProject.getState();
                const unresolvedState2 = await iProject.getUnresolvedState();

                assert.deepStrictEqual(state1?.preUsrlibl, ['SYSTOOLS', '&lib2']);
                assert.deepStrictEqual(unresolvedState1?.preUsrlibl, ['&lib1', '&lib2']);
                assert.deepStrictEqual(state1?.postUsrlibl, ['QSYSINC', '&lib4']);
                assert.deepStrictEqual(unresolvedState1?.postUsrlibl, ['&lib3', '&lib4']);
                assert.deepStrictEqual(state2?.preUsrlibl, ['MYLIB1', 'SYSTOOLS', '&lib2']);
                assert.deepStrictEqual(unresolvedState2?.preUsrlibl, ['MYLIB1', '&lib1', '&lib2']);
                assert.deepStrictEqual(state2.postUsrlibl, ['QSYSINC', '&lib4', 'MYLIB2']);
                assert.deepStrictEqual(unresolvedState2.postUsrlibl, ['&lib3', '&lib4', 'MYLIB2']);
            }
        },
        {
            name: `Test setCurrentLibrary`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.setCurrentLibrary('MYLIB1');
                const state1 = await iProject.getState();
                const unresolvedState1 = await iProject.getUnresolvedState();
                await iProject.updateIProj({
                    "version": "0.0.2"
                });
                await iProject.setCurrentLibrary('MYLIB2');
                const state2 = await iProject.getState();
                const unresolvedState2 = await iProject.getUnresolvedState();

                assert.strictEqual(state1?.curlib, 'MYLIB1');
                assert.strictEqual(unresolvedState1?.curlib, '&CURLIB');
                assert.strictEqual(state2?.curlib, 'MYLIB2');
                assert.strictEqual(unresolvedState2?.curlib, '&CURLIB');
            }
        },
        {
            name: `Test removeFromLibraryList`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.removeFromLibraryList('QGPL', LibraryType.currentLibrary);
                await iProject.removeFromLibraryList('SYSTOOLS', LibraryType.preUserLibrary);
                await iProject.removeFromLibraryList('QSYSINC', LibraryType.postUserLibrary);
                await iProject.removeFromLibraryList('MYLIB1', LibraryType.preUserLibrary);
                await iProject.removeFromLibraryList('MYLIB2', LibraryType.postUserLibrary);
                const state = await iProject.getState();
                const unresolvedState = await iProject.getUnresolvedState();

                assert.strictEqual(state?.curlib, '&CURLIB');
                assert.strictEqual(unresolvedState?.curlib, '&CURLIB');
                assert.deepStrictEqual(state?.preUsrlibl, ['&lib1', '&lib2']);
                assert.deepStrictEqual(unresolvedState?.preUsrlibl, ['&lib1', '&lib2']);
                assert.deepStrictEqual(state.postUsrlibl, ['&lib3', '&lib4']);
                assert.deepStrictEqual(unresolvedState.postUsrlibl, ['&lib3', '&lib4']);
            }
        },
        {
            name: `Test moveLibrary`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.updateIProj({
                    "version": "0.0.2",
                    "preUsrlibl": ["MYLIB1", "MYLIB2"],
                    "postUsrlibl": ["MYLIB3", "MYLIB4"]
                });
                await iProject.moveLibrary('MYLIB1', LibraryType.preUserLibrary, 'up');
                await iProject.moveLibrary('MYLIB2', LibraryType.preUserLibrary, 'down');
                await iProject.moveLibrary('MYLIB3', LibraryType.postUserLibrary, 'up');
                await iProject.moveLibrary('MYLIB4', LibraryType.postUserLibrary, 'down');
                await iProject.moveLibrary('INVALID', LibraryType.preUserLibrary, 'up');
                await iProject.moveLibrary('INVALID', LibraryType.postUserLibrary, 'up');
                const state1 = await iProject.getState();
                await iProject.moveLibrary('MYLIB1', LibraryType.preUserLibrary, 'down');
                await iProject.moveLibrary('MYLIB3', LibraryType.postUserLibrary, 'down');
                const state2 = await iProject.getState();
                await iProject.moveLibrary('MYLIB1', LibraryType.preUserLibrary, 'up');
                await iProject.moveLibrary('MYLIB3', LibraryType.postUserLibrary, 'up');
                const state3 = await iProject.getState();

                assert.deepStrictEqual(state1, {
                    "version": "0.0.2",
                    "preUsrlibl": ["MYLIB1", "MYLIB2"],
                    "postUsrlibl": ["MYLIB3", "MYLIB4"]
                });
                assert.deepStrictEqual(state2, {
                    "version": "0.0.2",
                    "preUsrlibl": ["MYLIB2", "MYLIB1"],
                    "postUsrlibl": ["MYLIB4", "MYLIB3"]
                });
                assert.deepStrictEqual(state3, {
                    "version": "0.0.2",
                    "preUsrlibl": ["MYLIB1", "MYLIB2"],
                    "postUsrlibl": ["MYLIB3", "MYLIB4"]
                });
            }
        },
        {
            name: `Test createIProj`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.createIProj('NEW SAMPLE PROJECT');
                const state = await iProject.getState();

                assert.deepStrictEqual(state, {
                    "description": "NEW SAMPLE PROJECT"
                });
            }
        },
        {
            name: `Test updateIProj`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.updateIProj({
                    "version": "0.0.2",
                    "description": "NEW SAMPLE PROJECT"
                });
                const state = await iProject.getState();

                assert.deepStrictEqual(state, {
                    "version": "0.0.2",
                    "description": "NEW SAMPLE PROJECT"
                });
            }
        },
        {
            name: `Test createEnv`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.createEnv();
                const env = await iProject.getEnv();

                assert.deepStrictEqual(env, {
                    "OBJLIB": '',
                    "CURLIB": '',
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
                    "OBJLIB": '',
                    "CURLIB": 'QGPL',
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
            name: `Test updateEnv`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.updateEnv('var', 'VAR');
                await iProject.updateEnv('lib2', 'MYLIB');
                const env = await iProject.getEnv();

                assert.deepStrictEqual(env, {
                    "OBJLIB": '',
                    "CURLIB": 'QGPL',
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
            name: `Test getValidatorResult`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const validatorResult1 = iProject.getValidatorResult();
                const fileUri = iProject.getProjectFileUri('iproj.json');
                await workspace.fs.writeFile(fileUri, new TextEncoder().encode(
                    JSON.stringify({
                        "version": "0.0.2",
                        "description": ["SAMPLE PROJECT"]
                    }, null, 2)
                ));
                await iProject.updateState();
                const validatorResult2 = iProject.getValidatorResult();

                assert.strictEqual(validatorResult1, undefined);
                assert.ok(!validatorResult2?.valid);
            }
        },
        {
            name: `Test getVariables`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const variables = await iProject.getVariables();

                assert.deepStrictEqual(variables, ['CURLIB', 'OBJLIB', 'lib3', 'lib4', 'lib1', 'lib2', 'path1', 'path2']);
            }
        },
        {
            name: `Test getObjectLibraries`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const objLibs = await iProject.getObjectLibraries();

                assert.deepStrictEqual(objLibs, new Set(['&OBJLIB', '&CURLIB', '&lib1', '&lib2', '&lib3', '&lib4']));
            }
        },
        {
            name: `Test getDeployDir`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const deployDir = iProject.getDeployDir();

                assert.strictEqual(deployDir, deployLocation);
            }
        }
    ]
};
