/*
 * (c) Copyright IBM Corp. 2023
 */

import { Action, DeploymentMethod, DeploymentParameters, IBMiObject } from "@halcyontech/vscode-ibmi-types";
import * as dotenv from 'dotenv';
import { ValidatorResult } from "jsonschema";
import * as path from "path";
import { TextEncoder } from "util";
import { commands, l10n, Uri, window, workspace, WorkspaceFolder } from "vscode";
import envUpdater from "./envUpdater";
import { getDeployTools, getInstance } from "./ibmi";
import { IBMiJsonT } from "./ibmiJsonT";
import { IProjectT } from "./iProjectT";
import { JobLogInfo } from "./jobLog";
import { ProjectManager } from "./projectManager";
import { RingBuffer } from "./views/jobLog/RingBuffer";
import { LibraryType } from "./views/projectExplorer/library";

/**
 * Represents the default variable for a project's current library.
 */
export const DEFAULT_CURLIB = '&CURLIB';

/**
 * Represents the default variable for a project's object library.
 */
export const DEFAULT_OBJLIB = '&OBJLIB';

/**
 * Represents a file that stores project information.
 */
export type ProjectFileType = 'iproj.json' | '.ibmi.json' | 'joblog.json' | 'output.log' | '.env';

/**
 * Represents a project's library list.
 */
export type LibraryList = { libraryInfo: IBMiObject; libraryType: string; }[];

/**
 * Represents the environment variables in a `.env` file.
 */
export type EnvironmentVariables = { [name: string]: string };

/**
 * Represents the direction an entry should be moved.
 */
export type Direction = 'up' | 'down';

/**
 * Represents the position of an entry.
 */
export type Position = 'first' | 'last' | 'middle';

/**
 * Represents an IBM i Project.
 */
export class IProject {
  /**
   * The project's name.
   */
  private name: string;

  /**
   * An object that represents the contents of the project's `iproj.json` with
   * variables resolved based on the project's `.env` file.
   */
  private state: IProjectT | undefined;

  /**
   * A map of directory locations and the content of each `.ibmi.json` file in
   * a project. *Note* that for the root `.ibmi.json` file, the contents of the
   * `iproj.json` file will take precedence. Variables at each location of the
   * build map are also not resolved.
   */
  private buildMap: Map<string, IBMiJsonT> | undefined;

  /**
   * The project's library list.
   */
  private libraryList: LibraryList | undefined;

  /**
   * Represents the project's current and old job logs maintained in memory.
   */
  private jobLogs: RingBuffer<JobLogInfo>;

  /**
   * Represents the project's environment variables stored in the `.env` file.
   */
  private environmentValues: EnvironmentVariables;

  /**
   * Represents the project's current deployment method.
   */
  private deploymentMethod: DeploymentMethod;

  /**
   * Represents the validation result of the project against the `iproj.json`
   * schema.
   */
  private validatorResult: ValidatorResult | undefined;

  constructor(public workspaceFolder: WorkspaceFolder) {
    this.name = workspaceFolder.name;
    this.state = undefined;
    this.buildMap = undefined;
    this.libraryList = undefined;
    this.jobLogs = new RingBuffer<JobLogInfo>(10);
    this.environmentValues = {};
    this.deploymentMethod = 'compare';
  }

  /**
   * Get the project's name. *Note* that the project's name and associated
   * workspace folder name are the same.
   * 
   * @returns Project name.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the uri of a project file. *Note* that the `directory` parameter should
   * be passed in when the desired project file is a directory level `.ibmi.json`
   * that is not in the root directory.
   * 
   * @param type A type of project file.
   * @param directory The directory containing the project file.
   * @returns A uri of the desired resource.
   */
  public getProjectFileUri(type: ProjectFileType, directory?: Uri): Uri {
    const logDirectory = (type === 'joblog.json' || type === 'output.log') ? `.logs` : ``;

    return Uri.file(path.join(directory ? directory.fsPath : this.workspaceFolder.uri.fsPath, logDirectory, type));
  }

  /**
   * Check if a project file exists. *Note* that the `directory` parameter should
   * be passed in when the desired project file is a directory level `.ibmi.json`
   * that is not in the root directory.
   * 
   * @param type A type of project file.
   * @param directory The directory containing the project file.
   * @returns True if the file exists and false otherwise.
   */
  public async projectFileExists(type: ProjectFileType, directory?: Uri): Promise<boolean> {
    const fileUri = this.getProjectFileUri(type, directory);

    try {
      await workspace.fs.stat(fileUri);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the resolved value for a variable given the project's environment
   * variables. *Note* that the resolved value for a variable can be the
   * variable itself if the corresponding environment variable does not exist.
   * 
   * @param variable The variable to resolve.
   * @param values The environment variables.
   * @returns The resolved value for the variable.
   */
  public resolveVariable(variable: string, values: EnvironmentVariables): string {
    if (variable && variable.startsWith('&') && values[variable.substring(1)] && values[variable.substring(1)] !== '') {
      return values[variable.substring(1)];
    }

    return variable;
  }

  /**
   * Get the project's state which is an object that represents the contents of
   * the project's `iproj.json` with variables resolved based on the project's
   * `.env` file. *Note* that `undefined` will be returned when the project does
   * not have an `iproj.json`.
   * 
   * @returns The project state or `undefined`.
   */
  public async getState(): Promise<IProjectT | undefined> {
    if (!this.state) {
      await this.updateState();
    }
    return this.state;
  }

  /**
   * Update the project's state by retrieving the raw `iproj.json` and resolving
   * all variables.
   */
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

      if (unresolvedState.extensions) {
        for (const [vendor, vendorAttributes] of unresolvedState.extensions) {
          if (vendorAttributes) {
            for (const [key, value] of Object.entries(vendorAttributes)) {
              if (typeof value === 'string') {
                (vendorAttributes as any)[key] = this.resolveVariable(value, values);
              }
            }

            unresolvedState.extensions.set(vendor, vendorAttributes);
          }
        };
      }
    }

    this.state = unresolvedState;
  }

  /**
   * Set the project's state. *Note* that setting the state to be `undefined`
   * represents the current state is invalid and will be automatically updated
   * whenever it is retrieved again.
   * 
   * @param state The project state to set or `undefined`.
   */
  public setState(state: IProjectT | undefined) {
    this.state = state;
  }

  /**
   * Get the project's unresolved state which is an object that represents the
   * contents of the project's `iproj.json` with variables not being resolved. *Note*
   * that `undefined` will be returned when the project does not have an `iproj.json`.
   * 
   * @returns The project state or `undefined`.
   */
  public async getUnresolvedState(): Promise<IProjectT | undefined> {
    const content = (await workspace.fs.readFile(this.getProjectFileUri('iproj.json'))).toString();
    let unresolvedState: IProjectT | undefined;
    try {
      unresolvedState = JSON.parse(content, (key, value) => {
        if (key === 'extensions') {
          return new Map(Object.entries(value));
        }

        return value;
      });
    } catch (e) { }

    const validator = ProjectManager.getValidator();
    const schema = validator.schemas['/iproj'];
    const validatorResult = validator.validate(unresolvedState || content, schema);

    if (validatorResult && validatorResult.errors.length > 0 && content.trim() !== '') {
      this.validatorResult = validatorResult;
      return undefined;
    } else {
      this.validatorResult = undefined;
      return unresolvedState;
    }
  }

  /**
   * Get the project's build map which represents a map of directory locations
   * and the content of each `.ibmi.json` file in a project. *Note* that for
   * the root `.ibmi.json` file, the contents of the `iproj.json` file will
   * take precedence.
   * 
   * @returns The build map or `undefined`.
   */
  public async getBuildMap(): Promise<Map<string, IBMiJsonT> | undefined> {
    if (!this.buildMap) {
      await this.updateBuildMap();
    }
    return this.buildMap;
  }

  /**
   * Update the project's build map by retrieving all `.ibmi.json` files in
   * the project and the root `iproj.json`.
   */
  public async updateBuildMap() {
    const buildMap = new Map();

    const ibmiJsonUris = await workspace.findFiles('**/.ibmi.json');
    for await (const ibmiJsonUri of ibmiJsonUris) {
      try {
        const ibmiJsonContent: IBMiJsonT = JSON.parse((await workspace.fs.readFile(ibmiJsonUri)).toString());
        if (ibmiJsonContent && ibmiJsonContent.build) {
          buildMap.set(path.dirname(ibmiJsonUri.fsPath), ibmiJsonContent);
        }
      } catch { }
    };

    const rootIBMiJson = buildMap.get(this.workspaceFolder.uri.fsPath);
    const unresolvedState = await this.getUnresolvedState();
    buildMap.set(this.workspaceFolder.uri.fsPath,
      {
        version: rootIBMiJson?.version || unresolvedState?.version,
        build: {
          objlib: rootIBMiJson?.build?.objlib || unresolvedState?.objlib || unresolvedState?.curlib,
          tgtCcsid: rootIBMiJson?.build?.tgtCcsid
        }
      }
    );

    this.buildMap = buildMap;
  }

  /**
   * Set the project's build map. *Note* that setting the build map to be
   * `undefined` represents the current build map is invalid and will be
   * automatically updated whenever it is retrieved again.
   * 
   * @param buildMap The project build map to set or `undefined`.
   */
  public setBuildMap(buildMap: Map<string, IBMiJsonT> | undefined) {
    this.buildMap = buildMap;
  }

  /**
   * Get the unresolved content of a project's `.ibmi.json` file if it exists.
   * 
   * @param directory The directory of the `.ibmi.json` file.
   * @returns The `.ibmi.json` content or `undefined.
   */
  public async getUnresolvedIBMiJson(directory: Uri): Promise<IBMiJsonT | undefined> {
    try {
      const content = await workspace.fs.readFile(this.getProjectFileUri('.ibmi.json', directory));
      return JSON.parse(content.toString());
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Get the resolved content of a project's `.ibmi.json` file which is an object
   * that is constructed based on the desired directory level `.ibmi.json` file
   * and the parent directories. *Note* that variables are not resolved.
   * 
   * @param directory The directory of the `.ibmi.json` file.
   * @param buildMap The project's build map.
   * @param resolvedIBMiJson The currently resolved object.
   * @returns The resolved `.ibmi.json` content or `undefined`.
   */
  public async getIBMiJson(directory: Uri, buildMap?: Map<string, IBMiJsonT>, resolvedIBMiJson?: IBMiJsonT): Promise<IBMiJsonT | undefined> {
    buildMap = buildMap || await this.getBuildMap();
    if (!buildMap) {
      return;
    }

    const ibmiJson = buildMap.get(directory.fsPath);
    if (ibmiJson && ibmiJson.build) {
      if (!resolvedIBMiJson) {
        resolvedIBMiJson = {
          version: undefined,
          build: {
            objlib: undefined,
            tgtCcsid: undefined
          }
        };
      }

      if (!resolvedIBMiJson.version && ibmiJson.version) {
        resolvedIBMiJson.version = ibmiJson.version;
      }

      if (!resolvedIBMiJson.build!.objlib && ibmiJson.build.objlib) {
        resolvedIBMiJson.build!.objlib = ibmiJson.build.objlib;
      }

      if (!resolvedIBMiJson.build!.tgtCcsid && ibmiJson.build.tgtCcsid) {
        resolvedIBMiJson.build!.tgtCcsid = ibmiJson.build.tgtCcsid;
      }

      if (resolvedIBMiJson.build!.objlib && resolvedIBMiJson.build!.tgtCcsid && resolvedIBMiJson.version) {
        return resolvedIBMiJson;
      } else {
        return await this.searchParentIBMiJson(directory, buildMap, resolvedIBMiJson);
      }
    } else {
      return await this.searchParentIBMiJson(directory, buildMap, resolvedIBMiJson);
    }
  }

  /**
   * Recursively resolve the `.ibmi.json` file at a directory by searching for values
   * from parent directories as long as the parent directory is contained in the
   * workspace folder associated with the project.
   * 
   * @param directory The directory of the `.ibmi.json` file.
   * @param buildMap The project's build map.
   * @param ibmiJson The current `.ibmi.json` content.
   * @returns The resolved `.ibmi.json` content or `undefined`.
   */
  private async searchParentIBMiJson(directory: Uri, buildMap?: Map<string, IBMiJsonT>, ibmiJson?: IBMiJsonT): Promise<IBMiJsonT | undefined> {
    const parentDirectory = Uri.file(path.parse(directory.fsPath).dir);
    const parentDirectoryWorkspaceFolder = workspace.getWorkspaceFolder(parentDirectory);
    if (parentDirectoryWorkspaceFolder === this.workspaceFolder) {
      return await this.getIBMiJson(parentDirectory, buildMap, ibmiJson);
    } else {
      return ibmiJson;
    }
  }

  /**
   * Run the project's build or compile command.
   * 
   * @param isBuild True for build command and false for compile command.
   * @param fileUri The file uri to compile or `undefined` for builds.
   */
  public async runBuildOrCompileCommand(isBuild: boolean, fileUri?: Uri) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const command = isBuild ? unresolvedState.buildCommand : unresolvedState.compileCommand;

      if (command) {
        // Delete existing directories
        const directoryUris = ['.logs', '.evfevent'].map(dir => Uri.file(path.join(this.workspaceFolder.uri.fsPath, dir)));
        for await (const uri of directoryUris) {
          try {
            await workspace.fs.stat(uri);
            await workspace.fs.delete(uri, { recursive: true });
          } catch { }
        }

        // Create directories
        for await (const uri of directoryUris) {
          await workspace.fs.createDirectory(uri);
        }

        const action: Action = {
          name: command,
          command: command,
          environment: `pase`,
          extensions: [`GLOBAL`],
          deployFirst: true,
          type: `file`,
          postDownload: [
            ".logs",
            ".evfevent"
          ]
        };
        await commands.executeCommand(`code-for-ibmi.runAction`, { resourceUri: fileUri ? fileUri : this.workspaceFolder.uri }, undefined, action, this.deploymentMethod);
        ProjectManager.fire({ type: isBuild ? 'build' : 'compile', iProject: this });
      } else {
        if (isBuild) {
          window.showErrorMessage(l10n.t('Project\'s build command not set'), l10n.t('Set Build Command'))
            .then(async (item) => {
              if (item === l10n.t('Set Build Command')) {
                await commands.executeCommand(`vscode-ibmi-projectexplorer.projectExplorer.setBuildCommand`, this);
              }
            });
        } else {
          window.showErrorMessage(l10n.t('Project\'s compile command not set'), l10n.t('Set Compile Command'))
            .then(async (item) => {
              if (item === l10n.t('Set Compile Command')) {
                await commands.executeCommand(`vscode-ibmi-projectexplorer.projectExplorer.setCompileCommand`, this);
              }
            });
        }
      }
    }
  }

  /**
   * Set the `buildCommand` or `compileCommand` attribute of the project's
   * `iproj.json.
   * 
   * @param command The command to set.
   * @param isBuild True for build command and false for compile command.
   */
  public async setBuildOrCompileCommand(command: string, isBuild: boolean) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const attribute = isBuild ? 'buildCommand' : 'compileCommand';

      if (unresolvedState[attribute] === command) {
        window.showErrorMessage(isBuild ? l10n.t('Build command already set to {0}', command) : l10n.t('Compile command already set to {0}', command));
        return;
      } else {
        unresolvedState[attribute] = command;
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  /**
   * Add a directory to the `includePath` attribute of the project's `iproj.json`
   * file. *Note* that directories will be resolved based on the project's
   * workspace folder or deploy location.
   * 
   * @param directory The directory to add.
   */
  public async addToIncludePaths(directory: string) {
    // Attempt to get the relative path to the project's workspace folder first and then try the deploy location
    const workspaceFolderPath = this.workspaceFolder.uri.path;
    const deployLocation = this.getDeployLocation();
    for (const parent of [workspaceFolderPath, deployLocation]) {
      if (parent) {
        const relative = path.posix.relative(parent, directory);

        if (!relative.startsWith("..") && relative !== '') {
          directory = relative;
          break;
        }
      }
    }

    const unresolvedState = await this.getUnresolvedState();
    if (unresolvedState) {
      if (unresolvedState.includePath) {
        if (!unresolvedState.includePath.includes(directory)) {
          unresolvedState.includePath.push(directory);
        } else {
          window.showErrorMessage(l10n.t('{0} already exists in includePaths', directory));
          return;
        }
      } else {
        unresolvedState.includePath = [directory];
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  /**
   * Configure a hardcoded value in the attributes of the project's`iproj.json` file
   * to a variable. *Note* that the variable and value will also be added to the 
   * project's `.env` file.
   * 
   * @param attributes The attributes to update.
   * @param variable The variable to set.
   * @param value The value of the variable.
   */
  public async configureAsVariable(attributes: (keyof IProjectT)[], variable: string, value: string) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      for (const attribute of attributes) {
        if (attribute === 'curlib' || attribute === 'objlib') {
          unresolvedState[attribute] = `&${variable}`;
        } else {
          const index = (unresolvedState[attribute] as string[]).indexOf(value);
          if (index > -1) {
            (unresolvedState[attribute] as string[])[index] = `&${variable}`;
          } else {
            window.showErrorMessage(l10n.t('{0} does not exist in {1}', value, attribute));
          }
        }
      }

      await this.updateEnv(variable, value);
      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  /**
   * Remove a directory from the `includePath` attribute of the project's
   * `iproj.json` file.
   * @param directory The directory to remove.
   */
  public async removeFromIncludePaths(directory: string) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = unresolvedState.includePath ? unresolvedState.includePath.indexOf(directory) : -1;
      if (index > -1) {
        unresolvedState.includePath!.splice(index, 1);
      } else {
        window.showErrorMessage(l10n.t('{0} does not exist in includePath', directory));
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  /**
   * Move a directory up or down in the `includePath` attribute of the
   * project's `iproj.json` file.
   * 
   * @param directory The directory to move.
   * @param direction The direction the directory should be moved in.
   */
  public async moveIncludePath(directory: string, direction: Direction) {
    const unresolvedState = await this.getUnresolvedState();

    if (unresolvedState) {
      const index = unresolvedState.includePath ? unresolvedState.includePath.indexOf(directory) : -1;

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
        window.showErrorMessage(l10n.t('{0} does not exist in includePath', directory));
      }

      await this.updateIProj(unresolvedState);
    } else {
      window.showErrorMessage(l10n.t('No iproj.json found'));
    }
  }

  /**
   * Set the `objlib` attribute of the project's `iproj.json` file. *Note*
   * that if the current value is a hardcoded library, the default `&OBJLIB`
   * variable will be set and the variable and value will be added to the
   * project's `.env` file. If the current value is a variable, the variable's
   * value will be updated in the `.env` file.
   * 
   * @param library The library to set.
   */
  public async setAsTargetLibraryForCompiles(library: string) {
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

  /**
   * Set the `objlib` attribute of a project's directory level `.ibmi.json` file to
   * a variable and assign a value that will be stored in the project's `.env` file.
   * 
   * @param library The library to set.
   * @param variable The variable to set.
   * @param directory The directory of the `.ibmi.json` file.
   */
  public async setTargetLibraryForCompiles(library: string, variable: string, directory: Uri) {
    let unresolvedIBMiJson = await this.getUnresolvedIBMiJson(directory);
    let ibmiJson = await this.getIBMiJson(directory);

    if (ibmiJson?.build?.objlib === library) {
      window.showErrorMessage(l10n.t('Target library for compiles already set to {0} in {1}', library, directory.fsPath));
      return;
    } else if (unresolvedIBMiJson) {
      await this.updateEnv(variable, library);
      if (unresolvedIBMiJson.build) {
        unresolvedIBMiJson.build.objlib = `&${variable}`;
      } else {
        unresolvedIBMiJson.build = {
          objlib: `&${variable}`
        };
      }
    } else {
      await this.updateEnv(variable, library);
      unresolvedIBMiJson = {
        build: {
          objlib: `&${variable}`
        }
      };
    }

    await this.updateIBMiJson(unresolvedIBMiJson, directory);
  }

  /**
   * Set the `tgtCcsid` attribute of a project's directory level `.ibmi.json` file.
   * 
   * @param tgtCcsid The target CCSID to set.
   * @param directory The directory of the `.ibmi.json` file.
   */
  public async setTargetCCSIDForCompiles(tgtCcsid: string, directory: Uri) {
    let unresolvedIBMiJson = await this.getUnresolvedIBMiJson(directory);
    let ibmiJson = await this.getIBMiJson(directory);

    if (ibmiJson?.build?.tgtCcsid === tgtCcsid) {
      window.showErrorMessage(l10n.t('Target CCSID for compiles already set to {0} in {1}', tgtCcsid, directory.fsPath));
      return;
    } else if (unresolvedIBMiJson) {
      if (unresolvedIBMiJson.build) {
        unresolvedIBMiJson.build.tgtCcsid = tgtCcsid;
      } else {
        unresolvedIBMiJson.build = {
          tgtCcsid: tgtCcsid
        };
      }
    } else {
      unresolvedIBMiJson = {
        build: {
          tgtCcsid: tgtCcsid
        }
      };
    }

    await this.updateIBMiJson(unresolvedIBMiJson, directory);
  }

  /**
   * Get the project's library list.
   * 
   * @returns The project's library list or `undefined`.
   */
  public async getLibraryList(): Promise<LibraryList | undefined> {
    if (!this.libraryList) {
      await this.updateLibraryList();
    }
    return this.libraryList;
  }

  /**
   * Update the project's library list by retrieving the resolved `curlib`,
   * `preUsrlibl`, and `postUsrlibl` of the project's `iproj.json` file.
   * *Note* that the library list will be validated using the connection.
   */
  public async updateLibraryList() {
    const ibmi = getInstance();

    if (ibmi && ibmi.getConnection()) {
      const defaultUserLibraries = ibmi.getConnection().defaultUserLibraries;

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
        const badLibs = await ibmi.getContent().validateLibraryList(librariesToValidate);
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

        const liblResult = await ibmi.getConnection().sendQsh({
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

            const libraryListInfo = await ibmi.getContent().getLibraryList(libraryList.map(lib => lib.name));
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
  }

  /**
   * Set the project's library list. *Note* that setting the library list to
   * be `undefined` represents the current library list is invalid and will
   * be automatically updated whenever it is retrieved again.
   * 
   * @param libraryList The library list to set or `undefined`.
   */
  public setLibraryList(libraryList: LibraryList | undefined) {
    this.libraryList = libraryList;
    ProjectManager.fire({ type: 'libraryList', iProject: this });
  }

  /**
   * Add a library to the `preUsrlibl` or `postUsrlibl` attribute of the project's
   * `iproj.json` file. *Note* that adding to the `preUsrlibl` will add to the front
   * of the current entries while adding to the `postUsrlibl` will add to the end of
   * the current entries.
   * 
   * @param library The library to add.
   * @param position The attribute the library should be added to.
   */
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

  /**
    * Set the `curlib` attribute of the project's `iproj.json` file. *Note*
    * that if the current value is a hardcoded library, the default `&CURLIB`
    * variable will be set and the variable and value will be added to the
    * project's `.env` file. If the current value is a variable, the variable's
    * value will be updated in the `.env` file.
    * 
    * @param library The library to set.
    */
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

  /**
   * Remove a library from the `curlib`, `preUsrlibl`, or `postUsrlibl` attribute
   * of the project's `iproj.json` file.
   * 
   * @param library The library to remove.
   * @param type The type of library.
   */
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

  /**
   * Move a library up or down in the `preUsrlibl` or `postUsrlibl` attribute
   * of the project's `iproj.json` file.
   * 
   * @param library The library to move.
   * @param type The type of library.
   * @param direction The direction the library should be moved in.
   */
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

  /**
   * Create an `iproj.json` file for the project with a description.
   * 
   * @param description The project description to set.
   * @returns True if the operation was successful and false otherwise.
   */
  public async createIProj(description: string): Promise<boolean> {
    const iProject: IProjectT = {
      description: description
    };

    return await this.updateIProj(iProject);
  }

  /**
   * Update the project's `iproj.json` file.
   * 
   * @param iProject The content to be written to the `iproj.json` file.
   * @returns True if the operation was successful and false otherwise.
   */
  public async updateIProj(iProject: IProjectT): Promise<boolean> {
    try {
      const content = JSON.stringify(iProject, (key, value) => {
        if (key === 'extensions') {
          return Object.fromEntries(value);
        }

        return value;
      }, 2);

      await workspace.fs.writeFile(this.getProjectFileUri('iproj.json'), new TextEncoder().encode(content));
      this.setState(undefined);
      this.setBuildMap(undefined);
      this.setLibraryList(undefined);
      return true;
    } catch {
      window.showErrorMessage(l10n.t('Failed to update iproj.json'));
      return false;
    }
  }

  /**
   * Update a directory level `.ibmi.json` file in the project.
   * 
   * @param ibmiJson The content to be written to the `iproj.json` file.
   * @param directory The directory of the `.ibmi.json` file.
   * @returns True if the operation was successful and false otherwise.
   */
  public async updateIBMiJson(ibmiJson: IBMiJsonT, directory: Uri): Promise<boolean> {
    try {
      await workspace.fs.writeFile(this.getProjectFileUri('.ibmi.json', directory), new TextEncoder().encode(JSON.stringify(ibmiJson, null, 2)));
      this.setBuildMap(undefined);
      return true;
    } catch {
      window.showErrorMessage(l10n.t('Failed to update .ibmi.json'));
      return false;
    }
  }

  /**
   * Create a `.env` file for the project with all project variables.
   * 
   * @returns True if the operation was successful and false otherwise.
   */
  public async createEnv(): Promise<boolean> {
    try {
      const variables = (await this.getVariables()).map(variable => variable + '=').join('\n');

      await workspace.fs.writeFile(this.getProjectFileUri('.env'), new TextEncoder().encode(variables));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the environment variables for the project stored in the `.env` file.
   * @returns 
   */
  public async getEnv(): Promise<EnvironmentVariables> {
    try {
      const content = await workspace.fs.readFile(this.getProjectFileUri('.env'));
      this.environmentValues = dotenv.parse(Buffer.from(content));
    } catch (e) {
      this.environmentValues = {};
    }

    return this.environmentValues;
  }

  /**
   * Update an environment variable in the project's `.env` file. *Note* that
   * if the file does not exist, it will be created with given environment variable
   * and all project variables.
   * 
   * @param variable The variable to updated.
   * @param value The value to set.
   */
  public async updateEnv(variable: string, value: string) {
    const envUri = this.getProjectFileUri('.env');
    const isEnvVarUpdated = await envUpdater(envUri, { [variable]: value });

    if (isEnvVarUpdated) {
      this.state = undefined;
      this.libraryList = undefined;
    }
  }

  /**
   * Get the validation result of the project against the `iproj.json` schema.
   * 
   * @returns The validator result.
   */
  public getValidatorResult() {
    return this.validatorResult;
  }

  /**
   * Get all project variables from the `iproj.json` file and all directory
   * level `.ibmi.json` files.
   * 
   * @returns The project's variables.
   */
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
      ...(unresolvedState.extensions ? Array.from(unresolvedState.extensions.values())
        .flatMap(vendorAttributes => Object.values(vendorAttributes)) : []),
      ...(buildMap ? Array.from(buildMap.values())
        .filter(ibmiJson => ibmiJson.build)
        .map(ibmiJson => ibmiJson.build!.objlib) : [])
    ].filter(x => x) as string[];

    // Get everything that starts with an &
    const variableNameList = valueList.filter(value => value.startsWith(`&`)).map(value => value.substring(1));

    // Remove duplicates
    return variableNameList.filter((name,
      index) => variableNameList.indexOf(name) === index);
  }

  /**
   * Get the project's object libraries which includes all libraries defined
   * in the `objlib`, `curlib`, `preUsrlibl`, and `postUsrlibl` attributes
   * of the `iproj.json` file.
   * 
   * @returns The project's object libraries.
   */
  public async getObjectLibraries(): Promise<Map<string, LibraryType[]> | undefined> {
    const unresolvedState = await this.getUnresolvedState();
    if (unresolvedState) {
      const objLibs = new Map<string, LibraryType[]>();

      if (unresolvedState.objlib) {
        const libraryType = objLibs.get(unresolvedState.objlib);
        objLibs.set(unresolvedState.objlib, [
          LibraryType.objectLibrary,
          ...(libraryType ? libraryType : [])
        ]);
      }

      if (unresolvedState.curlib) {
        const libraryType = objLibs.get(unresolvedState.curlib);
        objLibs.set(unresolvedState.curlib, [
          LibraryType.currentLibrary,
          ...(libraryType ? libraryType : [])
        ]);
      }

      if (unresolvedState.preUsrlibl) {
        for (const lib of unresolvedState.preUsrlibl) {
          const libraryType = objLibs.get(lib);
          objLibs.set(lib, [
            LibraryType.preUserLibrary,
            ...(libraryType ? libraryType : [])
          ]);
        }
      }

      if (unresolvedState.postUsrlibl) {
        for (const lib of unresolvedState.postUsrlibl) {
          const libraryType = objLibs.get(lib);
          objLibs.set(lib, [
            LibraryType.postUserLibrary,
            ...(libraryType ? libraryType : [])
          ]);
        }
      }

      return objLibs;
    }
  }

  /**
   * Get the project's deploy location. *Note* that for a project that
   * has not set their deploy location, `undefined` will be returned.
   *
   * @returns The project's deploy location or `undefined`.
   */
  public getDeployLocation(): string | undefined {
    const ibmi = getInstance();
    const storage = ibmi?.getStorage();
    if (storage) {
      const deploymentDirs = storage.getDeployment()!;
      return deploymentDirs[this.workspaceFolder.uri.fsPath];
    }
  }

  /**
   * Get the project's default deploy location which is composed of
   * `/home/<user>/builds/<project_name>` or `/tmp/builds/<project_name>`
   * if there is no current user.
   * 
   * @returns The project's default deploy location.
   */
  public getDefaultDeployLocation() {
    const ibmi = getInstance();
    const user = ibmi?.getConnection().currentUser;
    return user ? path.posix.join('/', 'home', user, 'builds', this.workspaceFolder.name) : path.posix.join('/', 'tmp', 'builds', this.workspaceFolder.name);
  }

  /**
   * Get the project's deployment parameters which includes the workspace folder,
   * deployment method, remote path, and ignore rules.
   * 
   * @returns The project's deployment parameters or `undefined`.
   */
  public async getDeploymentParameters(): Promise<DeploymentParameters | undefined> {
    const deployLocation = this.getDeployLocation();

    if (deployLocation) {
      const deployTools = getDeployTools();

      return {
        method: this.deploymentMethod,
        workspaceFolder: this.workspaceFolder,
        remotePath: deployLocation,
        ignoreRules: await deployTools?.getDefaultIgnoreRules(this.workspaceFolder)
      };
    }
  }

  /**
   * Set the project's deployment method.
   * 
   * @param deploymentMethod The deployment method.
   */
  public setDeploymentMethod(deploymentMethod: DeploymentMethod) {
    this.deploymentMethod = deploymentMethod;
  }

  /**
   * Deploy the project using the current deployment parameters.
   */
  public async deployProject() {
    const deployTools = getDeployTools();
    await deployTools?.launchDeploy(this.workspaceFolder.index, this.deploymentMethod);
  }

  /**
   * Get all the project job logs which includes the local `joblog.json`
   * and any kept in memory.
   *
   * @returns The project's job logs.
   */
  public getJobLogs(): JobLogInfo[] {
    return this.jobLogs.toArray();
  }

  /**
   * Read the content of the local `joblog.json` file. *Note* that if the `cmd_time` is
   * different from the latest job log, it will be added to the array of job logs
   * maintained in memory.
   */
  public async readJobLog() {
    const jobLogExists = await this.projectFileExists('joblog.json');
    if (jobLogExists) {
      const content = (await workspace.fs.readFile(this.getProjectFileUri('joblog.json'))).toString();
      let jobLog: JobLogInfo | undefined;
      try {
        jobLog = new JobLogInfo(JSON.parse(content));
      } catch (e) { }

      if (jobLog) {
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
  }

  /**
   * Clear all old job logs maintained in memory.
   */
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
}