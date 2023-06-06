/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { TestSuite } from ".";
import { ProjectManager } from "../projectManager";

export const treeItemsSuite: TestSuite = {
    name: `Tree Items Tests`,
    beforeEach: async () => {
        const iProject = ProjectManager.getProjects()[0];

        await iProject.createEnv();
        await iProject.setEnv('curlib', 'QGPL');
        await iProject.setEnv('lib1', 'SYSTOOLS');
        await iProject.setEnv('lib3', 'QSYSINC');
        await iProject.setEnv('path1', 'PATH1');

        await iProject.updateIProj({
            "version": "0.0.1",
            "description": "SAMPLE PROJECT",
            "objlib": "&objlib",
            "curlib": "&curlib",
            "includePath": ["includes", "QPROTOSRC", "&path1", "&path2"],
            "preUsrlibl": ["&lib1", "&lib2"],
            "postUsrlibl": ["&lib3", "&lib4"],
            "setIBMiEnvCmd": []
        });
    },
    tests: [
        {
            name: `Test project`, test: async () => {
            }
        },
        {
            name: `Test source`, test: async () => {
            }
        },
        {
            name: `Test IFS directory`, test: async () => {
            }
        },
        {
            name: `Test variables`, test: async () => {
            }
        },
        {
            name: `Test variable`, test: async () => {
            }
        },
        {
            name: `Test library list`, test: async () => {
            }
        },
        {
            name: `Test library`, test: async () => {
            }
        },
        {
            name: `Test object file`, test: async () => {
            }
        },
        {
            name: `Test object libraries`, test: async () => {
            }
        },
        {
            name: `Test include paths`, test: async () => {
            }
        },
        {
            name: `Test remote include path`, test: async () => {
            }
        }
    ]
};
