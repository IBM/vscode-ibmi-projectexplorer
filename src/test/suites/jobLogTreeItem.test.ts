/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { ThemeColor, ThemeIcon, TreeItem, extensions, workspace } from "vscode";
import { ProjectManager } from "../../projectManager";
import { TextEncoder } from "util";
import JobLog from "../../views/jobLog";
import { IBMiProjectExplorer } from "../../ibmiProjectExplorer";
import { iProjectMock, jobLogMock, outputMock } from "../constants";
import { ProjectExplorerTreeItem } from "../../views/projectExplorer/projectExplorerTreeItem";

let jobLog: JobLog | undefined;

export const jobLogTreeItemSuite: TestSuite = {
    name: `Job Log Tree Item Tests`,
    beforeAll: async () => {
        const baseExtension = (extensions ? extensions.getExtension<IBMiProjectExplorer>(`IBM.vscode-ibmi-projectexplorer`) : undefined);
        jobLog = baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.jobLog : undefined;

        const iProject = ProjectManager.getProjects()[0];

        await iProject.updateIProj(iProjectMock);

        await workspace.fs.writeFile(iProject.getProjectFileUri('joblog.json'), new TextEncoder().encode(JSON.stringify(jobLogMock, null, 2)));
        await workspace.fs.writeFile(iProject.getProjectFileUri('output.log'), new TextEncoder().encode(JSON.stringify(outputMock, null, 2)));
        await iProject.clearJobLogs();
        await iProject.readJobLog();
    },
    tests: [
        {
            name: `Test root`, test: async () => {
                const workspaceFolder = workspace.workspaceFolders![0];
                const children = await jobLog!.getChildren();

                assertTreeItem(children[0], {
                    label: workspaceFolder.name,
                    description: 'SAMPLE PROJECT'
                });
            }
        },
        {
            name: `Test project`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const children = await jobLog?.getChildren(projectTreeItem)!;

                assertTreeItem(children[0], {
                    label: '7/14/2023, 2:54:44 PM'
                });
            }
        },
        {
            name: `Test log`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const logTreeItem = (await jobLog?.getChildren(projectTreeItem)!)[0];
                const children = await jobLog?.getChildren(logTreeItem)!;

                assertTreeItem(children[0], {
                    label: 'crtclmod module(WDSCTEST/ORD100CA) srcstmf(\'ORD100C.CLLE\') AUT() DBGVIEW(*ALL) OPTION(*EVENTF) TEXT(\'\') TGTRLS()',
                    description: '7/14/2023, 2:54:44 PM'
                });
            }
        },
        {
            name: `Test command`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const logTreeItem = (await jobLog?.getChildren(projectTreeItem)!)[0];
                const commandTreeItem = (await jobLog?.getChildren(logTreeItem)!)[0];
                const children = await jobLog?.getChildren(commandTreeItem)!;

                assertTreeItem(children[0], {
                    label: '[20] CPCA081 - Stream file copied to object.',
                    description: 'COMPLETION (7/14/2023, 2:54:44 PM)',
                    iconPath: new ThemeIcon('warning', new ThemeColor('joblog.severity.20'))
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