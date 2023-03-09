import path = require("path");
import { Uri, workspace, WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';
import envUpdater from "./envUpdater";

export type EnvironmentVariables = {[name: string]: string};

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface iProjectT {
  objlib?: string;
  curlib?: string;
  name:string;
  description?: string;
  includePath?: string[];
  buildCommand?: string;
  compileCommand?: string;
  preUsrlibl: string[];
  postUsrlibl: string[];
}

export class IProject {
  private state: iProjectT|undefined;
  private environmentValues: EnvironmentVariables; 
  constructor(public workspaceFolder: WorkspaceFolder) {
    this.environmentValues = {};
  }

  public getState(): iProjectT | undefined{
    return this.state;
  }

  private getIProjFilePath(): Uri {
    return Uri.parse(path.join(this.workspaceFolder.uri.fsPath, `iproj.json`));
  }

  public getEnvFilePath(): Uri {
    return Uri.parse(path.join(this.workspaceFolder.uri.fsPath, `.env`));
  }

  public async read() {
    const content = await workspace.fs.readFile(this.getIProjFilePath());
    this.state = IProject.validateIProject(content.toString());
  }

  public async envExists(): Promise<boolean> {
    try {
      const statResult = await workspace.fs.stat(this.getEnvFilePath());
      return true;
    } catch(e) {
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

    return valueList.filter(value => value.startsWith(`&`)).map(value => value.substring(1));
  }

  public static validateIProject(content: string): iProjectT {
    const iproj = JSON.parse(content);

    // Validate iproj.json here

    return iproj;
  }
}