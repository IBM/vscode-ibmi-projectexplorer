/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { escapeArray, isEscapeQuoted, stripEscapeFromQuotes, isQuoted, escapeQuoted } from "../../util";


export const utilSuite: TestSuite = {
    name: `Util Tests`,
    tests: [
        {
            name: `Test escQuotes and escArray`, test: async () => {
                assert.strictEqual(escapeQuoted('"abc"'), '\\"abc\\"');
                assert.strictEqual(escapeQuoted('a"b'),   'a"b');
                assert.strictEqual(escapeQuoted('a"'),    'a"');
                assert.strictEqual(escapeQuoted('"b'),    '"b');
                assert.strictEqual(escapeQuoted(''),      '');
                // Now test escArray()
                const arrayStr   = ['abc', '\"def\"', '', 'ghi', '\"@#$\"'];
                const escapedArr = ['abc', '\\"def\\"', '', 'ghi', '\\"@#$\\"'];
                assert.deepEqual(escapeArray(arrayStr), escapedArr);
            },
        },
        {
            name: `Test isQuoted`, test: async () => {
                assert.equal(isQuoted('\"abc\"'),  true);
                assert.equal(isQuoted('"abc"'),    true);
                assert.equal(isQuoted('abc'),      false);
                assert.equal(isQuoted(''),         false);
                assert.equal(isQuoted('"abc'),     false);
                assert.equal(isQuoted('abc"'),     false);
                assert.equal(isQuoted('\\"abc\\"'),false);
            },
        },
        {
            name: `Test stripEscapeFromQuotes`, test: async () => {
                assert.equal('\"abc\"', stripEscapeFromQuotes('\"abc\"'));
                assert.equal('"abc"', stripEscapeFromQuotes('"abc"'));
                assert.equal('abc', stripEscapeFromQuotes('abc'));
                assert.equal('\\"abc"', stripEscapeFromQuotes('\\"abc"'));
                assert.equal('abc\\"', stripEscapeFromQuotes('abc\\"'));
                assert.equal('"abc"', stripEscapeFromQuotes('\\"abc\\"'));
                assert.equal('\\"', stripEscapeFromQuotes('\\"'));
                assert.equal('""', stripEscapeFromQuotes('\\"\\"'));
                assert.equal('', stripEscapeFromQuotes(''));
            },
        },
        {
            name: `Test escapeQuoted`, test: async () => {
                assert.equal(escapeQuoted('\"abc\"'),       '\\"abc\\"');
                assert.equal(escapeQuoted('"abc"'),         '\\"abc\\"');
                assert.equal(escapeQuoted('abc'),           'abc');
                assert.equal(escapeQuoted(''),              '');
                assert.equal(escapeQuoted('\\"abc'),        '\\"abc');
                assert.equal(escapeQuoted('abc\\"'),        'abc\\"');
                assert.equal(escapeQuoted('\\"abc\\"'),     '\\"abc\\"');
            },
        },
        {
            name: `Test isEscapeQuoted`, test: async () => {
                assert.equal(false, isEscapeQuoted('\"abc\"'));
                assert.equal(false, isEscapeQuoted('"abc"'));
                assert.equal(false, isEscapeQuoted('abc'));
                assert.equal(false, isEscapeQuoted('\\"abc'));
                assert.equal(false, isEscapeQuoted('abc\\"'));
                assert.equal(true, isEscapeQuoted('\\"abc\\"'));
            },
        }
        
    ]
};