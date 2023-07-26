/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from "..";
import { CancellationTokenSource, ThemeColor, Uri, window, workspace } from "vscode";
import { DecorationProvider } from "../../views/projectExplorer/decorationProvider";
import { ProjectManager } from "../../projectManager";

let decorationProvider: DecorationProvider;
let cancellationTokenSource: CancellationTokenSource;

export const decorationProviderSuite: TestSuite = {
    name: `Decoration Provider Tests`,
    beforeAll: async () => {
        decorationProvider = new DecorationProvider();
        cancellationTokenSource = new CancellationTokenSource();
    },
    tests: [
        {
            name: `Test variables decoration`, test: async () => {
                const uri1 = Uri.parse(`variables:0`, true);
                const uri2 = Uri.parse(`variables:1`, true);
                const decoration1 = decorationProvider.provideFileDecoration(uri1, cancellationTokenSource.token);
                const decoration2 = decorationProvider.provideFileDecoration(uri2, cancellationTokenSource.token);

                assert.strictEqual(decoration1, undefined);
                assert.deepStrictEqual(decoration2, {
                    badge: uri2.path,
                    color: new ThemeColor('errorForeground')
                });
            }
        },
        {
            name: `Test variable decoration`, test: async () => {
                const uri1 = Uri.parse(`variable:resolved`, true);
                const uri2 = Uri.parse(`variable:unresolved`, true);
                const decoration1 = decorationProvider.provideFileDecoration(uri1, cancellationTokenSource.token);
                const decoration2 = decorationProvider.provideFileDecoration(uri2, cancellationTokenSource.token);

                assert.strictEqual(decoration1, undefined);
                assert.deepStrictEqual(decoration2, {
                    badge: '?',
                    color: new ThemeColor('errorForeground')
                });
            }
        },
        {
            name: `Test invalid decoration`, test: async () => {
                const iProjUri = ProjectManager.getProjects()[0].getProjectFileUri('iproj.json');
                const doc = await workspace.openTextDocument(iProjUri);
                await window.showTextDocument(doc);
                const uri = window.activeTextEditor?.document.uri;
                const decoration = decorationProvider.provideFileDecoration(uri!, cancellationTokenSource.token);

                assert.strictEqual(decoration, undefined);
            }
        }
    ]
};