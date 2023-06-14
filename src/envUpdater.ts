/*
 * (c) Copyright IBM Corp. 2023
 */

import { TextEncoder } from "util";
import { Uri, window, workspace } from "vscode";
import { EnvironmentVariables } from "./iproject";

export default async function envUpdater(envUri: Uri, variables: EnvironmentVariables) {
  try {
    const content = await workspace.fs.readFile(envUri);
    const text = content.toString();
    const eol = /\r\n/.test(text) ? `\r\n` : `\n`;
    let lines = text !== '' ? text.split(eol) : [];

    Object.keys(variables).forEach(varName => {
      const lineIndex = lines.findIndex(line => line.startsWith(varName + `=`));

      const newLine = `${varName}=${variables[varName]}`;

      if (lineIndex >= 0) {
        lines[lineIndex] = newLine;
      } else {
        lines.push(newLine);
      }
    });

    await workspace.fs.writeFile(envUri, new TextEncoder().encode(lines.join(eol)));
    return true;
  } catch (e) {
    window.showErrorMessage('Failed to update .env');
    return false;
  }
}