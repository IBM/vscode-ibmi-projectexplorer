import { CancellationToken, commands, Event, EventEmitter, ExtensionContext, ProviderResult, TreeDataProvider, TreeItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { getInstance } from "../../ibmi";
import { IProject } from "../../iproject";
import ErrorItem from "../../test/errorItem";
import IFSFolder from "./ifsFolder";
import Project from "./project";
import Streamfile from "./streamfile";
import Variables from "./variables";
import Variable from "./variable";
import envUpdater from "../../envUpdater";

class ProjectManager {
  private static loaded: { [index: number]: IProject } = {};

  public static load(workspaceFolder: WorkspaceFolder) {
    if (!this.loaded[workspaceFolder.index]) {
      this.loaded[workspaceFolder.index] = new IProject(workspaceFolder);
    }
  }

  public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
    return this.loaded[workspaceFolder.index];
  }

  public static clear() {
    this.loaded = {};
  }
}

export default class ProjectExplorer implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
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
          iProject?.read();

          const hasEnv = await iProject?.envExists();
          if (hasEnv) {
            items.push(new Variables(projectElement.workspaceFolder));

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
      }

      return items;

    } else {

      if (ibmi && ibmi.getConnection()) {
        const workspaceFolders = workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
          return workspaceFolders.map(folder => {
            ProjectManager.load(folder);

            return new Project(folder);
          });
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