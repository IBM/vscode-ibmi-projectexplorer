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
                    label: '9/22/2023, 10:30:27 AM'
                });
            }
        },
        {
            name: `Test log`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const logTreeItem = (await jobLog?.getChildren(projectTreeItem)!)[0];
                const children = await jobLog?.getChildren(logTreeItem)!;

                assertTreeItem(children[0], {
                    label: 'PAR201.MODULE',
                    description: '/bob-recursive-example/QCLSRC/PAR201.CLLE'
                });
            }
        },
        {
            name: `Test object`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const logTreeItem = (await jobLog?.getChildren(projectTreeItem)!)[0];
                const objectTreeItem = (await jobLog?.getChildren(logTreeItem)!)[0];
                const children = await jobLog?.getChildren(objectTreeItem)!;

                assertTreeItem(children[0], {
                    label: "CRTCLMOD MODULE(bobtest/PAR201) SRCFILE(QTEMP/QSOURCE) SRCMBR(PAR201) AUT() DBGVIEW(*ALL) OPTIMIZE() OPTION(*EVENTF) TEXT(' ') TGTRLS() INCDIR('/bob-recursive-example/includes' '/bob-recursive-example/QPROTOSRC')",
                });
                assertTreeItem(children[1], {
                    label: '[00] CPF1124 - Job 948101/QUSER/QSQSRVR started on 09/22/23 at 10:26:57 in subsystem QSYSWRK in QSYS. Job entered system on 09/22/23 at 10:26:57.',
                    description: 'INFORMATIONAL (9/22/2023, 10:26:57 AM)',
                    iconPath: new ThemeIcon('info', new ThemeColor('joblog.severity.0'))
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