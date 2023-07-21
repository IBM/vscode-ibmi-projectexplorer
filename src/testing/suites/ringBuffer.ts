/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { RingBuffer } from "../../views/jobLog/RingBuffer";

let ringBuffer: RingBuffer<string>;

export const ringBufferSuite: TestSuite = {
    name: `Ring Buffer Tests`,
    beforeEach: async () => {
        ringBuffer = new RingBuffer(3);
    },
    tests: [
        {
            name: `Test isFull`, test: async () => {
                const isFull1 = ringBuffer.isFull();
                ringBuffer.fromArray(['A', 'B', 'C']);
                const isFull2 = ringBuffer.isFull();

                assert.ok(!isFull1);
                assert.ok(isFull2);
            }
        },
        {
            name: `Test isEmpty`, test: async () => {
                const isEmpty1 = ringBuffer.isEmpty();
                ringBuffer.fromArray(['A', 'B', 'C']);
                const isEmpty2 = ringBuffer.isEmpty();

                assert.ok(isEmpty1);
                assert.ok(!isEmpty2);
            }
        },
        {
            name: `Test add`, test: async () => {
                ringBuffer.fromArray(['A', 'B']);
                ringBuffer.add('C');
                const contents1 = ringBuffer.toArray();
                ringBuffer.add('D');
                const contents2 = ringBuffer.toArray();

                assert.deepStrictEqual(contents1, ['A', 'B', 'C']);
                assert.deepStrictEqual(contents2, ['B', 'C', 'D']);
            }
        },
        {
            name: `Test get`, test: async () => {
                const get1 = ringBuffer.get(-1);
                ringBuffer.fromArray(['A', 'B', 'C']);
                const get2 = ringBuffer.get(-1);
                const get3 = ringBuffer.get(0);
                const get4 = ringBuffer.get(2);
                const get5 = ringBuffer.get(3);

                assert.strictEqual(get1, undefined);
                assert.strictEqual(get2, 'C');
                assert.strictEqual(get3, 'A');
                assert.strictEqual(get4, 'C');
                assert.strictEqual(get5, 'A');
            }
        },
        {
            name: `Test toArray`, test: async () => {
                const contents1 = ringBuffer.toArray();
                ringBuffer.fromArray(['A', 'B', 'C']);
                const contents2 = ringBuffer.toArray();
                ringBuffer.add('D');
                const contents3 = ringBuffer.toArray();

                assert.deepStrictEqual(contents1, []);
                assert.deepStrictEqual(contents2, ['A', 'B', 'C']);
                assert.deepStrictEqual(contents3, ['B', 'C', 'D']);
            }
        },
        {
            name: `Test fromArray`, test: async () => {
                ringBuffer.fromArray(['A', 'B', 'C']);
                const contents1 = ringBuffer.toArray();
                ringBuffer.fromArray(['A', 'B', 'C', 'D']);
                const contents2 = ringBuffer.toArray();
                ringBuffer = new RingBuffer<string>(0);
                const result = ringBuffer.fromArray(['A']);

                assert.deepStrictEqual(contents1, ['A', 'B', 'C']);
                assert.deepStrictEqual(contents2, ['B', 'C', 'D']);
                assert.strictEqual(result, undefined);
            }
        },
        {
            name: `Test getSize`, test: async () => {
                const size = ringBuffer.getSize();

                assert.strictEqual(size, 3);
            }
        }
    ]
};