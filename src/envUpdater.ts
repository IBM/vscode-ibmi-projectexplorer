import { TextEncoder } from "util";
import { Uri, workspace } from "vscode";
import { EnvironmentVariables } from "./iproject";

export default async function envUpdater(envUri: Uri, variables: EnvironmentVariables) {
  const textDoc = await workspace.openTextDocument(envUri);
  const eol = textDoc.eol === 1 ? `\n` : `\r\n`;
  const text = textDoc.getText();

  let lines = text !== '' ? textDoc.getText().split(eol) : [];

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
}