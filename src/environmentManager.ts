/*
 * (c) Copyright IBM Corp. 2023
 */

/**
 * Represents a manager for the environment in which the extension is running in.
 */
export namespace EnvironmentManager {
    /**
     * Checks if the extension is running Merlin.
     * 
     * @returns True if running in Merlin and false otherwise.
     */
    export function isInMerlin(): boolean {
        const { MACHINE_EXEC_PORT } = process.env;
        return MACHINE_EXEC_PORT !== undefined;
    }
}