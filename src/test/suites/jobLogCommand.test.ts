/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import * as assert from "assert";
import { TestSuite } from "..";
import { commands, env, extensions, window, workspace } from "vscode";
import { ProjectManager } from "../../projectManager";
import { TextEncoder } from "util";
import JobLog from "../../views/jobLog";
import { IBMiProjectExplorer } from "../../ibmiProjectExplorer";
import { jobLogMock, outputMock } from "../constants";

let jobLog: JobLog | undefined;

export const jobLogCommandSuite: TestSuite = {
    name: `Job Log Command Tests`,
    beforeAll: async () => {
        const baseExtension = (extensions ? extensions.getExtension<IBMiProjectExplorer>(`IBM.vscode-ibmi-projectexplorer`) : undefined);
        jobLog = baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.jobLog : undefined;
    },
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];
        await workspace.fs.writeFile(iProject.getProjectFileUri('joblog.json'), new TextEncoder().encode(JSON.stringify(jobLogMock, null, 2)));
        await workspace.fs.writeFile(iProject.getProjectFileUri('output.log'), new TextEncoder().encode(JSON.stringify(outputMock, null, 2)));
        await iProject.clearJobLogs();
        await iProject.readJobLog();
    },
    tests: [
        {
            name: `Test showJobLog`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const projectTreeItem = (await jobLog!.getChildren())[0];
                await commands.executeCommand('vscode-ibmi-projectexplorer.jobLog.showJobLog', projectTreeItem);
                const activeFileUri = window.activeTextEditor?.document.uri;
                await commands.executeCommand("workbench.action.closeActiveEditor");

                assert.ok(activeFileUri?.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'joblog.json')));
            }
        },
        {
            name: `Test showBuildOutput`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const projectTreeItem = (await jobLog!.getChildren())[0];
                await commands.executeCommand('vscode-ibmi-projectexplorer.jobLog.showBuildOutput', projectTreeItem);
                const activeFileUri = window.activeTextEditor?.document.uri;
                await commands.executeCommand("workbench.action.closeActiveEditor");

                assert.ok(activeFileUri?.fsPath.endsWith(path.join(iProject.workspaceFolder.name, '.logs', 'output.log')));
            }
        },
        {
            name: `Test clearJobLogs`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const newJobLogContent = JSON.parse(JSON.stringify(jobLogMock));
                newJobLogContent[0].cmd_time = '2024-07-14-14.54.44.168562000';
                await workspace.fs.writeFile(iProject.getProjectFileUri('joblog.json'), new TextEncoder().encode(JSON.stringify(newJobLogContent, null, 2)));
                await iProject.readJobLog();
                const jobLogs1 = iProject.getJobLogs();
                const projectTreeItem = (await jobLog!.getChildren())[0];
                await commands.executeCommand('vscode-ibmi-projectexplorer.jobLog.clearJobLogs', projectTreeItem);
                const jobLogs2 = iProject.getJobLogs();

                assert.strictEqual(jobLogs1.length, 2);
                assert.strictEqual(jobLogs2.length, 1);
            }
        },
        {
            name: `Test copy`, test: async () => {
                const projectTreeItem = (await jobLog!.getChildren())[0];
                const logTreeItem = (await jobLog?.getChildren(projectTreeItem)!)[0];
                const commandTreeItem = (await jobLog?.getChildren(logTreeItem)!)[0];
                await commands.executeCommand('vscode-ibmi-projectexplorer.jobLog.copy', commandTreeItem);
                const copiedCommand = await env.clipboard.readText();

                assert.strict(copiedCommand, jobLogMock[0].cmd);
            }
        }
    ]
};