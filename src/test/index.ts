/*
 * (c) Copyright IBM Corp. 2023
 */

import * as assert from "assert";
import { ExtensionContext, commands, window, workspace } from "vscode";
import * as dotenv from 'dotenv';
import { TestSuitesTreeProvider } from "./testCasesTree";
import { getInstance } from "../ibmi";
import { iProjectSuite } from "./suites/iProject.test";
import * as path from "path";
import { projectManagerSuite } from "./suites/projectManager.test";
import { jobLogSuite } from "./suites/jobLog.test";
import { projectExplorerTreeItemSuite } from "./suites/projectExplorerTreeItem.test";
import { decorationProviderSuite } from "./suites/decorationProvider.test";
import { jobLogCommandSuite } from "./suites/jobLogCommand.test";
import { jobLogTreeItemSuite } from "./suites/jobLogTreeItem.test";
import { ringBufferSuite } from "./suites/ringBuffer.test";
import { buildMapSuite } from "./suites/buildMap.test";
import { ConnectionData } from "@halcyontech/vscode-ibmi-types";
import { extensionContext } from "../extension";

const suites: TestSuite[] = [
  buildMapSuite,
  decorationProviderSuite,
  iProjectSuite,
  jobLogCommandSuite,
  jobLogSuite,
  jobLogTreeItemSuite,
  projectExplorerTreeItemSuite,
  projectManagerSuite,
  ringBufferSuite
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

let testSuitesTreeProvider: TestSuitesTreeProvider;
export async function initialise(context: ExtensionContext) {
  await commands.executeCommand(`setContext`, `projectExplorer:testing`, true);
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

export async function run(connect: boolean = true) {
  // Initialize test cases view
  await initialise(extensionContext);

  if (connect) {
    // Verify connection environment variables are set
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    const host = process.env.HOST;
    assert.ok(host, 'HOST environment variable required to run tests');
    const port = process.env.PORT;
    assert.ok(port, 'PORT environment variable required to run tests');
    const user = process.env.USER;
    assert.ok(user, 'USER environment variable required to run tests');
    const password = process.env.PASSWORD;
    assert.ok(password, 'PASSWORD environment variable required to run tests');

    // Verify test fixtures are loaded
    console.log(JSON.stringify(workspace.workspaceFolders));
    const workspaceFolders = workspace.workspaceFolders;
    assert.ok(workspaceFolders, 'Failed to load workspace folders');
    assert.strictEqual(workspaceFolders.length, 1, 'Incorrect number of workspace folders');
    assert.strictEqual(workspaceFolders[0].name, 'ibmi-company_system', 'Failed to load workspace folder');

    // Connect to IBM i
    const connection: ConnectionData = {
      name: 'Test Connection',
      host: host,
      username: user,
      password: password,
      port: parseInt(port),
      privateKey: null
    };
    const isConnected = await commands.executeCommand('code-for-ibmi.connectDirect', connection);
    assert.ok(isConnected, 'Failed to connect to IBM i');

    // Run tests
    await runTests();
  } else {
    const ibmi = getInstance()!;

    // Run tests on connect
    ibmi.onEvent(`connected`, async () => {
      await runTests();
    });

    // Reset tests on disconnect
    ibmi.onEvent(`disconnected`, resetTests);
  }
}

async function runTests() {
  await commands.executeCommand(`testing.focus`);

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