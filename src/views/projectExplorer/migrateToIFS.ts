/*
 * (c) Copyright IBM Corp. 2023
 */

import { getCustomUI, getInstance } from "../../ibmi";
import { l10n, window } from "vscode";
import { IBMiFile } from "@halcyontech/vscode-ibmi-types";

export async function migrateToIFS(library: string) {
    let sourceFiles: IBMiFile[] | undefined;
    await window.withProgress({
        location: { viewId: `projectExplorer` },
        title: l10n.t('Migrating to IFS'),
    }, async () => {
        const ibmi = getInstance();
        sourceFiles = await ibmi?.getContent().getObjectList({ library: library });
    });

    if (sourceFiles) {
        const customUI = getCustomUI();
        if (customUI) {

            const basePage = customUI
                .addHeading(l10n.t('Migrate to IFS'), 1)
                .addParagraph(l10n.t('Convert all members in source physical files of a library to IFS files in the project\'s deploy location'))
                .addInput(`srcLib`, l10n.t('Source Library'), undefined, { default: library, readonly: true })
                .addInput(`defaultCCSID`, l10n.t('Default CCSID'), l10n.t('If the source file is 65535, this will be used instead'), { default: `*JOB` });

            sourceFiles.forEach(srcPf => {
                if (srcPf.attribute === 'PF') {
                    const type = srcPf.type.startsWith(`*`) ? srcPf.type.substring(1) : srcPf.type;
                    const srcPfLabel = `${srcPf.name}.${type}`;

                    basePage.addCheckbox(srcPfLabel, srcPfLabel, undefined, true);
                }
            });

            basePage.addButtons({ id: `migrate`, label: l10n.t('Migrate') });

            const page = await basePage.loadPage<any>(l10n.t('Migrate to IFS'));

            if (page && page.data) {
                page.panel.dispose();
                const data = page.data;
                delete data.buttons;
                delete data.srcLib;
                const defaultCCSID = data.defaultCCSID;
                delete data.defaultCCSID;

                const sourceFiles = Object.entries<boolean>(data)
                    .filter(sourceFile => sourceFile[1] === true)
                    .map(sourceFile => sourceFile[0]);

                return {
                    defaultCCSID: defaultCCSID,
                    sourceFiles: sourceFiles
                };
            }
        }
    }

}