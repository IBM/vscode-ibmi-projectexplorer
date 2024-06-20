/*
 * (c) Copyright IBM Corp. 2024
 */

import { Extension, extensions } from "vscode";

let baseExtension: Extension<any> | undefined;

export async function sourceOrbitEnabled(): Promise<boolean> {
  if (!baseExtension) {
    baseExtension = (extensions ? extensions.getExtension(`IBM.vscode-sourceorbit`) : undefined);
  }

  if (baseExtension && !baseExtension.isActive) {
    await baseExtension.activate();
  }

  // Source Orbit extension does not have an accessible API. We just want to know if we have it installed or not.
  return (baseExtension && baseExtension.isActive ? true : false);
}