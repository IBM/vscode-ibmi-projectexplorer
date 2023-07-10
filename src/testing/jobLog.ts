/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import { workspace } from "vscode";
import { ProjectManager } from "../projectManager";
import { TextEncoder } from "util";
import { CommandInfo, JobLogInfo } from "../jobLog";

const jobLogContent: CommandInfo[] = [
    {
        "cmd": "crtclmod module(WDSCTEST/ORD100CA) srcstmf('ORD100C.CLLE') AUT() DBGVIEW(*ALL) OPTION(*EVENTF) TEXT('') TGTRLS()",
        "cmd_time": "2021-07-14-14.54.44.168562000",
        "msgs": [
            {
                "msgid": "CPCA081",
                "type": "COMPLETION",
                "severity": 20,
                "message_time": "2021-07-14-14.54.44.214251",
                "message_text": "Stream file copied to object.",
                "second_level": "&N Cause . . . . . :   Stream file /home/ECLIPSETEST/bob-recursive-example-master/QCLSRC/ORD100C.CLLE was successfully copied to object /QSYS.LIB/QTEMP.LIB/QCLTEMPSRC.FILE/ORD100C.MBR in CCSID (Coded Character Set Identifier) 37.",
                "from_program": "QDDCLF",
                "from_library": "QSYS",
                "from_instruction": "1555",
                "to_program": "CRTFRMSTMF",
                "to_library": "CRTFRMSTMF",
                "to_module": "CRTFRMSTMF",
                "to_procedure": "CRTFRMSTMF",
                "to_instruction": "272"
            }
        ]
    }
];
const outputContent = '';

export const jobLogSuite: TestSuite = {
    name: `Job Log Tests`,
    beforeAll: async () => {
        const iProject = ProjectManager.getProjects()[0];
        await workspace.fs.writeFile(iProject.getProjectFileUri('joblog.json'), new TextEncoder().encode(JSON.stringify(jobLogContent, null, 2)));
        await workspace.fs.writeFile(iProject.getProjectFileUri('output.log'), new TextEncoder().encode(JSON.stringify(outputContent, null, 2)));
        await iProject.clearJobLogs();
    },
    tests: [
        {
            name: `Test readJobLog`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await iProject.readJobLog();
                const jobLogs = iProject.getJobLogs();

                assert.strictEqual(jobLogs.length, 1);
                assert.deepStrictEqual(jobLogs[0], new JobLogInfo(jobLogContent));
            }
        },
        {
            name: `Test clearJobLogs`, test: async () => {
                const iProject = ProjectManager.getProjects()[0];
                await workspace.fs.delete(iProject.getProjectFileUri('joblog.json'));
                await iProject.clearJobLogs();
                const jobLog = iProject.getJobLogs();

                assert.strictEqual(jobLog.length, 0);
            }
        }
    ]
};