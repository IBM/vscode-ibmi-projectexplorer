/*
 * (c) Copyright IBM Corp. 2023
 */

import { l10n } from "vscode";

/**
 * Represents an object in a `joblog.json` file.
 */
export interface ObjectInfo {
    cmd: string;
    cmd_time: string;
    object: string;
    source: string;
    output: string;
    failed: boolean;
    msgs?: (MessageInfo)[];
};

/**
 * Represents a message in a `joblog.json` file.
 */
export interface MessageInfo {
    msgid: string;
    type: string;
    severity: number;
    message_time: string;
    message_text: string;
    second_level: string;
    from_program: string;
    from_library: string;
    from_instruction: string;
    to_program: string;
    to_library: string;
    to_module: string;
    to_procedure: string;
    to_instruction: string;
};

/**
 * Represents the content of a single `joblog.json` file.
 */
export class JobLogInfo {
    objects: ObjectInfo[];
    createdTime: Date;
    showFailedObjects: boolean;
    severityLevel: number;

    constructor(objects: ObjectInfo[]) {
        this.objects = objects;
        this.createdTime = parseDateTime(objects[0].cmd_time); // Use the first object's run time as the created time.
        this.showFailedObjects = false;
        this.severityLevel = 0;
    }

    public static createFromToTextForMsgEntity(msg: MessageInfo) {
        const fromText = l10n.t('From: {0}/{1}:{2}', msg.from_library, msg.from_program, msg.from_instruction);
        const toText = l10n.t('To: {0}/{1}/{2}/{3}:{4}', msg.to_library, msg.to_module, msg.to_program, msg.to_procedure, msg.to_instruction);
        return `${fromText}\n${toText}`;
    }

    toggleShowFailedObjects() {
        this.showFailedObjects = this.showFailedObjects === false ? true : false;
    }

    setSeverityLevel(severityLevel: number) {
        this.severityLevel = severityLevel;
    }
}

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

/**
 * Convert the date time string outputted by db2 to a date object.
 * 
 * @param dateTime The string representation of the date time (ex. 2021-06-08-10.54.34.07141).
 * @returns A date object representing the date time.
 */
export function parseDateTime(dateTime: string): Date {
    try {
        const split1 = dateTime.split("-");
        assert(split1.length === 4);
        const year = Number(split1[0]);
        const month = Number(split1[1]) - 1;
        const day = Number(split1[2]);

        const split2 = split1[3].split(".");
        assert(split2.length >= 3);
        const hour = Number(split2[0]);
        const min = Number(split2[1]);
        const sec = split2.length === 3 ? Number(split2[2]) : Number(split2[2]) + Number(`0.${split2[3]}`);

        return new Date(year, month, day, hour, min, sec);
    } catch {
        throw Error(l10n.t('Cannot parse \"{0}\" as a date object', dateTime));
    }
}