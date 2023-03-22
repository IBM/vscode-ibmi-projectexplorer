import path = require("path");
import { Uri, workspace, WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';
import { RingBuffer } from "./views/jobLog/RingBuffer";
import { JobLogInfo } from "./jobLog";
import lodash = require("lodash");
import { TextEncoder } from "util";

export type EnvironmentVariables = { [name: string]: string };

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface iProjectT {
  objlib?: string;
  curlib?: string;
  name: string;
  description?: string;
  includePath?: string[];
  buildCommand?: string;
  compileCommand?: string;
  preUsrlibl: string[];
  postUsrlibl: string[];
}

export class IProject {
  private state: iProjectT | undefined;
  private jobLogs: RingBuffer<JobLogInfo>;
  private environmentValues: EnvironmentVariables;

  constructor(public workspaceFolder: WorkspaceFolder) {
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

  public getState(): iProjectT | undefined {
    return this.state;
  }

  public getEnvFilePath(): Uri {
    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, `.env`));
  }

  public async read() {
    const content = await workspace.fs.readFile(this.getIProjFilePath());
    this.state = IProject.validateIProject(content.toString());
  }

  public async readJobLog() {
    const jobLogExists = await this.jobLogExists();
    if (jobLogExists) {
      const content = await workspace.fs.readFile(this.getJobLogPath());
      const jobLog = IProject.validateJobLog(content.toString());

      if (!this.jobLogs.isEmpty()) {
        const latestJobLog = this.jobLogs.get(-1);
        if (latestJobLog && !lodash.isEqual(latestJobLog, jobLog)) {
          this.jobLogs.add(jobLog);
        }
      } else {
        this.jobLogs.add(jobLog);
      }
    }
  }

  public async clearJobLogs() {
    const jobLogExists = await this.jobLogExists();
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

  public async jobLogExists(): Promise<boolean> {
    try {
      const statResult = await workspace.fs.stat(this.getJobLogPath());
      return true;
    } catch (e) {
      return false;
    }
  }

  public async buildOutputExists(): Promise<boolean> {
    try {
      const statResult = await workspace.fs.stat(this.getBuildOutputPath());
      return true;
    } catch (e) {
      return false;
    }
  }

  public async envExists(): Promise<boolean> {
    try {
      const statResult = await workspace.fs.stat(this.getEnvFilePath());
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

  public static validateIProject(content: string): iProjectT {
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