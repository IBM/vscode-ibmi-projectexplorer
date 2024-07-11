
/*
 * (c) Copyright IBM Corp. 2024
 */

import { IBMiObject } from "@halcyontech/vscode-ibmi-types";
import * as assert from "assert";

/**
 * Testing utilities.
 */
export namespace testUtil {
    /**
     * Test `IBMiObject` from Code4i.
     */
    export function assertIBMiObject(actual: IBMiObject, expected: IBMiObject) {
        for (const [key, value] of (Object.entries(expected))) {
            // Ignore fields which will vary
            if (['changed', 'created', 'size', 'created_by'].includes(key)) {
                continue;
            }

            assert.deepStrictEqual(actual[key as keyof IBMiObject], value);
        }
    }
}