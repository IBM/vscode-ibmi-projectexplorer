/*
 * (c) Copyright IBM Corp. 2023
 */

import * as cp from 'child_process';
import * as path from 'path';
import { download, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

async function main() {
	try {
		// Holds the path of the VS Code executable used for tests
		const vscodeExecutablePath = await download();

		// cliPath holds the path of the wrapper script used to start VS Code in a non-blocking way or to install extensions
		// args holds arguments that should be included in invocations of the "cliPath" script.
		const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test runner script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './index');

		// The path to the test workspace	
		const testWorkspace = path.resolve(__dirname, '../../src/test/testFixtures/ibmi-company_system');

		// Use cp.spawn / cp.exec for custom setup
		console.log('ARGS: ' + JSON.stringify([testWorkspace, ...args, '--install-extension', 'HalcyonTechLtd.code-for-ibmi']));
		cp.spawnSync(cliPath, [testWorkspace, ...args, '--install-extension', 'HalcyonTechLtd.code-for-ibmi'], {
			encoding: 'utf-8',
			stdio: 'inherit',
		});
		console.log(testWorkspace);

		// Run the extension test
		await runTests({ 
			vscodeExecutablePath, 
			extensionDevelopmentPath, 
			extensionTestsPath
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();