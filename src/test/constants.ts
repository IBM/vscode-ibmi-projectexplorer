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
        "cmd": "crtclmod module(WDSCTEST/ORD100CA) srcstmf('ORD100C.CLLE') AUT() DBGVIEW(*ALL) OPTION(*EVENTF) TEXT('') TGTRLS()",
        "cmd_time": "2023-07-14-14.54.44.168562000",
        "msgs": [
            {
                "msgid": "CPCA081",
                "type": "COMPLETION",
                "severity": 20,
                "message_time": "2023-07-14-14.54.44.214251",
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

export const outputMock = '';