/*
 * (c) Copyright IBM Corp. 2023
 */

import { IProjectT } from "../iProjectT";
import { IBMiJsonT } from "../ibmiJsonT";
import { CommandInfo } from "../jobLog";

export const iProjectMock: IProjectT = {
    "version": "0.0.1",
    "description": "SAMPLE PROJECT",
    "objlib": "&OBJLIB",
    "curlib": "&CURLIB",
    "includePath": ["includes", "QPROTOSRC", "&path1", "&path2"],
    "preUsrlibl": ["&lib1", "&lib2"],
    "postUsrlibl": ["&lib3", "&lib4"],
    "setIBMiEnvCmd": [],
    "extensions": new Map<string, object>([["vendor1", { "keyA": "&valueA" }], ["vendor2", { "keyB": "VALUEB" }]])
};

export const ibmiJsonMock: IBMiJsonT = {
    "version": "0.0.1",
    "build": {
        "objlib": "&OBJLIB",
        "tgtCcsid": "37"
    }
};

export const jobLogMock: CommandInfo[] = [
    {
        "cmd": "CRTCLMOD MODULE(bobtest/PAR201) SRCFILE(QTEMP/QSOURCE) SRCMBR(PAR201) AUT() DBGVIEW(*ALL) OPTIMIZE() OPTION(*EVENTF) TEXT(' ') TGTRLS() INCDIR('/bob-recursive-example/includes' '/bob-recursive-example/QPROTOSRC')",
        "cmd_time": "2023-09-22-10.30.27.709187",
        "msgs": [
            {
                "msgid": "CPF1124",
                "type": "INFORMATIONAL",
                "severity": 0,
                "message_time": "2023-09-22-10.26.57.234832",
                "message_text": "Job 948101/QUSER/QSQSRVR started on 09/22/23 at 10:26:57 in subsystem QSYSWRK in QSYS. Job entered system on 09/22/23 at 10:26:57.",
                "second_level": null,
                "from_program": "QWTPIIPP",
                "from_library": "QSYS",
                "from_instruction": "04CC",
                "to_program": "*EXT",
                "to_library": "CRTFRMSTMF",
                "to_module": "CRTFRMSTMF",
                "to_procedure": "CRTFRMSTMF",
                "to_instruction": "*N"
            },
            {
                "msgid": "CPC2198",
                "type": "COMPLETION",
                "severity": 20,
                "message_time": "2023-09-22-10.30.27.706913",
                "message_text": "Current library changed to BOBTEST.",
                "second_level": "&N Cause . . . . . :   The current library in the library list was changed to BOBTEST.",
                "from_program": "QLICHLLE",
                "from_library": "QSYS",
                "from_instruction": "01A3",
                "to_program": "QSQRUN4",
                "to_library": "QSYS",
                "to_module": "QSQCALLSP",
                "to_procedure": "CALLPROGRAM",
                "to_instruction": "44918"
            }
        ],
        "object": "PAR201.MODULE",
        "source": "/bob-recursive-example/QCLSRC/PAR201.CLLE",
        "output": "/bob-recursive-example/.logs/PAR201.splf",
        "failed": false
    }
];

export const outputMock = '';

export const splfMock = '';