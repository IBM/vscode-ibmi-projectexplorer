/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import { l10n, Uri, window, workspace, WorkspaceFolder } from "vscode";
import * as dotenv from 'dotenv';
import { RingBuffer } from "./views/jobLog/RingBuffer";
import { JobLogInfo } from "./jobLog";
import { TextEncoder } from "util";
import { IProjectT } from "./iProjectT";
import { getInstance } from "./ibmi";
import { LibraryType } from "./views/projectExplorer/library";
import envUpdater from "./envUpdater";
import { IBMiJsonT } from "./ibmiJsonT";
import { IBMiObject } from "@halcyontech/vscode-ibmi-types";
import { ProjectManager } from "./projectManager";

const DEFAULT_CURLIB = '&CURLIB';
const DEFAULT_OBJLIB = '&OBJLIB';

export type ProjectFileType = 'iproj.json' | 'joblog.json' | 'output.log' | '.env';
export type LibraryList = { libraryInfo: IBMiObject; libraryType: string; }[];
export type EnvironmentVariables = { [name: string]: string };
export type Direction = 'up' | 'down';
export type Position = 'first' | 'last' | 'middle';

export class IProject {
  private name: string;
  private state: IProjectT | undefined;
  private buildMap: Map<string, IBMiJsonT>;
  private libraryList: LibraryList | undefined;
  private jobLogs: RingBuffer<JobLogInfo>;
  private environmentValues: EnvironmentVariables;

  constructor(public workspaceFolder: WorkspaceFolder) {
    this.name = workspaceFolder.name;
    this.state = undefined;
    this.buildMap = new Map();
    this.libraryList = undefined;
    this.jobLogs = new RingBuffer<JobLogInfo>(10);
    this.environmentValues = {};
  }

  public getName(): string {
    return this.name;
  }

  public getProjectFileUri(type: ProjectFileType): Uri {
    const logDirectory = (type === 'joblog.json' || type === 'output.log') ? `.logs` : ``;

    return Uri.file(path.join(this.workspaceFolder.uri.fsPath, logDirectory, type));
  }

  public async projectFileExists(type: ProjectFileType): Promise<boolean> {
    const fileUri = this.getProjectFileUri(type);

    try {
      const statResult = await workspace.fs.stat(fileUri);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getState(): Promise<IProjectT | undefined> {
    if (!this.state) {
      await this.updateState();
    }
    return this.state;
  }

  public async updateState() {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      if (!unresolvedState.objlib && unresolvedState.curlib) {
        unresolvedState.objlib = unresolvedState.curlib;
      }

      const values = await this.getEnv();

      if (unresolvedState.preUsrlibl) {
        unresolvedState.preUsrlibl = unresolvedState.preUsrlibl.map(preUsrlib => this.resolveVariable(preUsrlib, values));
      }

      if (unresolvedState.postUsrlibl) {
        unresolvedState.postUsrlibl = unresolvedState.postUsrlibl.map(postUsrlib => this.resolveVariable(postUsrlib, values));
      }

      if (unresolvedState.curlib) {
        unresolvedState.curlib = this.resolveVariable(unresolvedState.curlib, values);
      }

      if (unresolvedState.objlib) {
        unresolvedState.objlib = this.resolveVariable(unresolvedState.objlib, values);
      }

      if (unresolvedState.includePath) {
        unresolvedState.includePath = unresolvedState.includePath.map(includePath => this.resolveVariable(includePath, values));
      }
    }

    this.state = unresolvedState;
  }

  public setState(state: IProjectT | undefined) {
    this.state = state;
  }

  public resolveVariable(lib: string, values: EnvironmentVariables): string {
    if (lib && lib.startsWith('&') && values[lib.substring(1)] && values[lib.substring(1)] !== '') {
      return values[lib.substring(1)];
    }

    return lib;
  }

  public async getUnresolvedState(): Promise<IProjectT | undefined> {
    try {
      const content = await workspace.fs.readFile(this.getProjectFileUri('iproj.json'));
      return IProject.validateIProject(content.toString());
    } catch (e) {
      return undefined;
    }
  }

  public async getBuildMap(): Promise<Map<string, IBMiJsonT>> {
    if (!this.buildMap) {
      await this.updateBuildMap();
    }
    return this.buildMap;
  }

  public async updateBuildMap() {
    this.buildMap = new Map();

    const ibmiJsonPaths = await workspace.findFiles('**/.ibmi.json');
    for await (const ibmiJsonPath of ibmiJsonPaths) {
      try {
        const ibmiJsonContent: IBMiJsonT = JSON.parse((await workspace.fs.readFile(ibmiJsonPath)).toString());
        if (ibmiJsonContent && ibmiJsonContent.build) {
          this.buildMap.set(path.dirname(ibmiJsonPath.fsPath), ibmiJsonContent);
        }
      } catch { }
    };

    if (!this.buildMap.has(this.workspaceFolder.uri.fsPath)) {
      const unresolvedState = await this.getUnresolvedState();
      if (unresolvedState && (unresolvedState.objlib || unresolvedState.curlib)) {
        this.buildMap.set(this.workspaceFolder.uri.fsPath, { build: { objlib: unresolvedState.objlib || unresolvedState.curlib } });
      }
    }
  }

  public async getIbmiJson(ibmiJsonUri: Uri, buildMap?: Map<string, IBMiJsonT>): Promise<IBMiJsonT | undefined> {
    buildMap = buildMap || await this.getBuildMap();
    const ibmiJson = buildMap.get(ibmiJsonUri.fsPath);

    if (ibmiJson) {
      return ibmiJson;
    } else {
      // Recursively search in parent .ibmi.json as long as parent directory is in workspace folder
      const parentDirectoryUri = Uri.file(path.parse(ibmiJsonUri.fsPath).dir);
      const parentDirectoryWorkspaceFolder = workspace.getWorkspaceFolder(parentDirectoryUri);
      if (parentDirectoryWorkspaceFolder === this.workspaceFolder) {
        return await this.getIbmiJson(parentDirectoryUri, buildMap);
      }
    }
  }

  public async addToIncludePaths(directoryToAdd: string) {
    const deployDir = this.getDeployDir();
    if (deployDir) {
      const relative = path.posix.relative(deployDir, directoryToAdd);

      if (!relative.startsWith("..") && relative !== '') {
        directoryToAdd = relative;
      }
    }

    const unresolvedState = await this.getUnresolvedState();
    if (unresolvedState) {
      if (unresolvedState.includePath) {
        if (!unresolvedState.includePath.includes(directoryToAdd)) {
          unresolvedState.includePath.push(directoryToAdd);
        } else {
          window.showErrorMessage(l10n.t('{0} already exists in includePaths', directoryToAdd));
          return;
        }
      } else {
        unresolvedState.includePath = [directoryToAdd];
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async configureAsVariable(attribute: keyof IProjectT, variable: string, value: string) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = (unresolvedState[attribute] as string[]).indexOf(value);
      if (index > -1) {
        (unresolvedState[attribute] as string[])[index] = `&${variable}`;
      } else {
        window.showErrorMessage(l10n.t('{0} does not exist in {1}', value, attribute));
      }

      await this.updateEnv(variable, value);
      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async removeFromIncludePaths(directoryToRemove: string) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = unresolvedState.includePath ? unresolvedState.includePath.indexOf(directoryToRemove) : -1;
      if (index > -1) {
        unresolvedState.includePath!.splice(index, 1);
      } else {
        window.showErrorMessage(l10n.t('{0} does not exist in includePath', directoryToRemove));
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async moveIncludePath(pathToMove: string, direction: Direction) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = unresolvedState.includePath ? unresolvedState.includePath.indexOf(pathToMove) : -1;

      if (index > -1) {
        if (direction === 'up') {
          if (index > 0) {
            [unresolvedState.includePath![index - 1], unresolvedState.includePath![index]] =
              [unresolvedState.includePath![index], unresolvedState.includePath![index - 1]];
          }
        } else {
          if (index < unresolvedState.includePath!.length - 1) {
            [unresolvedState.includePath![index], unresolvedState.includePath![index + 1]] =
              [unresolvedState.includePath![index + 1], unresolvedState.includePath![index]];
          }
        }

      } else {
        window.showErrorMessage(l10n.t('{0} does not exist in includePath', pathToMove));
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async setTargetLibraryForCompiles(library: string) {
    const unresolvedState = await this.getUnresolvedState();
    const state = await this.getState();

    if (unresolvedState && state) {
      if (state.objlib === library && unresolvedState.objlib) {
        window.showErrorMessage(l10n.t('Target library for compiles already set to {0}', library));
        return;
      } else if (unresolvedState.objlib && unresolvedState.objlib.startsWith('&')) {
        await this.updateEnv(unresolvedState.objlib.substring(1), library);
        return;
      } else {
        await this.updateEnv(DEFAULT_OBJLIB.substring(1), library);
        unresolvedState.objlib = DEFAULT_OBJLIB;
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async getLibraryList(): Promise<LibraryList | undefined> {
    if (!this.libraryList) {
      await this.updateLibraryList();
    }
    return this.libraryList;
  }

  public setLibraryList(libraryList: LibraryList | undefined) {
    this.libraryList = libraryList;
  }

  public async updateLibraryList() {
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
          const libraries = libraryListString.split(`\n`);

          let libraryList: { name: string, libraryType: string }[] = [];
          for (const library of libraries) {
            libraryList.push({
              name: library.substring(0, 10).trim(),
              libraryType: library.substring(12)
            });
          }

          const libraryListInfo = await ibmi?.getContent().getLibraryList(libraryList.map(lib => lib.name));
          if (libraryListInfo) {
            let libl = [];
            for (const [index, library] of libraryList.entries()) {
              libl.push({
                libraryInfo: libraryListInfo[index],
                libraryType: library.libraryType
              });
            }

            this.libraryList = libl;

            if (libl.toString() !== this.libraryList.toString()) {
              ProjectManager.fire({ type: 'libraryList', iProject: this });
            }
          }
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
          window.showErrorMessage(l10n.t('{0} already exists in {1}', library, position));
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
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async setCurrentLibrary(library: string) {
    const unresolvedState = await this.getUnresolvedState();
    const state = await this.getState();

    if (unresolvedState && state) {
      if (state.curlib === library) {
        window.showErrorMessage(l10n.t('Current library already set to {0}', library));
        return;
      } else if (unresolvedState.curlib && unresolvedState.curlib.startsWith('&')) {
        await this.updateEnv(unresolvedState.curlib.substring(1), library);
        return;
      } else {
        await this.updateEnv(DEFAULT_CURLIB.substring(1), library);

        unresolvedState.curlib = DEFAULT_CURLIB;
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async removeFromLibraryList(library: string, type: LibraryType) {
    const unresolvedState = await this.getUnresolvedState();
    let attribute: keyof IProjectT;

    if (unresolvedState) {
      if (type === LibraryType.currentLibrary) {
        attribute = 'curlib';

        if (unresolvedState.curlib?.startsWith('&')) {
          await this.updateEnv(unresolvedState.curlib.substring(1), '');
          return;
        } else {
          unresolvedState.curlib = undefined;
        }
      } else {
        const state = await this.getState();

        if (state) {
          attribute = type === LibraryType.preUserLibrary ? 'preUsrlibl' : 'postUsrlibl';

          let libIndex = -1;
          if (unresolvedState[attribute] && state[attribute] && state[attribute]!.includes(library)) {
            libIndex = state[attribute]!.indexOf(library);

            if (libIndex > -1) {
              if (unresolvedState[attribute]![libIndex].startsWith('&')) {
                await this.updateEnv(unresolvedState[attribute]![libIndex].substring(1), '');
                return;
              } else {
                unresolvedState[attribute]!.splice(libIndex, 1);
              }
            }
          }

          if (libIndex < 0) {
            window.showErrorMessage(l10n.t('{0} does not exist in {1}', library, attribute));
            return;
          }
        }
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async moveLibrary(library: string, type: LibraryType, direction: Direction) {
    const unresolvedState = await this.getUnresolvedState();
    let attribute: keyof IProjectT;

    if (unresolvedState) {
      if (type === LibraryType.preUserLibrary || LibraryType.postUserLibrary) {
        attribute = type === LibraryType.preUserLibrary ? 'preUsrlibl' : 'postUsrlibl';
        const libIndex = unresolvedState[attribute] ? unresolvedState[attribute]!.indexOf(library) : -1;

        if (libIndex > -1) {
          if (direction === 'up') {
            if (libIndex > 0) {
              [unresolvedState[attribute]![libIndex - 1], unresolvedState[attribute]![libIndex]] =
                [unresolvedState[attribute]![libIndex], unresolvedState[attribute]![libIndex - 1]];
            }
          } else {
            if (libIndex < unresolvedState[attribute]!.length - 1) {
              [unresolvedState[attribute]![libIndex], unresolvedState[attribute]![libIndex + 1]] =
                [unresolvedState[attribute]![libIndex + 1], unresolvedState[attribute]![libIndex]];
            }
          }
        }

        if (libIndex < 0) {
          window.showErrorMessage(l10n.t('{0} does not exist in {1}', library, attribute));
          return;
        }

        await this.updateIProj(unresolvedState);
      }
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  public async updateIProj(iProject: IProjectT): Promise<boolean> {
    try {
      await workspace.fs.writeFile(this.getProjectFileUri('iproj.json'), new TextEncoder().encode(JSON.stringify(iProject, null, 2)));
      this.state = undefined;
      this.libraryList = undefined;
      return true;
    } catch {
      window.showErrorMessage(l10n.t('Failed to update iproj.json'));
      return false;
    }
  }

  public async createProject(description: string): Promise<boolean> {
    try {
      const content = {
        description: description
      };

      await workspace.fs.writeFile(this.getProjectFileUri('iproj.json'), new TextEncoder().encode(JSON.stringify(content, null, 2)));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async createEnv(): Promise<boolean> {
    try {
      const variables = (await this.getVariables()).map(variable => variable + '=').join('\n');

      await workspace.fs.writeFile(this.getProjectFileUri('.env'), new TextEncoder().encode(variables));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getEnv(): Promise<EnvironmentVariables> {
    try {
      const content = await workspace.fs.readFile(this.getProjectFileUri('.env'));
      this.environmentValues = dotenv.parse(Buffer.from(content));
    } catch (e) {
      this.environmentValues = {};
    }

    return this.environmentValues;
  }

  public async updateEnv(variable: string, value: string) {
    const envUri = this.getProjectFileUri('.env');
    const isEnvVarUpdated = await envUpdater(envUri, { [variable]: value });

    if (isEnvVarUpdated) {
      this.state = undefined;
      this.libraryList = undefined;
    }
  }

  public async getVariables(): Promise<string[]> {
    const unresolvedState = await this.getUnresolvedState();
    if (!unresolvedState) {
      return [];
    }

    const buildMap = await this.getBuildMap();

    const valueList: string[] = [
      unresolvedState.curlib,
      unresolvedState.objlib,
      ...(unresolvedState.postUsrlibl ? unresolvedState.postUsrlibl : []),
      ...(unresolvedState.preUsrlibl ? unresolvedState.preUsrlibl : []),
      ...(unresolvedState.includePath ? unresolvedState.includePath : []),
      ...(Array.from(buildMap.values()).filter(ibmiJson => ibmiJson.build).map(ibmiJson => ibmiJson.build!.objlib))
    ].filter(x => x) as string[];

    // Get everything that starts with an &
    const variableNameList = valueList.filter(value => value.startsWith(`&`)).map(value => value.substring(1));

    // Remove duplicates
    return variableNameList.filter((name,
      index) => variableNameList.indexOf(name) === index);
  }

  public async getObjectLibraries(): Promise<Set<string> | undefined> {
    const unresolvedState = await this.getUnresolvedState();
    if (unresolvedState) {
      const objLibs = new Set<string>();
      if (unresolvedState.curlib) {
        objLibs.add(unresolvedState.curlib);
      }
      if (unresolvedState.preUsrlibl) {
        for (const lib of unresolvedState.preUsrlibl) {
          objLibs.add(lib);
        }
      }
      if (unresolvedState.postUsrlibl) {
        for (const lib of unresolvedState.postUsrlibl) {
          objLibs.add(lib);
        }
      }

      unresolvedState.objlib ? objLibs.add(unresolvedState.objlib) : null;

      return objLibs;
    }
  }

  public getDeployDir(): string | undefined {
    const ibmi = getInstance();
    const deploymentDirs = ibmi?.getStorage().getDeployment()!;
    return deploymentDirs[this.workspaceFolder.uri.fsPath];
  }

  public getJobLogs(): JobLogInfo[] {
    return this.jobLogs.toArray();
  }

  public async readJobLog() {
    const jobLogExists = await this.projectFileExists('joblog.json');
    if (jobLogExists) {
      const content = await workspace.fs.readFile(this.getProjectFileUri('joblog.json'));
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

  public static validateIProject(content: string): IProjectT {
    const iproj = JSON.parse(content);

    // Validate iproj here

    return iproj;
  }

  public static validateJobLog(content: string): JobLogInfo {
    const jobLog = JSON.parse(content);

    // Validate jobLog here

    return new JobLogInfo(jobLog);
  }
}