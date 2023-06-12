/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import { ProjectManager } from "../projectManager";
import IncludePaths from "../views/projectExplorer/includePaths";
import { TreeItem, workspace } from "vscode";
import Project from "../views/projectExplorer/project";
import { getInstance } from "../ibmi";
import IFSDirectory from "../views/projectExplorer/ifsDirectory";
import Variable from "../views/projectExplorer/variable";
import Variables from "../views/projectExplorer/variables";
import RemoteIncludePath from "../views/projectExplorer/remoteIncludePath";
import LibraryList from "../views/projectExplorer/libraryList";
import Library, { LibraryType } from "../views/projectExplorer/library";
import ObjectFile from "../views/projectExplorer/objectFile";
import ObjectLibraries from "../views/projectExplorer/objectlibraries";
import ErrorItem from "../views/projectExplorer/errorItem";
import Source from "../views/projectExplorer/source";

export const treeItemsSuite: TestSuite = {
    name: `Tree Items Tests`,
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
            name: `Test project`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;
                const state = await iProject.getState()!;

                const project = new Project(workspaceFolder, state?.description);
                const children = await project.getChildren();

                assert.strictEqual(children[0].label, "Source");
                assert.strictEqual(children[1].label, "Variables");
                assert.strictEqual(children[2].label, "Library List");
                assert.strictEqual(children[3].label, "Object Libraries");
                assert.strictEqual(children[4].label, "Include Paths");

            }
        },
        {
            name: `Test source`, test: async () => {
                
                const workspaceFolder = workspace.workspaceFolders![0];

                const source = new Source(workspaceFolder, "/QOpenSys/pkgs/bin");

                const children = await source.getChildren();
                const childrenNames = children.map(child => child.label);

                assert.ok(childrenNames.includes("git"));
            }
        },
        {
            name: `Test IFS directory`, test: async () => {

                const workspaceFolder = workspace.workspaceFolders![0];

                const ifsDirectory = new IFSDirectory(workspaceFolder, {type: "directory", name: "bin", path: "/QOpenSys/pkgs/bin"});

                const children = await ifsDirectory.getChildren();
                const childrenNames = children.map(child => child.label);

                assert.ok(childrenNames.includes("git"));

            }
        },
        {
            name: `Test variables`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];

                const variables = new Variables(workspaceFolder, 4);
                const variablesChildren = await variables!.getChildren();

                const noValue = "No value";
                // CHeck the description too
                // Order 
                //      curlib,
                //      objlib,
                //      postUsrlibl
                //      preUsrlibl
                //      includePath
              
                assert.strictEqual(variablesChildren[0].label, "curlib");
                assert.strictEqual(variablesChildren[0].description, "QGPL");

                assert.strictEqual(variablesChildren[1].label, "objlib");
                assert.strictEqual(variablesChildren[1].description, noValue);

                assert.strictEqual(variablesChildren[2].label, "lib3");
                assert.strictEqual(variablesChildren[2].description, "QSYSINC"); 
                
                assert.strictEqual(variablesChildren[3].label, "lib4");
                assert.strictEqual(variablesChildren[3].description, noValue); 

                assert.strictEqual(variablesChildren[4].label, "lib1");
                assert.strictEqual(variablesChildren[4].description, "SYSTOOLS"); 

                assert.strictEqual(variablesChildren[5].label, "lib2");
                assert.strictEqual(variablesChildren[5].description, noValue); 

                assert.strictEqual(variablesChildren[6].label, "path1");
                assert.strictEqual(variablesChildren[6].description, "PATH1"); 

                assert.strictEqual(variablesChildren[7].label, "path2");
                assert.strictEqual(variablesChildren[7].description, noValue); 
                
            }
        },
        {
            name: `Test library list`, test: async () => {

                const workspaceFolder = workspace.workspaceFolders![0];

                const libraryList = new LibraryList(workspaceFolder);
                const children = await libraryList.getChildren();

                assert.ok(children!.find(lib => (lib as Library).libraryInfo.name === 'QGPL' && (lib as Library).libraryType === LibraryType.currentLibrary));
                
                assert.ok(children!.find(lib => (lib as Library).libraryInfo.name === 'SYSTOOLS' && 
                        (
                            ((lib as Library).libraryType === LibraryType.preUserLibrary) ||
                            ((lib as Library).libraryType === LibraryType.defaultUserLibrary) ||
                            ((lib as Library).libraryType === LibraryType.postUserLibrary) 
                        )
                ));

                assert.ok(children!.find(lib => (lib as Library).libraryInfo.name === 'QSYSINC' && 
                        (
                            ((lib as Library).libraryType === LibraryType.preUserLibrary) ||
                            ((lib as Library).libraryType === LibraryType.defaultUserLibrary) ||
                            ((lib as Library).libraryType === LibraryType.postUserLibrary) 
                        )
                ));
            }
        },
        {
            name: `Test library`, test: async () => {
                
                const workspaceFolder = workspace.workspaceFolders![0];

                const library =
                    new Library(
                        workspaceFolder, 
                        {library: "QSYS", name: "QSYSINC", text: " ", type: "*LIB", attribute:"PROD"},
                        LibraryType.systemLibrary
                    );

                const children = await library.getChildren();
                const childrenNames = children.map(child => child.label);

                assert.ok(childrenNames.includes("MIH.FILE"));
                

                /// QSYS/QSYSINC/MIH.FILE (CHECK FOR NAME) like in test ifs directory
                // ibmiproject construct library tree item (hover over mih)

                /*
                {
                        library: "QSYS",
                        type: "*LIB",
                        name: "QSYSINC",
                        attribute: "PROD",
                        text: " ",
                }
                */
            }
        },
        {
            name: `Test object file`, test: async () => {

                const workspaceFolder = workspace.workspaceFolders![0];

                const objFile = 
                    new ObjectFile(
                        workspaceFolder,
                        {library: "QSYSINC", name: "H", text: "DATA BASE FILE FOR C INCLUDES", type: "*FILE", attribute: "PF"},
                        "/QSYS.LIB/QSYSINC.LIB/H.FILE"
                    );

                const children = await objFile.getChildren();
                const childrenNames = children.map(child => child.label);

                assert.ok(childrenNames.includes("MATH.C"));

                /// QSYS/QSYSINC/H.FILE/MATH.C (CHECK FOR NAME)
                // ibmiproject construct object file treeitem (hover over MATH.c)

                //"/QSYS.LIB/QSYSINC.LIB"
                /*
                {
                    library: "QSYSINC",
                    name: "H",
                    type: "*FILE",
                    attribute: "PF",
                    text: "DATA BASE FILE FOR C INCLUDES",
                }                
                */
            }
        },
        {
            name: `Test object libraries`, test: async () => {

                const workspaceFolder = workspace.workspaceFolders![0];
                const objectLibraries = new ObjectLibraries(workspaceFolder);

                const children = await objectLibraries.getChildren();

                const childLibrary = children
                    .map(child => (child as Library).variable!)
                    .filter(child => child !== undefined);

                const childErrorItem = children
                    .map(child => (child as ErrorItem).label)
                    .filter(child => (child as String).startsWith("&"));


                const names = [...childLibrary, ...childErrorItem];

                assert.deepStrictEqual(new Set(names), new Set(['&objlib', '&curlib', '&lib1', '&lib2', '&lib3', '&lib4']));
            }
        },
        {
            name: `Test include paths`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;
                const state = await iProject.getState()!;

                const project = new Project(workspaceFolder, state?.description);
                const projectChildren = await project.getChildren();

                const includePaths = projectChildren.find(child => child.label === "Include Paths");
                const includePathsChildren = await includePaths!.getChildren();
                
                assert.strictEqual(includePathsChildren[0].label, "includes");
                assert.strictEqual(includePathsChildren[1].label, "QPROTOSRC");
                assert.strictEqual(includePathsChildren[2].label, "PATH1");
                assert.strictEqual(includePathsChildren[3].label, "&path2");
            }
        },
        {
            name: `Test remote include path`, test: async () => {

                const workspaceFolder = workspace.workspaceFolders![0];
                const iProject = ProjectManager.get(workspaceFolder)!;

                const state = await iProject.getState();
                state?.includePath?.push("/QOpenSys/pkgs/bin");
                iProject.setState(state!);

                const remoteIncludeTreeItem = new RemoteIncludePath(workspaceFolder, state!.includePath![4], 'last');

                const includePathsChildren = await remoteIncludeTreeItem!.getChildren();

                const remotePath = includePathsChildren[2];
                const remotePathChildren = await remotePath.getChildren();

                assert.deepStrictEqual(remotePathChildren, []);
            }
        }
    ]
};
