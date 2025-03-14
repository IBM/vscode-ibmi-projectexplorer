/*
 * (c) Copyright IBM Corp. 2023
 */

import { getCustomUI, getInstance } from "../../ibmi";
import { ProgressLocation, Uri, commands, l10n, window, workspace } from "vscode";
import { IBMiObject } from "@halcyontech/vscode-ibmi-types";
import { ProjectManager } from "../../projectManager";
import { ComplexTab, SelectItem } from "@halcyontech/vscode-ibmi-types/webviews/CustomUI";
import { IProject } from "../../iproject";
import * as path from "path";
import * as tar from "tar";
import * as fs from 'fs';
import { sourceOrbitEnabled } from "../../sourceOrbit";

/**
 * Represents the configuration for a migration.
 */
interface MigrationConfig {
    defaultCCSID: any;
    workspaceFolderUri: Uri | undefined;
    sourceFiles: string[];
    automaticRename: boolean;
    fixIncludes: boolean;
    importText: boolean;
    lower: boolean;
    generateBob: boolean;
}

/**
 * Represents the result of a migration.
 */
interface MigrationResult {
    numFiles: number,
    numSuccess: number,
    error: boolean
}

/**
 * Migrate all members in a set of source physical files of a library to IFS
 * files and then download them to the project's workspace folder.
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

        const ibmi = getInstance();
        const connection = ibmi?.getConnection()!;

        const migrationResult: MigrationResult = await window.withProgress({
            location: ProgressLocation.Notification,
            title: l10n.t('Migrating Source'),
        }, async (progress) => {
            let migrationResult: MigrationResult = {
                numFiles: migrationConfig.sourceFiles.length,
                numSuccess: 0,
                error: true
            };
            const numSteps = 5 + (migrationConfig.automaticRename ? 1 : 0) + (migrationConfig.fixIncludes ? 1 : 0);
            const increment = (1 / (migrationResult.numFiles + numSteps)) * 100;

            // Verify makei is installed
            progress.report({ message: l10n.t('Verifying makei is installed...'), increment: increment });
            const isMakeiInstalled = await connection.sendCommand({
                command: `ls -p /QOpenSys/pkgs/bin/makei`
            });
            if (isMakeiInstalled?.code !== 0 || isMakeiInstalled.stdout !== '/QOpenSys/pkgs/bin/makei') {
                window.showErrorMessage(l10n.t('Required component ({0}) to migrate source not installed on host IBM i. Run {1} to get it.', 'bob', '\'yum install bob\''));
                return migrationResult;
            }

            // Create temporary remote directory
            progress.report({ message: l10n.t('Creating temporary remote directory...'), increment: increment });
            const tempDirectory = connection.getTempRemote(`migrate_${library}`);
            const createTempDirResult = await connection.sendCommand({
                command: `rm -rf ${tempDirectory}; mkdir -p ${tempDirectory}`
            });
            if (createTempDirResult?.code !== 0) {
                window.showErrorMessage(createTempDirResult.stderr);
                return migrationResult;
            }

            // Run cvtsrcpf on each source file
            for await (const file of migrationConfig.sourceFiles) {
                progress.report({ message: file, increment: increment });
                // Create directory
                const sourceFile = path.parse(file).name;
                const directoryPath = path.posix.join(tempDirectory, sourceFile);
                const mkdirResult = await connection.sendCommand({
                    command: `mkdir -p ${directoryPath}`
                });
                if (mkdirResult?.code !== 0) {
                    continue;
                }

                // Run CVTSRCPF
                const cvtsrcpfResult = await connection.sendCommand({
                    command: `makei cvtsrcpf ${migrationConfig.defaultCCSID ? `-c ${migrationConfig.defaultCCSID}` : ``} ${migrationConfig.importText ? `-t` : ``} ${migrationConfig.lower ? `-l` : ``} ${sourceFile} ${library}`,
                    directory: directoryPath
                });

                if (cvtsrcpfResult?.code === 0) {
                    migrationResult.numSuccess++;
                }
            }

            // Download directory to workspace folder
            if (migrationResult.numSuccess > 0) {
                const remoteTarball = path.posix.join(tempDirectory, 'out.tar');
                const localTarball = path.join(migrationConfig.workspaceFolderUri!.fsPath, 'out.tar');

                progress.report({ message: l10n.t('Creating remote tarball...'), increment: increment });
                const remoteTarballResult = await connection.sendCommand({ command: `${connection.remoteFeatures.tar} -cvf out.tar .`, directory: tempDirectory });
                if (remoteTarballResult.code !== 0) {
                    window.showErrorMessage(l10n.t('Failed to create remote tarball'));
                    return migrationResult;
                }

                progress.report({ message: l10n.t('Downloading tarball to workspace...'), increment: increment });
                try {
                    await connection.getContent().downloadFile(localTarball, remoteTarball);
                    await connection.sendCommand({ command: `rm -rf ${tempDirectory}` });
                } catch (error) {
                    window.showErrorMessage(l10n.t('Failed to download tarball to workspace'));
                    return migrationResult;
                }

                progress.report({ message: l10n.t('Extracting tarball to workspace...'), increment: increment });
                try {
                    await tar.extract({ cwd: migrationConfig.workspaceFolderUri!.fsPath, file: localTarball });
                    await workspace.fs.delete(Uri.file(localTarball), { recursive: true });
                } catch (error) {
                    window.showErrorMessage(l10n.t('Failed to extract tarball to workspace'));
                    return migrationResult;
                }
            }

            const soEnabled = await sourceOrbitEnabled();
            const workspaceFolder = workspace.getWorkspaceFolder(migrationConfig.workspaceFolderUri!);

            if (soEnabled) {
                if (migrationConfig.automaticRename) {
                    progress.report({ message: l10n.t('Renaming file extensions to be more precise...'), increment: increment });
                    await commands.executeCommand('vscode-sourceorbit.autoFix', workspaceFolder, 'renames');
    
                    // Fix file extensions with the format FILE.pgm.CLLE to FILE.PGM.CLLE
                    if (!migrationConfig.lower) {
                        fixExtensions(migrationConfig.workspaceFolderUri!.fsPath);
                    }
                }

                if (migrationConfig.fixIncludes) {
                    progress.report({ message: l10n.t('Adjusting include statements to IFS syntax...'), increment: increment });
                    await commands.executeCommand('vscode-sourceorbit.autoFix', workspaceFolder, 'includes');
                }
    
                if (migrationConfig.generateBob) {
                    progress.report({ message: l10n.t('Generating Rules.mk for Better Object Builder...'), increment: increment });
                    await commands.executeCommand('vscode-sourceorbit.generateBuildFile', workspaceFolder, 'bob');
                }

            } else if (migrationConfig.fixIncludes || migrationConfig.generateBob || migrationConfig.automaticRename) {
                // If any of those options are chosen, but SO is not available, show an error message
                window.showErrorMessage(l10n.t('Failed to run clean up as Source Orbit extension is not activated'));
                return migrationResult;
            }



            migrationResult.error = false;
            return migrationResult;
        });

        // Output migration result
        if (migrationResult.numSuccess === migrationResult.numFiles && !migrationResult.error) {
            window.showInformationMessage(l10n.t('Successfully migrated {0}/{1} source file(s) from {2}',
                migrationResult.numSuccess, migrationResult.numFiles, library));
        } else if (!migrationResult.error) {
            window.showErrorMessage(l10n.t('Failed to migrate {0}/{1} source file(s) from {2}',
                (migrationResult.numFiles - migrationResult.numSuccess), migrationResult.numFiles, library), l10n.t('View log'))
                .then(async choice => {
                    if (choice === l10n.t('View log')) {
                        ibmi?.focusOutput();
                    }
                });
        }

        return migrationResult.numSuccess > 0 && !migrationResult.error;
    }
}

function fixExtensions(workspaceFolder: string): void {
    const filesAndDirs = fs.readdirSync(workspaceFolder);

    filesAndDirs.forEach((fileDir: string) => {
        const path = `${workspaceFolder}/${fileDir}`;
        const stats = fs.statSync(path);

        if (stats.isDirectory()) {
            fixExtensions(path);
        } else {
            const fileSplit = fileDir.split('.');
            const extension = fileSplit.at(-1);

            if (fileSplit.length === 3 && extension?.toUpperCase() === extension) {
                fileSplit[1] = fileSplit[1].toUpperCase();

                const newFileName = fileSplit.join('.');

                fs.rename(path, workspaceFolder + "/" + newFileName, () => {
                });
            }
        }
    });
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
    let sourceFiles: IBMiObject[] | undefined;
    await window.withProgress({
        location: { viewId: `projectExplorer` },
        title: l10n.t('Migrating Source'),
    }, async () => {
        const ibmi = getInstance();
        const connection = ibmi?.getConnection();
        sourceFiles = await connection?.getContent().getObjectList({ library: library, types: ['*SRCPF'] });
    });

    const soEnabled = await sourceOrbitEnabled();

    if (sourceFiles && sourceFiles.length > 0) {
        const customUI = getCustomUI();
        const settingsTab = getCustomUI();
        const sourceFilesTab = getCustomUI();
        if (customUI && settingsTab && sourceFilesTab) {
            // Settings tab
            const projects = ProjectManager.getProjects();
            const projectSelectItems = projects.map<SelectItem>(project => {
                return {
                    description: project.getName(),
                    value: project.getName(),
                    text: project.workspaceFolder.uri.fsPath,
                    selected: iProject.getName() === project.getName()
                };
            });
            settingsTab
                .addInput(`srcLib`, l10n.t('Source Library'), l10n.t('The name of the library containing the source files to migrate.'), { default: library, readonly: true })
                .addInput(`defaultCCSID`, l10n.t('Default CCSID'), l10n.t('The CCSID to be used when the source file is 65535.'), { default: `*JOB`, minlength: 1 })
                .addSelect(`workspaceFolder`, l10n.t('Workspace folder'), projectSelectItems, l10n.t('The workspace folder to which the files are to be downloaded to.'))
                .addCheckbox(`importText`, l10n.t('Import Member Text'), l10n.t('Imports member text at the top of the source as comments.'), true)
                .addCheckbox(`lower`, l10n.t('Lowercase Filenames'), l10n.t('The generated source file names will be in lowercase.'), true);

            // Source files tab
            sourceFiles.forEach(srcPf => {
                const type = srcPf.type.startsWith(`*`) ? srcPf.type.substring(1) : srcPf.type;
                const srcPfLabel = `${srcPf.name}.${type}`;
                sourceFilesTab.addCheckbox(srcPfLabel, srcPfLabel, srcPf.text, true);
            });

            const cleanUpTab = getCustomUI();

            if (soEnabled && cleanUpTab) {
                // Clean up tab
                cleanUpTab
                    .addCheckbox(`automaticRename`, l10n.t('Automatic Rename'), l10n.t('Rename your project sources to have the correct extensions required for most build tools.'), true)
                    .addCheckbox(`fixIncludes`, l10n.t('Fix Includes'), l10n.t('Fixes all include and copy directives (in RPGLE) to use Unix style paths instead of member styled paths.'), true)
                    .addCheckbox(`generateBob`, l10n.t('Generate Rules.mk for BOB'), l10n.t('Generates the makefiles for the Better Object Builder that encodes all dependencies.'), true);
            }

            let tabs: ComplexTab[] = [
                { label: l10n.t('Settings'), fields: settingsTab.fields },
                ...(soEnabled ? [{ label: l10n.t('Clean Up'), fields: cleanUpTab!.fields }] : []),
                { label: l10n.t('Source Files'), fields: sourceFilesTab.fields }
            ];


            const basePage = customUI
                .addHeading(l10n.t('Migrate Source ({0})', library), 1)
                .addParagraph(l10n.t('Convert all members in source physical files of a library to IFS files and then download them to a workspace folder. To learn more about {0}, click {1}here{2}.', '<code>cvtsrcpf</code>', '<a href="https://ibm.github.io/ibmi-bob/#/cli/makei?id=cvtsrcpf">', '</a>'))
                .addComplexTabs(tabs)
                .addHorizontalRule()
                .addButtons({ id: `migrate`, label: l10n.t('Migrate Source'), requiresValidation: true });

            const page = await basePage.loadPage<any>(l10n.t('Migrate Source ({0})', library));
            if (page && page.data) {
                page.panel.dispose();
                const data = page.data;
                delete data.buttons;
                delete data.srcLib;
                const defaultCCSID = data.defaultCCSID;
                delete data.defaultCCSID;
                const workspaceFolderUri = ProjectManager.getProjectFromName(data.workspaceFolder)?.workspaceFolder.uri;
                delete data.workspaceFolder;
                const automaticRename = data.automaticRename;
                delete data.automaticRename;
                const fixIncludes = data.fixIncludes;
                delete data.fixIncludes;
                const importText = data.importText;
                delete data.importText;
                const lower = data.lower;
                delete data.lower;
                const generateBob = data.generateBob;
                delete data.generateBob;

                const sourceFiles = Object.entries<boolean>(data)
                    .filter(sourceFile => sourceFile[1] === true)
                    .map(sourceFile => sourceFile[0]);

                return {
                    defaultCCSID: defaultCCSID,
                    workspaceFolderUri: workspaceFolderUri,
                    sourceFiles: sourceFiles,
                    automaticRename: automaticRename,
                    fixIncludes: fixIncludes,
                    lower: lower,
                    importText: importText,
                    generateBob: generateBob
                };
            }
        }
    } else {
        window.showErrorMessage(l10n.t('{0} does not contain any source files', library));
    }
}

/**
 * Verify a migration configuration by checking whether the workspace folder
 * is set and there are source files selected to be migrated.
 * 
 * @param migrationConfig The migration configuration.
 * @returns True if the migration configuration is valid and false otherwise.
 */
export function verifyMigrationConfig(migrationConfig: MigrationConfig) {
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