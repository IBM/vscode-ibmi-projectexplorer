/*
 * (c) Copyright IBM Corp. 2023
 */

import { env } from "process";
import { ExtensionContext, commands, window } from "vscode";
import { getInstance } from "../ibmi";
import { buildMapSuite } from "./suites/buildMap";
import { decorationProviderSuite } from "./suites/decorationProvider";
import { iProjectSuite } from "./suites/iProject";
import { jobLogSuite } from "./suites/jobLog";
import { jobLogCommandSuite } from "./suites/jobLogCommand";
import { jobLogTreeItemSuite } from "./suites/jobLogTreeItem";
import { projectExplorerTreeItemSuite } from "./suites/projectExplorerTreeItem";
import { projectManagerSuite } from "./suites/projectManager";
import { ringBufferSuite } from "./suites/ringBuffer";
import { utilSuite } from "./suites/utilTest";
import { TestSuitesTreeProvider } from "./testCasesTree";

const suites: TestSuite[] = [
  buildMapSuite,
  decorationProviderSuite,
  iProjectSuite,
  jobLogCommandSuite,
  jobLogSuite,
  jobLogTreeItemSuite,
  projectExplorerTreeItemSuite,
  projectManagerSuite,
  ringBufferSuite,
  utilSuite
];

export type TestSuite = {
  name: string,
  beforeAll?: () => Promise<void>,
  beforeEach?: () => Promise<void>,
  afterAll?: () => Promise<void>,
  afterEach?: () => Promise<void>,
  tests: TestCase[],
  failure?: string,
  status?: "running" | "done"
};

export interface TestCase {
  name: string,
  status?: "running" | "failed" | "pass"
  failure?: string
  test: () => Promise<void>
  duration?: number
}

const testingEnabled = env.testing === `true`;
const individualTesting = env.individual === `true`;

let testSuitesTreeProvider: TestSuitesTreeProvider;
export async function initialise(context: ExtensionContext) {
  if (testingEnabled) {
    await commands.executeCommand(`setContext`, `projectExplorer:testing`, true);
    const ibmi = getInstance()!;
    if (!individualTesting) {
      ibmi.subscribe(context, `connected`, "Run IBM i Project Explorer tests", runTests);
    }
    ibmi.subscribe(context, `disconnected`, "Reset IBM i Project Explorer tests", resetTests);
    testSuitesTreeProvider = new TestSuitesTreeProvider(suites);
    const testSuitesTreeView = window.createTreeView(`testing`, { treeDataProvider: testSuitesTreeProvider, showCollapseAll: true });

    context.subscriptions.push(
      testSuitesTreeView,
      commands.registerCommand(`projectExplorer.testing.specific`, async (suiteName: string, testName: string) => {
        if (suiteName && testName) {
          const suite = suites.find(suite => suite.name === suiteName);

          if (suite) {
            const testCase = suite.tests.find(testCase => testCase.name === testName);

            if (testCase) {
              if (suite.beforeAll) {
                await suite.beforeAll();
              }

              if (suite.beforeEach) {
                await suite.beforeEach();
              }

              await runTest(testCase);

              if (suite.afterEach) {
                await suite.afterEach();
              }

              if (suite.afterAll) {
                await suite.afterAll();
              }
            }
          }
        }
      })
    );
  }
}

async function runTests() {
  for (const suite of suites) {
    try {
      suite.status = "running";
      testSuitesTreeProvider.refresh(suite);

      if (suite.beforeAll) {
        console.log(`Pre-processing suite ${suite.name}`);
        await suite.beforeAll();
      }

      console.log(`Running suite ${suite.name} (${suite.tests.length})`);
      console.log();
      for await (const test of suite.tests) {
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        await runTest(test);

        if (suite.afterEach) {
          await suite.afterEach();
        }
      }
    } catch (error: any) {
      console.log(error);
      suite.failure = `${error.message ? error.message : error}`;
    } finally {
      suite.status = "done";
      testSuitesTreeProvider.refresh(suite);

      if (suite.afterAll) {
        console.log();
        console.log(`Post-processing suite ${suite.name}`);

        try {
          await suite.afterAll();
        } catch (error: any) {
          console.log(error);
          suite.failure = `${error.message ? error.message : error}`;
        }
      }

      testSuitesTreeProvider.refresh(suite);
    }
  }
}

async function runTest(test: TestCase) {
  console.log(`\tRunning ${test.name}`);
  test.status = "running";
  testSuitesTreeProvider.refresh(test);
  const start = +(new Date());

  try {
    await test.test();
    test.status = "pass";
  } catch (error: any) {
    console.log(error);
    test.status = "failed";
    test.failure = `${error.message ? error.message : error}`;
  } finally {
    test.duration = +(new Date()) - start;
    testSuitesTreeProvider.refresh(test);
  }
}

function resetTests() {
  suites.flatMap(ts => ts.tests).forEach(tc => {
    tc.status = undefined;
    tc.failure = undefined;
  });
}