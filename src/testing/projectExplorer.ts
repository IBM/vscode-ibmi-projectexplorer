/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import { ProjectManager } from "../projectManager";
import * as path from "path";
import { Extension, TreeItem, Uri, extensions, workspace } from "vscode";
import { ProjectExplorerApi } from "../projectExplorerApi";
import ProjectExplorer from "../views/projectExplorer";
import { getDeploy, getInstance } from "../ibmi";
import { ProjectExplorerTreeItem } from "../views/projectExplorer/projectExplorerTreeItem";
import MemberFile from "../views/projectExplorer/memberFile";
import IFSDirectory from "../views/projectExplorer/ifsDirectory";

class File {
    readonly name: string;
    readonly content: string;
    localPath?: Uri;

    constructor(name: string, content: string) {
        this.name = name;
        this.content = content;
    }
}

type Folder = {
    name: string,
    folders?: Folder[],
    files?: File[],
    localPath?: Uri
};

const testFolder: Folder = {
    name: 'folder_1',
    folders: [
        {
            name: 'folder_11',
            files: [
                new File('file_111.txt', 'file_111'),
            ]
        }
    ],
    files: [
        new File('file_11.txt', 'file_11')
    ],
};

let baseExtension: Extension<ProjectExplorerApi> | undefined;
let projectExplorer: ProjectExplorer | undefined;
let deployLocation: string;

export const projectExplorerSuite: TestSuite = {
    name: `Project Explorer Tests`,
    beforeAll: async () => {
        baseExtension = (extensions ? extensions.getExtension<ProjectExplorerApi>(`IBM.vscode-ibmi-projectexplorer`) : undefined);
        projectExplorer = baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.projectExplorer : undefined;

        const iProject = ProjectManager.getProjects()[0];

        await iProject.createEnv();
        await iProject.updateEnv('curlib', 'QGPL');
        await iProject.updateEnv('lib1', 'SYSTOOLS');
        await iProject.updateEnv('lib3', 'QSYSINC');
        await iProject.updateEnv('path1', testFolder.name);

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

        await createFolder(iProject.workspaceFolder.uri, testFolder);

        const ibmi = getInstance();
        const storage = ibmi?.getStorage()!;
        const existingPaths = storage.getDeployment();
        deployLocation = ibmi!.getConnection().getTempRemote(iProject.getName());
        existingPaths[iProject.workspaceFolder.uri.fsPath] = deployLocation;
        await storage.setDeployment(existingPaths);
        const deploy = getDeploy()!;
        await deploy({ method: 'all', workspaceFolder: iProject.workspaceFolder, remotePath: deployLocation });
    },
    afterAll: async () => {
        const iProject = ProjectManager.getProjects()[0];
        await deleteFolder(iProject.workspaceFolder.uri, testFolder);
    },
    tests: [
        {
            name: `Test root`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const children = await projectExplorer!.getChildren();

                assertTreeItem(children[0], {
                    label: workspaceFolder.name,
                    description: 'SAMPLE PROJECT'
                });
            }
        },
        {
            name: `Test project`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const children = await projectExplorer?.getChildren(projectTreeItem)!;

                assertTreeItem(children[0], {
                    label: 'Source',
                    description: deployLocation
                });
                assertTreeItem(children[1], {
                    label: 'Variables'
                });
                assertTreeItem(children[2], {
                    label: 'Library List'
                });
                assertTreeItem(children[3], {
                    label: 'Object Libraries'
                });
                assertTreeItem(children[4], {
                    label: 'Include Paths'
                });
            }
        },
        {
            name: `Test source`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const sourceTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[0];
                const children = await projectExplorer?.getChildren(sourceTreeItem)!;
                const folder1 = children.find(child => child.label === testFolder.name)! as IFSDirectory;

                assertTreeItem(folder1, {
                    label: testFolder.name,
                    ifsDirectoryInfo: {
                        type: 'directory',
                        name: testFolder.name,
                        path: path.posix.join(deployLocation, testFolder.name),
                        size: folder1.ifsDirectoryInfo.size,
                        modified: folder1.ifsDirectoryInfo.modified,
                        owner: folder1.ifsDirectoryInfo.owner
                    }
                });
            }
        },
        {
            name: `Test IFS directory`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const sourceTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[0];
                const sourceChildren = await projectExplorer?.getChildren(sourceTreeItem)!;
                const folder1 = sourceChildren.find(child => child.label === testFolder.name)!;
                const children = await projectExplorer?.getChildren(folder1)! as any[];

                assertTreeItem(children[0], {
                    label: testFolder.files![0].name,
                    ifsFileInfo: {
                        type: 'streamfile',
                        name: testFolder.files![0].name,
                        path: path.posix.join(deployLocation, testFolder.name, testFolder.files![0].name),
                        size: children[0].ifsFileInfo.size,
                        modified: children[0].ifsFileInfo.modified,
                        owner: children[0].ifsFileInfo.owner
                    }
                });
                assertTreeItem(children[1], {
                    label: testFolder.folders![0].name,
                    ifsDirectoryInfo: {
                        type: 'directory',
                        name: testFolder.folders![0].name,
                        path: path.posix.join(deployLocation, testFolder.name, testFolder.folders![0].name),
                        size: children[1].ifsDirectoryInfo.size,
                        modified: children[1].ifsDirectoryInfo.modified,
                        owner: children[1].ifsDirectoryInfo.owner
                    }
                });
            }
        },
        {
            name: `Test variables`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const variablesTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[1];
                const children = await projectExplorer?.getChildren(variablesTreeItem)!;

                assertTreeItem(children[0], {
                    label: 'curlib',
                    description: 'QGPL'
                });
                assertTreeItem(children[1], {
                    label: 'objlib',
                    description: 'No value'
                });
                assertTreeItem(children[2], {
                    label: 'lib3',
                    description: 'QSYSINC'
                });
                assertTreeItem(children[3], {
                    label: 'lib4',
                    description: 'No value'
                });
                assertTreeItem(children[4], {
                    label: 'lib1',
                    description: 'SYSTOOLS'
                });
                assertTreeItem(children[5], {
                    label: 'lib2',
                    description: 'No value'
                });
                assertTreeItem(children[6], {
                    label: 'path1',
                    description: testFolder.name
                });
                assertTreeItem(children[7], {
                    label: 'path2',
                    description: 'No value'
                });
            }
        },
        {
            name: `Test library list`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const libraryListTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[2];
                const children = await projectExplorer?.getChildren(libraryListTreeItem)!;
                const currentLibraryTreeItem = children.find(child => child.label === 'QGPL')!;
                const preUserLibraryTreeItem = children.find(child => child.label === 'SYSTOOLS')!;
                const postUserLibraryTreeItem = children.find(child => child.label === 'QSYSINC')!;

                assertTreeItem(currentLibraryTreeItem, {
                    label: 'QGPL',
                    description: '&curlib - General Purpose Library (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QGPL',
                        attribute: 'PROD',
                        text: 'General Purpose Library'
                    }
                });
                assertTreeItem(preUserLibraryTreeItem, {
                    label: 'SYSTOOLS',
                    description: '&lib1 - System Library for DB2 (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'SYSTOOLS',
                        attribute: 'PROD',
                        text: 'System Library for DB2'
                    }
                });
                assertTreeItem(postUserLibraryTreeItem, {
                    label: 'QSYSINC',
                    description: '&lib3 - (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QSYSINC',
                        attribute: 'PROD',
                        text: ''
                    }
                });
            }
        },
        {
            name: `Test library`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const libraryListTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[2];
                const libraryListChildren = await projectExplorer?.getChildren(libraryListTreeItem)!;
                const libraryTreeItem = libraryListChildren.find(child => child.label === 'QSYSINC')!;
                const children = await projectExplorer?.getChildren(libraryTreeItem)!;
                const objectFileTreeItem = children.find(child => child.label === 'H.FILE')!;

                assertTreeItem(objectFileTreeItem, {
                    label: 'H.FILE',
                    objectFileInfo: {
                        library: 'QSYSINC',
                        name: 'H',
                        type: '*FILE',
                        attribute: 'PF',
                        text: 'DATA BASE FILE FOR C INCLUDES'
                    }
                });
            }
        },
        {
            name: `Test object file`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const libraryListTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[2];
                const libraryListChildren = await projectExplorer?.getChildren(libraryListTreeItem)!;
                const libraryTreeItem = libraryListChildren.find(child => child.label === 'QSYSINC')!;
                const libraryChildren = await projectExplorer?.getChildren(libraryTreeItem)!;
                const objectFileTreeItem = libraryChildren.find(child => child.label === 'H.FILE')!;
                const children = await projectExplorer?.getChildren(objectFileTreeItem)!;
                const memberFileTreeItem = children.find(child => child.label === 'MATH.C')! as MemberFile;

                assertTreeItem(memberFileTreeItem, {
                    label: 'MATH.C',
                    memberFileInfo: {
                        asp: undefined,
                        library: 'QSYSINC',
                        file: 'H',
                        name: 'MATH',
                        extension: 'C',
                        recordLength: 80,
                        text: 'STANDARD HEADER FILE MATH',
                        lines: 606,
                        created: memberFileTreeItem.memberFileInfo.created,
                        changed: memberFileTreeItem.memberFileInfo.changed,
                    }
                });
            }
        },
        {
            name: `Test object libraries`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const objectLibrariesTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[3];
                const children = await projectExplorer?.getChildren(objectLibrariesTreeItem)!;

                assertTreeItem(children[0], {
                    label: 'QGPL',
                    description: '&curlib - General Purpose Library (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QGPL',
                        attribute: 'PROD',
                        text: 'General Purpose Library'
                    }
                });
                assertTreeItem(children[1], {
                    label: 'SYSTOOLS',
                    description: '&lib1 - System Library for DB2 (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'SYSTOOLS',
                        attribute: 'PROD',
                        text: 'System Library for DB2'
                    }
                });
                assertTreeItem(children[2], {
                    label: '&lib2',
                    description: 'Not specified'
                });
                assertTreeItem(children[3], {
                    label: 'QSYSINC',
                    description: '&lib3 - (PROD)',
                    libraryInfo: {
                        library: 'QSYS',
                        type: '*LIB',
                        name: 'QSYSINC',
                        attribute: 'PROD',
                        text: ''
                    }
                });
                assertTreeItem(children[4], {
                    label: '&lib4',
                    description: 'Not specified'
                });
                assertTreeItem(children[5], {
                    label: '&objlib',
                    description: 'Not specified'
                });
            }
        },
        {
            name: `Test include paths`, test: async () => {
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const includePathsTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[4];
                const children = await projectExplorer?.getChildren(includePathsTreeItem)!;


                assertTreeItem(children[0], {
                    label: 'includes'
                });
                assertTreeItem(children[1], {
                    label: 'QPROTOSRC'
                });
                assertTreeItem(children[2], {
                    label: testFolder.name,
                    description: '&path1'
                });
                assertTreeItem(children[3], {
                    label: '&path2',
                    description: 'Not specified'
                });
            }
        },
        {
            name: `Test remote include path`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await deleteFolder(iProject.workspaceFolder.uri, testFolder);
                const projectTreeItem = (await projectExplorer!.getChildren())[0];
                const includePathsTreeItem = (await projectExplorer?.getChildren(projectTreeItem)!)[4];
                const includePathsChildren = await projectExplorer?.getChildren(includePathsTreeItem)!;
                const remoteIncludePathTreeItem = includePathsChildren.find(child => child.label === testFolder.name)!;
                const children = await projectExplorer?.getChildren(remoteIncludePathTreeItem)! as any[];

                assertTreeItem(children[0], {
                    label: testFolder.files![0].name,
                    ifsFileInfo: {
                        type: 'streamfile',
                        name: testFolder.files![0].name,
                        path: path.posix.join(deployLocation, testFolder.name, testFolder.files![0].name),
                        size: children[0].ifsFileInfo.size,
                        modified: children[0].ifsFileInfo.modified,
                        owner: children[0].ifsFileInfo.owner
                    }
                });
                assertTreeItem(children[1], {
                    label: testFolder.folders![0].name,
                    ifsDirectoryInfo: {
                        type: 'directory',
                        name: testFolder.folders![0].name,
                        path: path.posix.join(deployLocation, testFolder.name, testFolder.folders![0].name),
                        size: children[1].ifsDirectoryInfo.size,
                        modified: children[1].ifsDirectoryInfo.modified,
                        owner: children[1].ifsDirectoryInfo.owner
                    }
                });
            }
        }
    ]
};

function assertTreeItem(treeItem: ProjectExplorerTreeItem, attributes: { [key: string]: any }) {
    for (const [key, value] of (Object.entries(attributes))) {
        assert.deepStrictEqual(treeItem[key as keyof TreeItem], value);
    }
}

async function createFolder(parent: Uri, folder: Folder) {
    folder.localPath = Uri.joinPath(parent, folder.name);
    await workspace.fs.createDirectory(folder.localPath);

    for await (const file of folder.files || []) {
        await createFile(folder.localPath!, file);
    }

    for await (const childFolder of folder.folders || []) {
        await createFolder(folder.localPath!, childFolder);
    }
}

async function createFile(folder: Uri, file: File): Promise<void> {
    file.localPath = Uri.joinPath(folder, file.name);
    await workspace.fs.writeFile(file.localPath, Buffer.from(file.content));
}

async function deleteFolder(parent: Uri, folder: Folder) {
    folder.localPath = Uri.joinPath(parent, folder.name);
    await workspace.fs.delete(folder.localPath, { recursive: true });
}