/*
 * (c) Copyright IBM Corp. 2023
 */

import { getCustomUI, getInstance } from "../../ibmi";
import { ProgressLocation, Uri, l10n, window, workspace } from "vscode";
import { IBMiFile } from "@halcyontech/vscode-ibmi-types";
import { ProjectManager } from "../../projectManager";
import { ComplexTab, SelectItem } from "@halcyontech/vscode-ibmi-types/api/CustomUI";
import { IProject } from "../../iproject";
import * as path from "path";

/**
 * Represents the configuration for a migration.
 */
interface MigrationConfig {
    defaultCCSID: any;
    deployLocation: any;
    workspaceFolderUri: Uri;
    sourceFiles: string[];
}

/**
 * Represents the result of a migration.
 */
interface MigrationResult {
    numFiles: number,
    numSuccess: number,
    numFail: number,
    result: boolean
}

/**
 * Migrate all members in a set of source physical files of a library to IFS
 * files in the project's deploy location and then download all files to the
 * project's workspace folder.
 * 
 * @param iProject The IBM i project.
 * @param library The library to migrate.
 * @returns True if the operation was successful, false if the operation failed, 
 * or `undefined` if the migration was aborted.
 */
export async function migrateSource(iProject: IProject, library: string): Promise<boolean | undefined> {
    const migrationConfig = await getMigrationConfig(iProject, library);
    if (migrationConfig) {
        // Verify migration settings and source files
        const isMigrationConfigValid = verifyMigrationConfig(migrationConfig);
        if (!isMigrationConfigValid) {
            return;
        }

        // Verify makei is installed
        const ibmi = getInstance();
        const isCvtsrcpfInstalled = await ibmi?.getConnection().sendCommand({
            command: `ls -p /QOpenSys/pkgs/bin/makei`
        });
        if (isCvtsrcpfInstalled?.code !== 0 || isCvtsrcpfInstalled.stdout !== '/QOpenSys/pkgs/bin/makei') {
            window.showErrorMessage(l10n.t('Required component ({0}) to migrate source not installed on host IBM i. Run {1} to get it.', 'bob', '\'yum install bob\''));
            return;
        }

        // Create remote directory if it does not exist
        const mkdirResult = await ibmi?.getConnection().sendCommand({
            command: `mkdir -p ${migrationConfig.deployLocation}`
        });
        if (mkdirResult && mkdirResult.code !== 0) {
            window.showErrorMessage(mkdirResult.stderr);
            return;
        }

        let migrationResult: MigrationResult = {
            numFiles: migrationConfig.sourceFiles.length,
            numSuccess: 0,
            numFail: 0,
            result: true
        };
        await window.withProgress({
            location: ProgressLocation.Notification,
            title: l10n.t('Migrating Source'),
        }, async (progress) => {
            const increment = (1 / (migrationResult.numFiles + 1)) * 100;

            // Run cvtsrcpf on each source file
            for await (const file of migrationConfig.sourceFiles) {
                progress.report({ message: file, increment: increment });

                const result = await ibmi?.getConnection().sendCommand({
                    command: `export PATH="/QOpenSys/pkgs/bin:$PATH:" && /QOpenSys/pkgs/bin/makei cvtsrcpf ${migrationConfig.defaultCCSID ? `-c ${migrationConfig.defaultCCSID}` : ``} ${path.parse(file).name} ${library}`,
                    directory: migrationConfig.deployLocation
                });

                if (result?.code === 0) {
                    migrationResult.numSuccess++;
                } else {
                    migrationResult.numFail++;
                    migrationResult.result = false;
                }
            }

            // Download directory to workspace folder
            if (migrationResult.numSuccess > 0) {
                progress.report({ message: l10n.t('Downloading to workspace folder...'), increment: increment });
                try {
                    await ibmi?.getConnection().downloadDirectory(migrationConfig.workspaceFolderUri, migrationConfig.deployLocation);
                } catch (error) {
                    console.log(error);
                }
            }
        });

        // Set project's deploy location if it is not set or it changed
        const storage = ibmi?.getStorage()!;
        const existingPaths = storage.getDeployment();
        const currentDeployDir = existingPaths[migrationConfig.workspaceFolderUri.fsPath];
        if (!currentDeployDir || currentDeployDir !== migrationConfig.deployLocation) {
            existingPaths[migrationConfig.workspaceFolderUri.fsPath] = migrationConfig.deployLocation;
            await storage.setDeployment(existingPaths);
            ibmi?.fire('deployLocation');
        }

        // Add folder to workspace if it was downloaded to a new directory
        const isInWorkspace = workspace.getWorkspaceFolder(migrationConfig.workspaceFolderUri);
        if (!isInWorkspace) {
            const updateWorkspaceFolders = workspace.updateWorkspaceFolders(workspace.workspaceFolders ? workspace.workspaceFolders.length : 0, null, { uri: migrationConfig.workspaceFolderUri });
            if (!updateWorkspaceFolders) {
                window.showErrorMessage(l10n.t('Failed to add folder to workspace'));
            }
        }

        // Output migration result
        if (migrationResult.result) {
            window.showInformationMessage(l10n.t('Successfully migrated {0}/{1} source file(s)',
                migrationResult.numSuccess, migrationResult.numFiles));
        } else {
            window.showErrorMessage(l10n.t('Failed to migrate {0}/{1} source file(s)',
                migrationResult.numFail, migrationResult.numFiles), l10n.t('View log')).then(async choice => {
                    if (choice === l10n.t('View log')) {
                        ibmi?.getConnection().outputChannel?.show();
                    }
                });
        }

        return migrationResult.numSuccess > 0;
    }
}

/**
 * Get the migration configuration by retrieving the source physical files
 * in a library and prompting for the configuration parameters.
 * 
 * @param iProject The IBM i project.
 * @param library The library to migrate.
 * @returns The migration configuration.
 */
export async function getMigrationConfig(iProject: IProject, library: string): Promise<MigrationConfig | undefined> {
    let deployDir: string | undefined;
    let sourceFiles: IBMiFile[] | undefined;
    await window.withProgress({
        location: { viewId: `projectExplorer` },
        title: l10n.t('Migrating Source'),
    }, async () => {
        const ibmi = getInstance();
        sourceFiles = await ibmi?.getContent().getObjectList({ library: library, types: ['*SRCPF'] });
        deployDir = iProject.getDeployDir();

        if (!deployDir) {
            const ibmi = getInstance();
            const homeDirectory = (ibmi?.getConfig().homeDirectory.endsWith('/') ? ibmi?.getConfig().homeDirectory.slice(0, -1) : ibmi?.getConfig().homeDirectory);
            deployDir = homeDirectory ? path.posix.join(homeDirectory, iProject.getName()) : '';
        }
    });

    if (sourceFiles) {
        const customUI = getCustomUI();
        const settingsTab = getCustomUI();
        const sourceFilesTab = getCustomUI();
        if (customUI && settingsTab && sourceFilesTab) {
            const projects = ProjectManager.getProjects();

            const projectSelectItems: SelectItem[] = [{
                description: 'Add Folder to Workspace',
                value: 'addFolderToWorkspace',
                text: 'Select to add a new folder to the workspace'
            }];
            projects.forEach(project => {
                projectSelectItems.push({
                    description: project.getName(),
                    value: project.getName(),
                    text: project.workspaceFolder.uri.fsPath,
                    selected: iProject.getName() === project.getName()
                });
            });
            settingsTab
                .addInput(`srcLib`, l10n.t('Source Library'), l10n.t('The name of the library containing the source files to migrate.'), { default: library, readonly: true })
                .addInput(`defaultCCSID`, l10n.t('Default CCSID'), l10n.t('The CCSID to be used when the source file is 65535.'), { default: `*JOB`, minlength: 1 })
                .addSelect(`workspaceFolder`, l10n.t('Workspace folder'), projectSelectItems, l10n.t('The workspace folder to which the files are to be downloaded to once they are migrated to the project\'s deploy location.'))
                .addInput(`deployLocation`, l10n.t('Deploy Location'), l10n.t('The location in IFS to which the files are to be deployed to.'), { default: deployDir ? deployDir : ``, minlength: 1 });


            sourceFiles.forEach(srcPf => {
                const type = srcPf.type.startsWith(`*`) ? srcPf.type.substring(1) : srcPf.type;
                const srcPfLabel = `${srcPf.name}.${type}`;
                sourceFilesTab.addCheckbox(srcPfLabel, srcPfLabel, srcPf.text, true);
            });

            let tabs: ComplexTab[] = [
                { label: `Settings`, fields: settingsTab.fields },
                { label: `Source Files`, fields: sourceFilesTab.fields }
            ];

            const basePage = customUI
                .addHeading(l10n.t('Migrate Source'), 1)
                .addParagraph(l10n.t('Convert all members in source physical files of a library to IFS files in the project\'s deploy location and then download all files to a workspace folder. To learn more about {0}, click {1}here{2}.', '<code>cvtsrcpf</code>', '<a href="https://ibm.github.io/ibmi-bob/#/cli/makei?id=cvtsrcpf">', '</a>'))
                .addComplexTabs(tabs)
                .addHorizontalRule()
                .addButtons({ id: `migrate`, label: l10n.t('Migrate source'), requiresValidation: true });

            const page = await basePage.loadPage<any>(l10n.t('Migrate Source'));
            if (page && page.data) {
                page.panel.dispose();
                const data = page.data;
                delete data.buttons;
                delete data.srcLib;
                const defaultCCSID = data.defaultCCSID;
                delete data.defaultCCSID;
                const deployLocation = data.deployLocation;
                delete data.deployLocation;
                let workspaceFolderUri = data.workspaceFolder;
                delete data.workspaceFolder;

                const sourceFiles = Object.entries<boolean>(data)
                    .filter(sourceFile => sourceFile[1] === true)
                    .map(sourceFile => sourceFile[0]);

                if (workspaceFolderUri === 'addFolderToWorkspace') {
                    workspaceFolderUri = await window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        defaultUri: iProject.workspaceFolder.uri
                    });

                    if (workspaceFolderUri) {
                        workspaceFolderUri = workspaceFolderUri[0];
                    }
                } else {
                    workspaceFolderUri = ProjectManager.getProjectFromName(workspaceFolderUri)?.workspaceFolder.uri;
                }

                return {
                    defaultCCSID: defaultCCSID,
                    deployLocation: deployLocation,
                    workspaceFolderUri: workspaceFolderUri,
                    sourceFiles: sourceFiles
                };
            }
        }
    }
}

export function verifyMigrationConfig(migrationConfig: MigrationConfig) {
    if (!migrationConfig.deployLocation) {
        window.showErrorMessage(l10n.t('Deploy location not specified'));
        return false;
    }

    if (!migrationConfig.workspaceFolderUri) {
        window.showErrorMessage(l10n.t('Workspace folder not specified'));
        return false;
    }

    if (migrationConfig.sourceFiles.length <= 0) {
        window.showErrorMessage(l10n.t('No source files selected to be migrated'));
        return false;
    }

    return true;
}