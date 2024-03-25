/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands } from "vscode";
import { EnvironmentManager } from "./environmentManager";

/**
 * Represents a manager for the custom context values used by the extension.
 */
export namespace ContextValueManager {
    /**
     * Initialize the custom context values.
     * 
     */
    export async function initialize() {
        const isInMerlin = EnvironmentManager.isInMerlin();
        if (isInMerlin) {
            await commands.executeCommand('setContext', 'vscode-ibmi-projectexplorer:isInMerlin', isInMerlin);
        }
    }
}