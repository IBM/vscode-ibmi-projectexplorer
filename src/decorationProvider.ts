/*
 * (c) Copyright IBM Corp. 2023
 */

import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri, l10n } from "vscode";

/**
 * Decoration provider for the variable heading and variable tree items.
 */
export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        if (uri.scheme === 'variables') {
            // Variables tree item in project explorer
            if (parseInt(uri.path) > 0) {
                return {
                    badge: uri.path,
                    color: new ThemeColor('errorForeground'),
                    tooltip: l10n.t('{0} Unresolved Variable(s)', uri.path)
                };
            }
        } else if (uri.scheme === 'variableItem' && uri.path === 'unresolved') {
            // Variable tree item in project explorer
            return {
                badge: '?',
                color: new ThemeColor('errorForeground'),
                tooltip: l10n.t('Unresolved Variable')
            };
        } else if (uri.scheme === 'log') {
            // Log tree item in job log
            if (parseInt(uri.path) > 0) {
                return {
                    badge: uri.path,
                    tooltip: l10n.t('Message Severity Filter: {0}', uri.path)
                };
            }
        }
    }
}