/*
 * (c) Copyright IBM Corp. 2023
 */

import { CancellationToken, commands, Event, EventEmitter, ExtensionContext, ProviderResult, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { getInstance } from "../../ibmi";
import { IProject, iProjectT } from "../../iproject";
import ErrorItem from "../../test/errorItem";
import IFSFolder from "./ifsFolder";
import Project from "./project";
import Streamfile from "./streamfile";
import Variables from "./variables";
import Variable from "./variable";
import envUpdater from "../../envUpdater";
import { ProjectManager } from "../../projectManager";
import { DecorationProvider } from "./decorationProvider";
import ObjectLibrary from "./objectlibrary";
import QSYSLib, { LibraryType } from "./qsysLib";
import PhysicalFile from "./physicalfile";
import File from "./file";
import LibraryList from "./libraryList";

export default class ProjectExplorer implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    const decorationProvider = new DecorationProvider();
    context.subscriptions.push(
      window.registerFileDecorationProvider(decorationProvider),
      commands.registerCommand(`vscode-ibmi-projectmode.projectExplorer.addLibraryListEntry`, async (element: LibraryList) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = await window.showInputBox({
              prompt: `Enter library name`
            });

            if (library) {
              const selectedPosition = await window.showQuickPick([
                'Beginning of Library List',
                'End of Library List'], {
                placeHolder: 'Choose where to position the library',
              });

              if (selectedPosition) {
                const position = (selectedPosition === 'Beginning of Library List') ? 'preUsrlibl' : 'postUsrlibl';
                await iProject.addToLibraryList(library, position);
              }
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.projectExplorer.setCurrentLibrary`, async (element: LibraryList) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = await window.showInputBox({
              prompt: `Enter library name`
            });

            if (library) {
              await iProject.setCurrentLibrary(library);
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.projectExplorer.removeFromLibraryList`, async (element: QSYSLib) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.label!.toString();
            await iProject.removeFromLibraryList(library, element.type);
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.updateVariable`, async (workspaceFolder: WorkspaceFolder, varName: string, currentValue?: string) => {
        if (workspaceFolder && varName) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            const newValue = await window.showInputBox({
              title: `New value for ${varName}`,
              value: currentValue || ``,
            });

            if (newValue) {
              const envPath = iProject.getEnvFilePath();
              await envUpdater(envPath, {
                [varName]: newValue
              });
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.createProject`, async (workspaceFolder: WorkspaceFolder) => {
        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            const description = await window.showInputBox({
              placeHolder: 'Description',
              prompt: 'Enter project description'
            });

            if (description) {
              await iProject.createProject(description);
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.createEnv`, async (workspaceFolder: WorkspaceFolder) => {
        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            await iProject.createEnv();
          }
        }
      })
    );
  }

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<any[]> {
    const ibmi = getInstance();

    if (element) {
      let items: TreeItem[] = [];
      let iProject: IProject | undefined;
      let state: iProjectT | undefined;

      switch (element.contextValue) {
        case Project.contextValue:
          const projectElement = element as Project;
          iProject = ProjectManager.get(projectElement.workspaceFolder);

          const deploymentDirs = ibmi?.getStorage().getDeployment()!;

          const localDir = projectElement.resourceUri?.path!;
          const remoteDir = deploymentDirs[localDir];

          // First load the IFS browser stuff
          if (remoteDir) {
            items.push(new IFSFolder(remoteDir, `Source`));
          } else {
            items.push(new ErrorItem(`Source`, {
              description: `Please configure remote directory.`,
              command: {
                command: `code-for-ibmi.setDeployLocation`,
                title: `Set deploy location`,
                arguments: [{}, element.resourceUri]
              }
            }));
          }

          const hasEnv = await iProject?.projectFileExists('.env');
          if (hasEnv) {
            let unresolvedVariableCount = 0;

            const possibleVariables = await iProject?.getVariables();
            const actualValues = await iProject?.getEnv();
            if (possibleVariables && actualValues) {
              unresolvedVariableCount = possibleVariables.filter(varName => !actualValues[varName]).length;
            }

            items.push(new Variables(projectElement.workspaceFolder, unresolvedVariableCount));

          } else {
            items.push(new ErrorItem(`Variables`, {
              description: `Please configure environment file.`,
              command: {
                command: `vscode-ibmi-projectmode.createEnv`,
                arguments: [projectElement.workspaceFolder],
                title: `Create project .env`
              }
            }));
          }

          items.push(new LibraryList(projectElement.workspaceFolder));
          items.push(new ObjectLibrary(projectElement.workspaceFolder));

          break;

        case IFSFolder.contextValue:
          const objects = await ibmi?.getContent().getFileList(element.resourceUri?.path!);
          const objectItems = objects?.map((object) => (object.type === `directory` ? new IFSFolder(object.path) : new Streamfile(object.path))) || [];

          items.push(...objectItems);
          break;

        case Variables.contextValue:
          const variablesElement = element as Variables;
          iProject = ProjectManager.get(variablesElement.workspaceFolder);

          const possibleVariables = await iProject?.getVariables();
          const actualValues = await iProject?.getEnv();

          if (possibleVariables && actualValues) {
            items.push(...possibleVariables?.map(
              varName => new Variable(iProject!.workspaceFolder, varName, actualValues[varName])
            ));

          } else {
            items.push(new ErrorItem(`Source`, {
              description: `Unable to read variables.`,
            }));
          }
          break;
        case LibraryList.contextValue:
          const libraryListElement = element as LibraryList;
          iProject = ProjectManager.get(libraryListElement.workspaceFolder);

          state = await iProject?.getState() as iProjectT;
          if (state) {
            const defaultUserLibraries = ibmi?.getConnection().defaultUserLibraries;

            // Retrieve current library
            let curlib = state.curlib;
            if (curlib && !curlib.startsWith('&')) {
              const badLibs = await ibmi?.getContent().validateLibraryList([curlib]);
              if (badLibs?.includes(curlib)) {
                curlib = undefined;
              }
            } else {
              curlib = undefined;
            }

            // Retrieve user libraries
            let userLibrariesToAdd: string[] = [
              ...(state.postUsrlibl ? state.postUsrlibl.slice().reverse() : []),
              ...(defaultUserLibraries ? defaultUserLibraries : []),
              ...(state.preUsrlibl ? state.preUsrlibl.slice().reverse() : [])
            ];
            userLibrariesToAdd = userLibrariesToAdd.filter(lib => !lib.startsWith('&'));
            const badLibs = await ibmi?.getContent().validateLibraryList(userLibrariesToAdd);
            if (badLibs) {
              userLibrariesToAdd = userLibrariesToAdd.filter(lib => !badLibs.includes(lib));
            }

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

                let lib, type;
                for (const line of libraryList) {
                  lib = line.substring(0, 10).trim();
                  type = line.substring(12);

                  switch (type) {
                    case `SYS`:
                      items.push(new QSYSLib(libraryListElement.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.systemLibrary));
                      break;

                    case `CUR`:
                      items.push(new QSYSLib(libraryListElement.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.currentLibrary));
                      break;

                    case `USR`:
                      items.push(new QSYSLib(libraryListElement.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.userLibrary));
                      break;
                  }
                }
              }
            }
          }
          break;
        case ObjectLibrary.contextValue:
          const objectLibrariesElement = element as LibraryList;
          iProject = ProjectManager.get(objectLibrariesElement.workspaceFolder);

          state = await iProject?.getState() as iProjectT;
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

            for (const lib of objLibs) {
              const libTreeItem = new QSYSLib(objectLibrariesElement.workspaceFolder, `/QSYS.LIB/${lib}`, lib, LibraryType.library);
              items.push(libTreeItem);
            }
          }
          break;
        case QSYSLib.contextValue:
          const lib = element as QSYSLib;
          const files = await ibmi?.getContent().getObjectList({
            library: lib.name
          });
          if (files) {
            for (const file of files) {
              const path = `/QSYS.LIB/${lib.name}/${file.name}`;
              if (file.attribute === "PF") {
                items.push(new PhysicalFile(path, lib.name, file.name, file.text));
              } else {
                // This is some other non physical file type
                items.push(new File(path, file.attribute, file.type, lib.name, file.name, false, file.text, null));
              }
            }
          }
          break;

        case PhysicalFile.contextValue:
          const pf = element as PhysicalFile;
          const members = await ibmi?.getContent().getMemberList(pf.library, pf.file);

          if (members) {
            for (const member of members) {
              items.push(new File(member.name, member.extension, "MBR", pf.library, pf.file, true, member.text, member));
            }
          }
      }

      return items;

    } else {

      if (ibmi && ibmi.getConnection()) {
        const workspaceFolders = workspace.workspaceFolders;
        const items: any[] = [];

        if (workspaceFolders && workspaceFolders.length > 0) {
          for await (const folder of workspaceFolders) {
            ProjectManager.load(folder);

            const iProject = ProjectManager.get(folder);
            if (iProject) {
              const metadataExists = await iProject.projectFileExists('iproj.json');
              if (metadataExists) {
                const state = await iProject.getState();
                if (state) {
                  items.push(new Project(folder, state.description));
                } else {
                  items.push(new Project(folder));
                }
              } else {
                items.push(new ErrorItem(
                  folder.name,
                  {
                    description: 'Please configure project metadata.',
                    command: {
                      command: 'vscode-ibmi-projectmode.createProject',
                      arguments: [folder],
                      title: 'Create project iproj.json'
                    }
                  }));
              }
            }
          };
        } else {
          items.push(new ErrorItem(
            `Please open a local workspace folder.`,
            {
              command: {
                command: 'workbench.action.files.openFolder',
                title: 'Open folder'
              }
            }));
        }

        return items;
      } else {
        return [new ErrorItem(`Please connect to an IBM i.`)];
      }
    }
  }

  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }

  resolveTreeItem?(item: TreeItem, element: any, token: CancellationToken): Promise<TreeItem> {
    throw new Error("Method not implemented.");
  }
}