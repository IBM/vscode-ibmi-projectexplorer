/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import { Uri, window, workspace, WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';
import { RingBuffer } from "./views/jobLog/RingBuffer";
import { JobLogInfo } from "./jobLog";
import { TextEncoder } from "util";
import { IProjectT } from "./iProjectT";

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
    if (this.state) {
      return this.state;
    } else {
      await this.read();
      return this.state;
    }
  }

  public setState(state: IProjectT | undefined) {
    this.state = state;
  }

  public getEnvFilePath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `.env`));
  }

  public async read() {
    const content = await workspace.fs.readFile(this.getIProjFilePath());
    this.state = IProject.validateIProject(content.toString());
  }

  public async addToIncludePaths(directoryToAdd: string) {
    const iProjExists = await this.projectFileExists('iproj.json');
    if (iProjExists) {
      const content = await workspace.fs.readFile(this.getIProjFilePath());

      const iProject = IProject.validateIProject(content.toString());
      if (iProject) {
        try {
          if (iProject.includePath) {
            if (!iProject.includePath.includes(directoryToAdd)) {
              iProject.includePath.push(directoryToAdd);
            } else {
              window.showErrorMessage(`${directoryToAdd} already exists in the includePaths`);
            }
          } else {
            iProject.includePath = [directoryToAdd];
          }

          await workspace.fs.writeFile(this.getIProjFilePath(), new TextEncoder().encode(JSON.stringify(iProject, null, 2)));
        } catch {
          window.showErrorMessage('Failed to update iproj.json');
        }
      }
    } else {
      window.showErrorMessage('No iproj.json found');
    }
  }

  public async removeFromIncludePaths(directoryToRemove: string) {
    const iProjExists = await this.projectFileExists('iproj.json');
    if (iProjExists) {
      const content = await workspace.fs.readFile(this.getIProjFilePath());

      const iProject = IProject.validateIProject(content.toString());
      if (iProject) {
        try {
          if (iProject.includePath) {
            const index = iProject.includePath.indexOf(directoryToRemove);
            if (index > -1) {
              iProject.includePath.splice(index, 1);
            } else {
              window.showErrorMessage(`${directoryToRemove} does not exist in includePaths`);
            }
          }

          await workspace.fs.writeFile(this.getIProjFilePath(), new TextEncoder().encode(JSON.stringify(iProject, null, 2)));
        } catch {
          window.showErrorMessage('Failed to update iproj.json');
        }
      }
    } else {
      window.showErrorMessage('No iproj.json found');
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
      const variables = this.getVariables().map(variable => variable + '=').join('\n');

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

  public getJobLogs() {
    return this.jobLogs.toArray();
  }

  public getVariables(): string[] {
    if (!this.state) {
      return [];
    }

    const valueList: string[] = [
      this.state.curlib,
      this.state.objlib,
      ...(this.state.postUsrlibl ? this.state.postUsrlibl : []),
      ...(this.state.preUsrlibl ? this.state.preUsrlibl : []),
      ...(this.state.includePath ? this.state.includePath : []),
    ].filter(x => x) as string[];

    // Get everything that starts with an &
    const variableNameList = valueList.filter(value => value.startsWith(`&`)).map(value => value.substring(1));

    // Remove duplicates
    return variableNameList.filter((name,
      index) => variableNameList.indexOf(name) === index);
  }

  public async getObjectLibraries(): Promise<Set<string> | undefined> {
    const state = await this.getState();
    if (state) {
      const objLibs = new Set<string>();
      if (state.curlib) {
        objLibs.add(state.curlib.toUpperCase());
      }
      if (state.preUsrlibl) {
        for (const lib of state.preUsrlibl) {
          objLibs.add(lib.toUpperCase());
        }
      }
      if (state.postUsrlibl) {
        for (const lib of state.postUsrlibl) {
          objLibs.add(lib.toUpperCase());
        }
      }

      state.objlib ? objLibs.add(state.objlib.toUpperCase()) : null;

      return objLibs;
    }
  }

  public static validateIProject(content: string): IProjectT {
    const iproj = JSON.parse(content);

    // Validate iproj.json here

    return iproj;
  }

  public static validateJobLog(content: string): JobLogInfo {
    const jobLog = JSON.parse(content);

    // Validate jobLog here

    return new JobLogInfo(jobLog);
  }
}