/*
 * (c) Copyright IBM Corp. 2023
 */

import path = require("path");
import { Uri, window, workspace, WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';
import { RingBuffer } from "./views/jobLog/RingBuffer";
import { JobLogInfo } from "./jobLog";
import { TextEncoder } from "util";
import { IProjectT } from "./iProjectT";
import { getInstance } from "./ibmi";
import { LibraryType } from "./views/projectExplorer/library";

const DEFAULT_CURLIB = '&CURLIB';

export type EnvironmentVariables = { [name: string]: string };

export class IProject {
  private name: string;
  private state: IProjectT | undefined;
  private jobLogs: RingBuffer<JobLogInfo>;
  private environmentValues: EnvironmentVariables;

  constructor(public workspaceFolder: WorkspaceFolder) {
    this.name = workspaceFolder.name;
    this.jobLogs = new RingBuffer<JobLogInfo>(10);
    this.environmentValues = {};
  }

  public getIProjFilePath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `iproj.json`));
  }

  public getJobLogPath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `.logs`, `joblog.json`));
  }

  public getBuildOutputPath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `.logs`, `output.log`));
  }

  public getName(): string {
    return this.name;
  }

  public async getState(): Promise<IProjectT | undefined> {
    if (!this.state) {
      return await this.updateState();
    }
    return this.state;
  }

  public async updateState() {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const values = await this.getEnv();

      unresolvedState.preUsrlibl = unresolvedState.preUsrlibl ? unresolvedState.preUsrlibl.map(preUsrlib => this.resolveLibrary(preUsrlib, values)) : undefined;
      unresolvedState.postUsrlibl = unresolvedState.postUsrlibl ? unresolvedState.postUsrlibl.map(postUsrlib => this.resolveLibrary(postUsrlib, values)) : undefined;
      unresolvedState.curlib = unresolvedState.curlib ? this.resolveLibrary(unresolvedState.curlib, values) : undefined;
      unresolvedState.objlib = unresolvedState.objlib ? this.resolveLibrary(unresolvedState.objlib, values) : undefined;
    }

    this.state = unresolvedState;
    return this.state;
  }

  private resolveLibrary(lib: string, values: EnvironmentVariables): string {
    if (lib && lib.startsWith('&') && values[lib.substring(1)] && values[lib.substring(1)] !== '') {
      return values[lib.substring(1)];
    }

    return lib;
  }

  public async getUnresolvedState(): Promise<IProjectT | undefined> {
    let iproj: IProjectT | undefined;

    try {
      const content = await workspace.fs.readFile(this.getIProjFilePath());
      iproj = IProject.validateIProject(content.toString());
    } catch (e) {
      iproj = undefined;
    }

    return iproj;
  }

  public setState(state: IProjectT | undefined) {
    this.state = state;
  }

  public getEnvFilePath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `.env`));
  }

  public async addToIncludePaths(directoryToAdd: string) {
    const ibmi = getInstance();
    const deploymentDirs = ibmi?.getStorage().getDeployment()!;
    const remoteDir = deploymentDirs[this.workspaceFolder.uri.fsPath];
    directoryToAdd = directoryToAdd.startsWith(remoteDir) ? path.posix.relative(remoteDir, directoryToAdd) : directoryToAdd;

    const unresolvedState = await this.getUnresolvedState();
    if (unresolvedState) {
      if (unresolvedState.includePath) {
        if (!unresolvedState.includePath.includes(directoryToAdd)) {
          unresolvedState.includePath.push(directoryToAdd);
        } else {
          window.showErrorMessage(`${directoryToAdd} already exists in includePaths`);
          return;
        }
      } else {
        unresolvedState.includePath = [directoryToAdd];
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async removeFromIncludePaths(directoryToRemove: string) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = unresolvedState.includePath ? unresolvedState.includePath.indexOf(directoryToRemove) : -1;
      if (index > -1) {
        unresolvedState.includePath!.splice(index, 1);
      } else {
        window.showErrorMessage(`${directoryToRemove} does not exist in includePaths`);
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async getLibraryList(): Promise<string[] | undefined> {
    const ibmi = getInstance();
    const defaultUserLibraries = ibmi?.getConnection().defaultUserLibraries;

    // Get user libraries
    const state = await this.getState();

    if (state) {
      let userLibrariesToAdd: string[] = [
        ...(state.preUsrlibl ? state.preUsrlibl : []),
        ...(defaultUserLibraries ? defaultUserLibraries : []),
        ...(state.postUsrlibl ? state.postUsrlibl : [])
      ];
      userLibrariesToAdd = [... new Set(userLibrariesToAdd.filter(lib => !lib.startsWith('&')))].reverse();

      // Get current library
      let curlib = state.curlib && !state.curlib.startsWith('&') ? state.curlib : undefined;

      // Validate libraries
      let librariesToValidate = curlib && !userLibrariesToAdd.includes(curlib) ? userLibrariesToAdd.concat(curlib) : userLibrariesToAdd;
      const badLibs = await ibmi?.getContent().validateLibraryList(librariesToValidate);
      if (curlib && badLibs?.includes(curlib)) {
        curlib = undefined;
      }
      if (badLibs) {
        userLibrariesToAdd = userLibrariesToAdd.filter(lib => !badLibs.includes(lib));
      }

      // Retrieve library list
      let buildLibraryListCommand = [
        defaultUserLibraries ? `liblist -d ${defaultUserLibraries.join(` `)}` : ``,
        state.curlib && state.curlib !== '' ? `liblist -c ${state.curlib}` : ``,
        userLibrariesToAdd && userLibrariesToAdd.length > 0 ? `liblist -a ${userLibrariesToAdd.join(` `)}` : ``,
        `liblist`
      ].filter(cmd => cmd !== ``).join(` ; `);

      const liblResult = await ibmi?.getConnection().sendQsh({
        command: buildLibraryListCommand
      });

      if (liblResult && liblResult.code === 0) {
        const libraryListString = liblResult.stdout;

        if (libraryListString !== ``) {
          const libraryList = libraryListString.split(`\n`);
          return libraryList;
        }
      }
    }
  }

  public async addToLibraryList(library: string, position: 'preUsrlibl' | 'postUsrlibl') {
    const unresolvedState = await this.getUnresolvedState();
    const state = await this.getState();

    if (unresolvedState && state) {
      if (unresolvedState[position] && state[position]) {
        if (state[position]!.includes(library)) {
          window.showErrorMessage(`${library} already exists in ${position}`);
          return;

        } else {
          if (position === 'preUsrlibl') {
            unresolvedState[position]!.unshift(library);
          } else {
            unresolvedState[position]!.push(library);
          }
        }
      } else {
        unresolvedState[position] = [library];
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async setCurrentLibrary(library: string) {
    const unresolvedState = await this.getUnresolvedState();
    const state = await this.getState();

    if (unresolvedState && state) {
      if (state.curlib === library) {
        window.showErrorMessage(`Current library already set to ${library}`);
        return;
      } else if (unresolvedState.curlib && unresolvedState.curlib.startsWith('&')) {
        //Update variable
        await this.setEnv(unresolvedState.curlib.substring(1), library);
      } else {
        await this.setEnv(DEFAULT_CURLIB, library);

        unresolvedState.curlib = DEFAULT_CURLIB;
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async removeFromLibraryList(library: string, type: LibraryType) {
    const unresolvedState = await this.getUnresolvedState() as any;

    if (unresolvedState) {
      if (type === LibraryType.currentLibrary) {
        if (unresolvedState.curlib?.startsWith('&')) {
          await this.setEnv(unresolvedState.curlib.substring(1), '');
          return;
        } else {
          unresolvedState.curlib = undefined;
        }
      } else {
        const state = await this.getState() as any;

        if (state) {
          // Search for library in preUsrlibl then postUsrlibl
          let libIndex = -1;
          for await (const usrlibl of ['preUsrlibl', 'postUsrlibl']) {
            if (unresolvedState[usrlibl] && state[usrlibl] && state[usrlibl].includes(library)) {
              libIndex = state[usrlibl].indexOf(library);

              if (libIndex > -1) {
                if (unresolvedState[usrlibl][libIndex].startsWith('&')) {
                  await this.setEnv(unresolvedState[usrlibl][libIndex].substring(1), '');
                  return;
                } else {
                  unresolvedState[usrlibl].splice(libIndex, 1);
                }
                break;
              }
            }
          }

          if (libIndex < 0) {
            window.showErrorMessage(`${library} does not exist in preUsrlibl or postUsrlibl`);
            return;
          }
        }
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async updateIProj(iProject: IProjectT) {
    try {
      await workspace.fs.writeFile(this.getIProjFilePath(), new TextEncoder().encode(JSON.stringify(iProject, null, 2)));
    } catch {
      window.showErrorMessage('Failed to update iproj.json');
    }
  }

  public async readJobLog() {
    const jobLogExists = await this.projectFileExists('joblog.json');
    if (jobLogExists) {
      const content = await workspace.fs.readFile(this.getJobLogPath());
      const jobLog = IProject.validateJobLog(content.toString());

      if (!this.jobLogs.isEmpty()) {
        const latestJobLog = this.jobLogs.get(-1);
        if (latestJobLog && latestJobLog.commands[0].cmd_time !== jobLog.commands[0].cmd_time) {
          this.jobLogs.add(jobLog);
        }
      } else {
        this.jobLogs.add(jobLog);
      }
    }
  }

  public async clearJobLogs() {
    const jobLogExists = await this.projectFileExists('joblog.json');
    if (jobLogExists) {
      const localJobLog = this.jobLogs.get(-1);

      this.jobLogs.fromArray([]);
      if (localJobLog) {
        this.jobLogs.add(localJobLog);
      }
    } else {
      this.jobLogs.fromArray([]);
    }
  }

  public async projectFileExists(type: 'iproj.json' | 'joblog.json' | 'output.log' | '.env'): Promise<boolean> {
    let fileUri: Uri;
    switch (type) {
      case "iproj.json":
        fileUri = this.getIProjFilePath();
        break;
      case "joblog.json":
        fileUri = this.getJobLogPath();
        break;
      case "output.log":
        fileUri = this.getBuildOutputPath();
        break;
      case ".env":
        fileUri = this.getEnvFilePath();
        break;
    }

    try {
      const statResult = await workspace.fs.stat(fileUri);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async createProject(description: string): Promise<boolean> {
    try {
      const content = {
        description: description
      };

      await workspace.fs.writeFile(this.getIProjFilePath(), new TextEncoder().encode(JSON.stringify(content, null, 2)));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async createEnv(): Promise<boolean> {
    try {
      const variables = (await this.getVariables()).map(variable => variable + '=').join('\n');

      await workspace.fs.writeFile(this.getEnvFilePath(), new TextEncoder().encode(variables));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getEnv() {
    try {
      const content = await workspace.fs.readFile(this.getEnvFilePath());
      this.environmentValues = dotenv.parse(Buffer.from(content));
    } catch (e) {
      this.environmentValues = {};
    }

    return this.environmentValues;
  }

  public async setEnv(variable: string, value: string) {
    const env = await this.getEnv();
    env[variable] = value;

    let content = '';
    for (const [key, value] of Object.entries(env)) {
      content += `${key}=${value}\n`;
    }
    await workspace.fs.writeFile(this.getEnvFilePath(), new TextEncoder().encode(content));
  }

  public getJobLogs() {
    return this.jobLogs.toArray();
  }

  public async getVariables(): Promise<string[]> {
    const unresolvedState = await this.getUnresolvedState();
    if (!unresolvedState) {
      return [];
    }

    const valueList: string[] = [
      unresolvedState.curlib,
      unresolvedState.objlib,
      ...(unresolvedState.postUsrlibl ? unresolvedState.postUsrlibl : []),
      ...(unresolvedState.preUsrlibl ? unresolvedState.preUsrlibl : []),
      ...(unresolvedState.includePath ? unresolvedState.includePath : []),
    ].filter(x => x) as string[];

    // Get everything that starts with an &
    const variableNameList = valueList.filter(value => value.startsWith(`&`)).map(value => value.substring(1));

    // Remove duplicates
    return variableNameList.filter((name,
      index) => variableNameList.indexOf(name) === index);
  }

  public static validateIProject(content: string): IProjectT {
    const iproj = JSON.parse(content);

    if (!iproj.objlib && iproj.curlib) {
      iproj.objlib = iproj.curlib;
    }

    return iproj;
  }

  public static validateJobLog(content: string): JobLogInfo {
    const jobLog = JSON.parse(content);

    // Validate jobLog here

    return new JobLogInfo(jobLog);
  }
}