/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { util } from "../../util";

export const utilSuite: TestSuite = {
    name: `Util Tests`,
    tests: [
        {
            name: `Test escapeQuoted`, test: async () => {
                assert.strictEqual(util.escapeQuoted('"abc"'), '\\"abc\\"');
                assert.strictEqual(util.escapeQuoted('a"b'), 'a"b');
                assert.strictEqual(util.escapeQuoted('a"'), 'a"');
                assert.strictEqual(util.escapeQuoted('"b'), '"b');
                assert.strictEqual(util.escapeQuoted(''), '');
            },
        },
        {
            name: `Test escapeArray`, test: async () => {
                const arrayStr = ['abc', '\"def\"', '', 'ghi', '\"@#$\"'];
                const escapedArr = ['abc', '\\"def\\"', '', 'ghi', '\\"@#$\\"'];
                assert.deepEqual(util.escapeArray(arrayStr), escapedArr);
            },
        },
        {
            name: `Test isQuoted`, test: async () => {
                assert.equal(util.isQuoted('\"abc\"'), true);
                assert.equal(util.isQuoted('"abc"'), true);
                assert.equal(util.isQuoted('abc'), false);
                assert.equal(util.isQuoted(''), false);
                assert.equal(util.isQuoted('"abc'), false);
                assert.equal(util.isQuoted('abc"'), false);
                assert.equal(util.isQuoted('\\"abc\\"'), false);
            },
        },
        {
            name: `Test stripEscapeFromQuotes`, test: async () => {
                assert.equal('\"abc\"', util.stripEscapeFromQuotes('\"abc\"'));
                assert.equal('"abc"', util.stripEscapeFromQuotes('"abc"'));
                assert.equal('abc', util.stripEscapeFromQuotes('abc'));
                assert.equal('\\"abc"', util.stripEscapeFromQuotes('\\"abc"'));
                assert.equal('abc\\"', util.stripEscapeFromQuotes('abc\\"'));
                assert.equal('"abc"', util.stripEscapeFromQuotes('\\"abc\\"'));
                assert.equal('\\"', util.stripEscapeFromQuotes('\\"'));
                assert.equal('""', util.stripEscapeFromQuotes('\\"\\"'));
                assert.equal('', util.stripEscapeFromQuotes(''));
            },
        },
        {
            name: `Test escapeQuoted`, test: async () => {
                assert.equal(util.escapeQuoted('\"abc\"'), '\\"abc\\"');
                assert.equal(util.escapeQuoted('"abc"'), '\\"abc\\"');
                assert.equal(util.escapeQuoted('abc'), 'abc');
                assert.equal(util.escapeQuoted(''), '');
                assert.equal(util.escapeQuoted('\\"abc'), '\\"abc');
                assert.equal(util.escapeQuoted('abc\\"'), 'abc\\"');
                assert.equal(util.escapeQuoted('\\"abc\\"'), '\\"abc\\"');
            },
        },
        {
            name: `Test isEscapeQuoted`, test: async () => {
                assert.equal(false, util.isEscapeQuoted('\"abc\"'));
                assert.equal(false, util.isEscapeQuoted('"abc"'));
                assert.equal(false, util.isEscapeQuoted('abc'));
                assert.equal(false, util.isEscapeQuoted('\\"abc'));
                assert.equal(false, util.isEscapeQuoted('abc\\"'));
                assert.equal(true, util.isEscapeQuoted('\\"abc\\"'));
            },
        }

    ]
};