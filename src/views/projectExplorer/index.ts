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
import QSYSLib from "./qsysLib";
import PhysicalFile from "./physicalfile";
import File from "./file";
import { IBMiMember } from "@halcyontech/vscode-ibmi-types";

export default class ProjectExplorer implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    const decorationProvider = new DecorationProvider();
    context.subscriptions.push(
      window.registerFileDecorationProvider(decorationProvider),
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
      commands.registerCommand(`vscode-ibmi-projectmode.createEnv`, async (workspaceFolder: WorkspaceFolder) => {
        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            await iProject?.createEnv();
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

          // Then load the variable specific stuff
          await iProject?.read();

          const hasEnv = await iProject?.envExists();
          if (hasEnv) {
            let unresolvedVariableCount = 0;

            const possibleVariables = iProject?.getVariables();
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

          const objectLibrariesTreeItem = new ObjectLibrary(projectElement.workspaceFolder);
          items.push(objectLibrariesTreeItem);

          break;

        case IFSFolder.contextValue:
          const objects = await ibmi?.getContent().getFileList(element.resourceUri?.path!);
          const objectItems = objects?.map((object) => (object.type === `directory` ? new IFSFolder(object.path) : new Streamfile(object.path))) || [];

          items.push(...objectItems);
          break;

        case Variables.contextValue:
          const variablesElement = element as Variables;
          iProject = ProjectManager.get(variablesElement.workspaceFolder);

          const possibleVariables = iProject?.getVariables();
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
        case ObjectLibrary.contextValue:
          iProject = ProjectManager.get((element as ObjectLibrary).workspaceFolder);
          const state = iProject?.getState() as iProjectT;
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
              const libTreeItem = new QSYSLib(`/QSYS.LIB/${lib}`, lib);
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
        const items: Project[] = [];

        if (workspaceFolders && workspaceFolders.length > 0) {
          workspaceFolders.map(folder => {
            ProjectManager.load(folder);
            items.push(new Project(folder));
          });
          return items;

        } else {
          return [new ErrorItem(`Please open a local workspace folder.`)];
        }
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