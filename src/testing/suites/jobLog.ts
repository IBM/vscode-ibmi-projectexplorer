/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { workspace } from "vscode";
import { ProjectManager } from "../../projectManager";
import { TextEncoder } from "util";
import { JobLogInfo, parseDateTime } from "../../jobLog";
import { jobLogMock, outputMock } from "../constants";

export const jobLogSuite: TestSuite = {
    name: `Job Log Tests`,
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];
        await workspace.fs.writeFile(iProject.getProjectFileUri('joblog.json'), new TextEncoder().encode(JSON.stringify(jobLogMock, null, 2)));
        await workspace.fs.writeFile(iProject.getProjectFileUri('output.log'), new TextEncoder().encode(JSON.stringify(outputMock, null, 2)));
        await iProject.clearJobLogs();
        await iProject.readJobLog();
    },
    tests: [
        {
            name: `Test readJobLog`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.readJobLog();
                const jobLogs = iProject.getJobLogs();

                assert.strictEqual(jobLogs.length, 1);
                assert.deepStrictEqual(jobLogs[0], new JobLogInfo(jobLogMock));
            }
        },
        {
            name: `Test clearJobLogs`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await workspace.fs.delete(iProject.getProjectFileUri('joblog.json'));
                await iProject.clearJobLogs();
                const jobLogs = iProject.getJobLogs();

                assert.strictEqual(jobLogs.length, 0);
            }
        },
        {
            name: `Test parseDateTime`, test: async () => {
                const dateTime = parseDateTime(jobLogMock[0].cmd_time);

                assert.deepStrictEqual(dateTime, new Date(2023, 8, 22, 10, 30, 27));
                assert.throws(() => { parseDateTime('2021-12-12-21-30-34-07141'); });
                assert.throws(() => { parseDateTime(''); });
            }
        },
        {
            name: `Test createFromToTextForMsgEntity`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const jobLogs = iProject.getJobLogs();
                const fromToText = JobLogInfo.createFromToTextForMsgEntity(jobLogs[0].objects[0].msgs![0]);

                assert.strictEqual(fromToText, 'From: QSYS/QWTPIIPP:04CC\nTo: CRTFRMSTMF/CRTFRMSTMF/*EXT/CRTFRMSTMF:*N');
            }
        },
        {
            name: `Test toggleShowFailedObjects`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const jobLogs = iProject.getJobLogs();
                const showFailedObjectsPreToggle = jobLogs[0].showFailedObjects;
                jobLogs[0].toggleShowFailedObjects();
                const showFailedObjectsPostToggle = jobLogs[0].showFailedObjects;
                jobLogs[0].toggleShowFailedObjects();

                assert.ok(!showFailedObjectsPreToggle);
                assert.strictEqual(showFailedObjectsPreToggle, !showFailedObjectsPostToggle);
            }
        },
        {
            name: `Test setSeverityLevel`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                const jobLogs = iProject.getJobLogs();
                const severityLevelBefore = jobLogs[0].severityLevel;
                jobLogs[0].setSeverityLevel(50);
                const severityLevelAfter = jobLogs[0].severityLevel;
                jobLogs[0].setSeverityLevel(severityLevelBefore);

                assert.strictEqual(severityLevelBefore, 0);
                assert.strictEqual(severityLevelAfter, 50);
            }
        }
    ]
};