/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace, WorkspaceFolder } from "vscode";
import { getInstance } from "../../ibmi";
import ErrorItem from "./errorItem";
import { IProject } from "../../iproject";
import Project from "./project";
import envUpdater from "../../envUpdater";
import { ProjectManager } from "../../projectManager";
import { DecorationProvider } from "./decorationProvider";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import IncludePaths from "./includePaths";
import IncludePath from "./includePath";

export default class ProjectExplorer implements TreeDataProvider<ProjectExplorerTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ProjectExplorerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private projectTreeItems: Project[] = [];

  constructor(context: ExtensionContext) {
    const decorationProvider = new DecorationProvider();
    context.subscriptions.push(
      window.registerFileDecorationProvider(decorationProvider),
      commands.registerCommand(`vscode-ibmi-projectexplorer.setActiveProject`, (element: ProjectExplorerTreeItem) => {
        ProjectManager.setActiveProject(element.workspaceFolder!);
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.updateVariable`, async (workspaceFolder: WorkspaceFolder, varName: string, currentValue?: string) => {
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
      commands.registerCommand(`vscode-ibmi-projectexplorer.createProject`, async (workspaceFolder: WorkspaceFolder) => {
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
      commands.registerCommand(`vscode-ibmi-projectexplorer.createEnv`, async (workspaceFolder: WorkspaceFolder) => {
        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            await iProject.createEnv();
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.addToIncludePaths`, async (element: TreeItem) => {
        if (element instanceof IncludePaths) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const includePath = await window.showInputBox({
              placeHolder: 'Include Path',
              prompt: 'Enter include path'
            });

            if (includePath) {
              iProject.addToIncludePaths(includePath);
            }
          }
        } else {
          const includePath = (element as any).path;
          if (includePath) {
            const iProject = ProjectManager.getActiveProject();
            if (iProject) {
              await iProject.addToIncludePaths(includePath);
            }
          } else {
            window.showErrorMessage('Failed to retrieve path to directory.');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.removeFromIncludePaths`, async (element: IncludePath) => {
        if (element instanceof IncludePath) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            iProject.removeFromIncludePaths(element.label!.toString());
          }
        }
      })
    );
  }

  refresh(element?: ProjectExplorerTreeItem) {
    this._onDidChangeTreeData.fire(element);
  }

  getTreeItem(element: ProjectExplorerTreeItem): ProjectExplorerTreeItem | Thenable<ProjectExplorerTreeItem> {
    return element;
  }

  async getChildren(element?: ProjectExplorerTreeItem): Promise<ProjectExplorerTreeItem[]> {
    if (element) {
      return element.getChildren();
    } else {
      const items: ProjectExplorerTreeItem[] = [];

      const ibmi = getInstance();

      if (ibmi && ibmi.getConnection()) {
        const workspaceFolders = workspace.workspaceFolders;

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
                  folder,
                  folder.name,
                  {
                    description: 'Please configure project metadata.',
                    command: {
                      command: 'vscode-ibmi-projectexplorer.createProject',
                      arguments: [folder],
                      title: 'Create project iproj.json'
                    }
                  }));
              }
            }

            this.projectTreeItems = items as Project[];
          };

          const activeProject = ProjectManager.getActiveProject();
          if (activeProject) {
            const projectTreeItem = this.getProjectTreeItem(activeProject);
            if (projectTreeItem) {
              projectTreeItem.setActive();
            }
          }

        } else {
          items.push(new ErrorItem(
            undefined,
            `Please open a local workspace folder.`,
            {
              command: {
                command: 'workbench.action.files.openFolder',
                title: 'Open folder'
              }
            }));
        }
      } else {
        items.push(new ErrorItem(undefined, `Please connect to an IBM i.`));
      }

      return items;
    }
  }

  getProjectTreeItem(iProject: IProject): Project | undefined {
    for (const projectTreeItem of this.projectTreeItems) {
      if (projectTreeItem.workspaceFolder === iProject.workspaceFolder) {
        return projectTreeItem;
      }
    }
  }
}