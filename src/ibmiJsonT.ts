/*
 * (c) Copyright IBM Corp. 2023
 */

/**
 * Represents the state of project's `.ibmi.json` file.
 */
export interface IBMiJsonT {
    /**
     * Version
     */
    version?: string;

    /**
     * Build options
     */
    build?: BuildT;
}

/**
 * Represents build options.
 */
export interface BuildT {
    /**
     * Objects created by building source in this directory will be put into the `objlib` library.
     * If not specified, `*CURLIB` is used as the `objlib`.
     */
    objlib?: string;

    /**
     * Value of the `TGTCCSID` to be used when compiling source in this directory.
     * If not specified, `*JOB` is used as the `TGTCCSID`.
     */
    tgtCcsid?: string
}