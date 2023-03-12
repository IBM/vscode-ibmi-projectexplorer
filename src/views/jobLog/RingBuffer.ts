/*
 * Licensed Materials - Property of IBM
 *
 * 5900-AN9
 *
 * (c) Copyright IBM Corp. 2021
 */

export class RingBuffer<T> {
    private size: number;
    private start: number;
    private end: number;
    private buf: T[];

    constructor(size: number) {
        if (size < 0) {
            throw new RangeError;
        }
        this.size = size;
        this.start = 0;
        this.end = 0;
        this.buf = [];
    }

    public isFull() {
        return this.buf.length === this.size;
    }

    public isEmpty() {
        return !(this.isFull()) && (this.start === this.end);
    }

    private incPtr(ptr: number) {
        return (ptr + 1) % this.size;
    }

    public add(e: T) {
        if (this.isFull()) {
            this.start = this.incPtr(this.start);
        }
        this.buf[this.end] = e;
        this.end = this.incPtr(this.end);
    }

    public get(index: number) {
        if (index < 0) {
            index += this.buf.length;
        }

        if (index < 0) {
            return undefined;
        }

        return this.buf[(this.start + index) % this.size];
    }

    public toArray(): T[] {
        if (this.isEmpty()) {
            return [];
        }
        if (this.start < this.end) {
            return this.buf.slice(this.start, this.end);
        } else {
            return this.buf.slice(this.start).concat(this.buf.slice(0, this.end));
        }
    }

    public fromArray(arr: T[]) {
        if (this.size === 0) {
            return;
        }
        this.buf = arr.slice(-this.size);
        this.start = 0;
        this.end = this.buf.length % this.size;
    }

    public getSize() {
        return this.size;
    }

    public sort(fn: (a: T, b: T) => number) {
        this.buf.sort(fn);
        this.start = 0;
        this.end = this.buf.length % this.size;
    }
}