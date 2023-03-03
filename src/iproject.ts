import { readFile, stat } from "fs/promises";
import path = require("path");
import { WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';

type EnvironmentVariables = {[name: string]: string};

interface iProjectT {
  objlib?: string;
  curlib?: string;
  description?: string;
  includePath?: string[];
  buildCommand?: string;
  compileCommand?: string;
  preUsrlibl: string[];
  postUsrlibl: string[];
}

export default class IProject {
  private state: iProjectT|undefined;
  private environmentValues: EnvironmentVariables; 
  constructor(private workspaceFolder: WorkspaceFolder) {
    this.environmentValues = {};
  }

  public async read() {
    const content = await readFile(path.join(this.workspaceFolder.uri.fsPath, `iproj.json`), {encoding: `utf8`});
    this.state = IProject.validateIProject(content);
  }

  public async envExists(): Promise<boolean> {
    try {
      await stat(path.join(this.workspaceFolder.uri.fsPath, `.env`));
      return true;
    } catch(e) {
      return false;
    }
  }

  public async getEnv() {
    try {
      const content = await readFile(path.join(this.workspaceFolder.uri.fsPath, `.env`));
      this.environmentValues = dotenv.parse(content);
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