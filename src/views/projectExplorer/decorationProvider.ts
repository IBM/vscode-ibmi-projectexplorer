import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";

export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        if (uri.scheme === 'variables') {
            if (parseInt(uri.path) > 0) {
                return {
                    badge: uri.path,
                    color: new ThemeColor('errorForeground')
                };
            }
        } else if (uri.scheme === 'variable' && uri.path === 'unresolved') {
            return {
                badge: '?',
                color: new ThemeColor('errorForeground')
            };
        }
    }
}