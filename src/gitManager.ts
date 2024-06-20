/*
 * (c) Copyright IBM Corp. 2023
 */

import { ExtensionContext, WorkspaceFolder, commands, extensions, l10n, window } from "vscode";
import { API, APIState, GitExtension, Repository } from "./import/git";
import ProjectExplorer from "./views/projectExplorer";
import { getInstance } from "./ibmi";
import IBMi from "@halcyontech/vscode-ibmi-types/api/IBMi";
import { str } from "crc-32/crc32c";

export namespace GitManager {
    let gitLookedUp: boolean;
    let gitApi: API | undefined;
    let projectExplorer: ProjectExplorer;
    const lastBranch: { [workspaceUri: string]: { host?: string, user?: string, branch: string } } = {};

    export function initialize(context: ExtensionContext, explorer: ProjectExplorer) {
        projectExplorer = explorer;

        const gitApi = getGitApi();
        if (gitApi) {
            context.subscriptions.push(
                gitApi.onDidChangeState((state: APIState) => {
                    projectExplorer.refresh();
                }),

                gitApi.onDidOpenRepository((repo) => {
                    const changeEvent = repo.state.onDidChange(async () => {
                        validateBranchLibrary(repo);
                    });

                    context.subscriptions.push(changeEvent);
                })
            );

            const ibmi = getInstance();
            ibmi?.onEvent(`connected`, () => {
                for (const repo of gitApi.repositories) {
                    validateBranchLibrary(repo);
                }
            });
            ibmi?.onEvent(`disconnected`, () => {
                for (const workspaceUri of Object.keys(lastBranch)) {
                    lastBranch[workspaceUri] = {
                        host: undefined,
                        user: undefined,
                        branch: lastBranch[workspaceUri].branch
                    };
                }
            });
        }
    }

    export function getGitApi(): API | undefined {
        if (!gitLookedUp) {
            try {
                gitApi = extensions.getExtension<GitExtension>(`vscode.git`)?.exports.getAPI(1);

            } catch (error) {
                console.log(`Failed to load Git API`, error);
            } finally {
                gitLookedUp = true;
            }
        }

        return gitApi;
    }

    export function getBranchLibraryName(currentBranch: string) {
        return `VS${(str(currentBranch, 0) >>> 0).toString(16).toUpperCase()}`;
    }

    export function isGitApiInitialized(): boolean {
        if (gitApi) {
            return gitApi.state === 'initialized';
        }

        return false;
    }

    export function getRepository(workspaceFolder: WorkspaceFolder): Repository | null | undefined {
        if (gitApi) {
            return gitApi.getRepository(workspaceFolder.uri);
        }
    }

    export async function initializeGitRepository(workspaceFolder: WorkspaceFolder): Promise<boolean> {
        if (gitApi) {
            await gitApi?.init(workspaceFolder.uri);
            return true;
        }

        return false;
    }

    function validateBranchLibrary(repo: Repository) {
        const instance = getInstance();
        const connection = instance!.getConnection();

        const head = repo.state.HEAD;
        if (head && head.name) {
            const currentHost = connection?.currentHost;
            const currentUser = connection?.currentUser
            const currentBranch = head.name;

            const workspaceUri = repo.rootUri.toString();
            if (connection &&
                currentBranch &&
                (!lastBranch[workspaceUri] ||
                    currentHost !== lastBranch[workspaceUri].host ||
                    currentUser !== lastBranch[workspaceUri].user ||
                    currentBranch !== lastBranch[workspaceUri].branch)) {
                setupBranchLibrary(currentBranch, false);
            }

            lastBranch[workspaceUri] = {
                host: currentHost,
                user: currentUser,
                branch: currentBranch
            };
        }
    }

    export function setupBranchLibrary(currentBranch: string, forceCreate: boolean, library?: string) {
        const ibmi = getInstance();
        const connection = ibmi?.getConnection();
        const content = ibmi?.getContent();

        if (connection && content) {
            const newBranchLibrary = library || getBranchLibraryName(currentBranch);
            content.checkObject({ library: `QSYS`, name: newBranchLibrary, type: `*LIB` }).then(libraryExists => {
                if (!libraryExists) {
                    if (forceCreate) {
                        createBranchLibrary(connection, currentBranch, newBranchLibrary);
                    } else {
                        window.showInformationMessage(l10n.t('Would you like to create a new library {0} for this branch?', newBranchLibrary), l10n.t('Yes'), l10n.t('No')).then(answer => {
                            if (answer === l10n.t('Yes')) {
                                createBranchLibrary(connection, currentBranch, newBranchLibrary);
                            }
                        });
                    }
                }
            });
        } else {
            window.showErrorMessage(l10n.t('Please connect to an IBM i'));
        }
    }

    function createBranchLibrary(connection: IBMi, branch: string, library: string) {
        const escapedText = branch.replace(/'/g, `''`);
        connection.runCommand({ command: `CRTLIB LIB(${library}) TEXT('${escapedText}') TYPE(*TEST)`, noLibList: true }).then(createResult => {
            if (createResult && createResult.code === 0) {
                window.showInformationMessage(l10n.t('Created {0} {1}. Use {2} as a reference to it.', library, '*LIB', '&BRANCH'));
                projectExplorer.refresh();
            } else {
                window.showErrorMessage(l10n.t('Error creating library! {0}', createResult.stderr));
            }
        });
    }
}