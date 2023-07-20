/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands, EventEmitter, ExtensionContext, l10n, QuickPickItem, TreeDataProvider, TreeItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import ErrorItem from "./errorItem";
import { IProject } from "../../iproject";
import Project from "./project";
import { ProjectManager } from "../../projectManager";
import { DecorationProvider } from "./decorationProvider";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import IncludePaths from "./includePaths";
import LibraryList from "./libraryList";
import Library, { LibraryType } from "./library";
import LocalIncludePath from "./localIncludePath";
import RemoteIncludePath from "./remoteIncludePath";
import { migrateSource } from "./migrateSource";
import { IProjectT } from "../../iProjectT";
import Source from "./source";
import * as vscode from 'vscode';
import ObjectFile from "./objectFile";
import MemberFile from "./memberFile";
import { getInstance } from "../../ibmi";

export default class ProjectExplorer implements TreeDataProvider<ProjectExplorerTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ProjectExplorerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private projectTreeItems: Project[] = [];

  constructor(context: ExtensionContext) {
    const decorationProvider = new DecorationProvider();
    context.subscriptions.push(
      window.registerFileDecorationProvider(decorationProvider),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.goToObjectBrowser`, async () => {
        await commands.executeCommand(`objectBrowser.focus`);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.goToIFSBrowser`, async () => {
        await commands.executeCommand(`ifsBrowser.focus`);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.refreshProjectExplorer`, () => {
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setActiveProject`, async (element?: Project) => {
        if (element) {
          ProjectManager.setActiveProject(element.workspaceFolder!);
          this.refresh();
        } else {
          const projectItems: QuickPickItem[] = [];
          const activeProject = ProjectManager.getActiveProject();
          for (const iProject of ProjectManager.getProjects()) {
            const state = await iProject.getState();
            if (state) {
              const icon = activeProject && activeProject.workspaceFolder === iProject.workspaceFolder ? `$(root-folder)` : `$(symbol-folder)`;
              projectItems.push({ label: `${icon} ${iProject.getName()}`, description: state.description });
            }
          }

          const newActiveProject = await window.showQuickPick(projectItems, {
            placeHolder: l10n.t('Select a project')
          });

          if (newActiveProject) {
            const iProject = ProjectManager.getProjectFromName(newActiveProject.label.split(' ')[1]);
            if (iProject) {
              ProjectManager.setActiveProject(iProject.workspaceFolder);
              this.refresh();
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.migrateSource`, async (element: Library | any) => {
        if (element) {
          const library = element.name ? element.name : element.label.toString();
          const iProject = element.name ? ProjectManager.getActiveProject() : ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const result = await migrateSource(iProject, library);

            if (result) {
              this.refresh();
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.editDeployLocation`, async (element: Source) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.setDeployLocation`, undefined, element.workspaceFolder, `${element.description}`);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.iprojShortcut`, async (element: Project) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const fileUri = iProject.getProjectFileUri('iproj.json');
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.addLibraryListEntry`, async (element: LibraryList) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = await window.showInputBox({
              prompt: l10n.t('Enter library name'),
              placeHolder: l10n.t('Library name'),
              validateInput: (library) => {
                if (library.length > 10) {
                  return l10n.t('Library must be 10 characters or less');
                } else {
                  return null;
                }
              }
            });

            if (library) {
              const selectedPosition = await window.showQuickPick([
                l10n.t('Beginning of Library List'),
                l10n.t('End of Library List')], {
                placeHolder: l10n.t('Choose where to position the library'),
              });

              if (selectedPosition) {
                const position = (selectedPosition === l10n.t('Beginning of Library List')) ? 'preUsrlibl' : 'postUsrlibl';
                await iProject.addToLibraryList(library, position);
              }
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setCurrentLibrary`, async (element: LibraryList) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const state = await iProject.getState();

            const library = await window.showInputBox({
              prompt: l10n.t('Enter library name'),
              placeHolder: l10n.t('Library name'),
              validateInput: (library) => {
                if (state && library.toUpperCase() === state.curlib?.toUpperCase()) {
                  return l10n.t('Current library already set to {0}', library);
                } else if (library.length > 10) {
                  return l10n.t('Library must be 10 characters or less');
                } else {
                  return null;
                }
              }
            });

            if (library) {
              await iProject.setCurrentLibrary(library);
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.addToLibraryList`, async (element: any) => {
        if (element) {
          const iProject = ProjectManager.getActiveProject();

          if (iProject) {
            const library = element.name;

            if (library) {
              const selectedPosition = await window.showQuickPick([
                l10n.t('Beginning of Library List'),
                l10n.t('End of Library List')], {
                placeHolder: l10n.t('Choose where to position the library'),
              });

              if (selectedPosition) {
                const position = (selectedPosition === l10n.t('Beginning of Library List')) ? 'preUsrlibl' : 'postUsrlibl';
                await iProject.addToLibraryList(library, position);
              }
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve library'));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setAsCurrentLibrary`, async (element: any) => {
        if (element) {
          const library = element.name;

          if (library) {
            const iProject = ProjectManager.getActiveProject();
            if (iProject) {
              await iProject.setCurrentLibrary(library);
            }

          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve library'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setAsTargetLibraryForCompiles`, async (element: any) => {
        if (element) {
          const library = element.name;

          if (library) {
            const iProject = ProjectManager.getActiveProject();
            if (iProject) {
              await iProject.setTargetLibraryForCompiles(library);
            }

          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve library'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.removeFromLibraryList`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.label!.toString();
            await iProject.removeFromLibraryList(library, element.libraryType);
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.moveLibraryUp`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.variable ? element.variable : element.label!.toString();
            await iProject.moveLibrary(library, element.libraryType, 'up');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.moveLibraryDown`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.variable ? element.variable : element.label!.toString();
            await iProject.moveLibrary(library, element.libraryType, 'down');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.updateVariable`, async (workspaceFolder: WorkspaceFolder, varName: string, currentValue?: string) => {
        if (workspaceFolder && varName) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            const newValue = await window.showInputBox({
              prompt: l10n.t('Enter new value for {0}', varName),
              placeHolder: l10n.t('Variable value'),
              value: currentValue || ``,
            });

            if (newValue) {
              await iProject.updateEnv(varName, newValue);
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createProject`, async (workspaceFolder: WorkspaceFolder) => {
        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            const description = await window.showInputBox({
              prompt: l10n.t('Enter project description'),
              placeHolder: l10n.t('Description')
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
      commands.registerCommand(`vscode-ibmi-projectexplorer.configureAsVariable`, async (element: Library | LocalIncludePath | RemoteIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            let variable = await window.showInputBox({
              prompt: l10n.t('Enter variable name'),
              placeHolder: l10n.t('Variable Name')
            });

            if (variable) {
              while (variable.startsWith('&')) {
                variable = variable.substring(1);
              }

              let attribute: keyof IProjectT;
              if (element instanceof Library) {
                if (element.libraryType === LibraryType.preUserLibrary) {
                  attribute = 'preUsrlibl';
                } else if (element.libraryType === LibraryType.postUserLibrary) {
                  attribute = 'postUsrlibl';
                }
              } else {
                attribute = 'includePath';
              }

              await iProject.configureAsVariable(attribute!, variable, element.label!.toString());
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.assignToVariable`, async (element: any) => {
        if (element) {
          const value = element.name ? element.name : element.path;
          if (value) {
            const variableItems: QuickPickItem[] = [];
            const activeProject = ProjectManager.getActiveProject();
            if (activeProject) {
              const variables = await activeProject?.getVariables();
              if (variables.length > 0) {
                const values = await activeProject.getEnv();

                for (const variable of variables) {
                  variableItems.push({ label: `&${variable}`, description: values[variable] });
                }

                const variable = await window.showQuickPick(variableItems, {
                  placeHolder: l10n.t('Select a variable')
                });

                if (variable) {
                  await activeProject.updateEnv(variable.label.substring(1), value);
                }
              } else {
                window.showErrorMessage(l10n.t('No variables found'));
              }
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.addToIncludePaths`, async (element: IncludePaths | any) => {
        if (element instanceof IncludePaths) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const includePath = await window.showInputBox({
              prompt: l10n.t('Enter include path'),
              placeHolder: l10n.t('Include path')
            });

            if (includePath) {
              await iProject.addToIncludePaths(includePath);
            }
          }
        } else {
          const includePath = element.path;
          if (includePath) {
            const iProject = ProjectManager.getActiveProject();
            if (iProject) {
              await iProject.addToIncludePaths(includePath);
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve path to directory'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.removeFromIncludePaths`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            await iProject.removeFromIncludePaths(element.label!.toString());
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveIncludePathUp`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const pathToMove = element.variable ? element.variable : element.label!.toString();
            await iProject.moveIncludePath(pathToMove, 'up');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveIncludePathDown`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const pathToMove = element.variable ? element.variable : element.label!.toString();
            await iProject.moveIncludePath(pathToMove, 'down');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.changeLibraryDescription`, async (element: Library) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.changeObjectDesc`, {
            path: `${element.libraryInfo.library}/${element.libraryInfo.name}`,
            type: element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type,
            text: element.libraryInfo.text
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyLibrary`, async (element: Library) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.copyObject`, {
            path: `${element.libraryInfo.library}/${element.libraryInfo.name}`,
            type: element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameLibrary`, async (element: Library) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.renameObject`, {
            path: `${element.libraryInfo.library}/${element.libraryInfo.name}`,
            type: element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.clearLibrary`, async (element: Library) => {
        if (element) {
          const library = element.label?.toString();
          const path = `${element.libraryInfo.library}/${element.libraryInfo.name}`;
          const type = element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type;

          const result = await vscode.window.showWarningMessage(l10n.t('Are you sure you want to clear {0} *{1}?', path, type), l10n.t('Yes'), l10n.t('Cancel'));

          if (result === l10n.t('Yes')) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            try {
              await connection.runCommand({ command: `CLRLIB LIB(${library})` });

              vscode.window.showInformationMessage(l10n.t('Cleared {0} *{1}.', path, type));
              this.refresh();
            } catch (e: any) {
              vscode.window.showErrorMessage(l10n.t('Error clearing library! {0}', e));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteLibrary`, async (element: Library) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.deleteObject`, {
            path: `${element.libraryInfo.library}/${element.libraryInfo.name}`,
            type: element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createSourceFile`, async (element: Library) => {
        if (element) {
          const sourceFileName = await vscode.window.showInputBox({
            prompt: l10n.t('Enter source file name'),
            placeHolder: l10n.t('Source file name'),
            validateInput: (library) => {
              if (library.length > 10) {
                return l10n.t('Source file name must be 10 characters or less');
              } else {
                return null;
              }
            }
          });

          if (sourceFileName) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();
            try {
              const library = element.libraryInfo.name;
              const path = `${library}/${sourceFileName.toUpperCase()}`;

              vscode.window.showInformationMessage(l10n.t('Creating source file {0}.', path));

              await connection.runCommand({ command: `CRTSRCPF FILE(${path}) RCDLEN(112)` });
              this.refresh();
            } catch (e: any) {
              vscode.window.showErrorMessage(l10n.t('Error creating source file! {0}', e));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.runAction`, async (element: ObjectFile | MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.runAction`, {
            resourceUri: element.resourceUri
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.changeObjectDescription`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.changeObjectDesc`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            type: element.objectFileInfo.type.startsWith(`*`) ? element.objectFileInfo.type.substring(1) : element.objectFileInfo.type,
            text: element.objectFileInfo.text
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.copyObject`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            type: element.objectFileInfo.type.startsWith(`*`) ? element.objectFileInfo.type.substring(1) : element.objectFileInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.renameObject`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            type: element.objectFileInfo.type.startsWith(`*`) ? element.objectFileInfo.type.substring(1) : element.objectFileInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.deleteObject`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            type: element.objectFileInfo.type.startsWith(`*`) ? element.objectFileInfo.type.substring(1) : element.objectFileInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.moveObject`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            type: element.objectFileInfo.type.startsWith(`*`) ? element.objectFileInfo.type.substring(1) : element.objectFileInfo.type
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createMember`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.createMember`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.searchSourceFile`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.searchSourceFile`, {
            path: `${element.objectFileInfo.library}/${element.objectFileInfo.name}`,
            memberFilter: ``
          });
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.browse`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.browse`, {
            member: element.memberFileInfo
          });
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.selectForCompare`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.selectForCompare`, {
            path: element.resourceUri?.path,
            resourceUri: element.resourceUri
          });
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.compareWithSelected`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.compareWithSelected`, {
            resourceUri: element.resourceUri
          });
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.updateMemberText`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.updateMemberText`, {
            path: element.resourceUri?.path,
            description: element.memberFileInfo.text
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyMember`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.copyMember`, {
            path: element.resourceUri?.path
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameMember`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.renameMember`, {
            path: element.resourceUri?.path
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteMember`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.deleteMember`, {
            path: element.resourceUri?.path
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.download`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.downloadMemberAsFile`, {
            path: element.resourceUri?.path
          });
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.uploadAndReplace`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.uploadAndReplaceMemberAsFile`, {
            path: element.resourceUri?.path
          });

          this.refresh();
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
                items.push(new Project(folder, state));
              } else {
                const validatorResult = iProject.getValidatorResult();
                if (validatorResult) {
                  const errors = validatorResult.errors
                    .map(error => `• ${error.stack.replace('instance.', '').replace('instance', 'iproj')}`)
                    .join('\n');
                  const tooltip = l10n.t('This project contains the following errors:\n{0}', errors);
                  items.push(new ErrorItem(
                    folder,
                    folder.name,
                    {
                      description: l10n.t('Please resolve project metadata'),
                      tooltip: tooltip,
                      command: {
                        command: 'vscode-ibmi-projectexplorer.projectExplorer.iprojShortcut',
                        arguments: [{ workspaceFolder: iProject.workspaceFolder }],
                        title: l10n.t('Open iproj.json')
                      }
                    }
                  ));
                } else {
                  items.push(new Project(folder));
                }
              }
            } else {
              items.push(new ErrorItem(
                folder,
                folder.name,
                {
                  description: l10n.t('Please configure project metadata'),
                  command: {
                    command: 'vscode-ibmi-projectexplorer.createProject',
                    arguments: [folder],
                    title: l10n.t('Create project iproj.json')
                  }
                }
              ));
            }
          }

          this.projectTreeItems = items as Project[];
        };

        const activeProject = ProjectManager.getActiveProject();
        if (activeProject) {
          const projectTreeItem = this.getProjectTreeItem(activeProject);
          if (projectTreeItem && projectTreeItem instanceof Project) {
            projectTreeItem.setActive();
          }
        }

      } else {
        items.push(new ErrorItem(
          undefined,
          l10n.t('Please open a local workspace folder'),
          {
            command: {
              command: 'workbench.action.addRootFolder',
              title: l10n.t('Add folder to workspace')
            }
          }
        ));
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