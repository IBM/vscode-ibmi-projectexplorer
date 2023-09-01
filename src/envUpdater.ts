/*
 * (c) Copyright IBM Corp. 2023
 */

import { TextEncoder } from "util";
import { Uri, l10n, window, workspace } from "vscode";
import { EnvironmentVariables } from "./iproject";

/**
 * Update the environment variables in a `.env` file. *Note* that if the
 * file does not exist, it will be created with all the given environment
 * variables.
 * 
 * @param envUri The uri of a `.env` file.
 * @param variables The environment variables to update.
 * @returns True if the operation was successful and false otherwise.
 */
export default async function envUpdater(envUri: Uri, variables: EnvironmentVariables): Promise<boolean> {
  let text = '';
  try {
    const content = await workspace.fs.readFile(envUri);
    text = content.toString();
  } catch (e) { }

  try {
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
    window.showErrorMessage(l10n.t('Failed to update .env'));
    return false;
  }
}