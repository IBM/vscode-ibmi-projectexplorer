/*
 * (c) Copyright IBM Corp. 2023
 */

import { ConnectionData, DeploymentMethod, ObjectItem } from "@halcyontech/vscode-ibmi-types";
import { DeploymentPath } from "@halcyontech/vscode-ibmi-types/api/Storage";
import * as path from "path";
import { CancellationToken, ConfigurationTarget, EventEmitter, ExtensionContext, ProgressLocation, QuickPickItem, TreeDataProvider, TreeItem, TreeView, Uri, WorkspaceFolder, commands, env, l10n, window, workspace } from "vscode";
import { DecorationProvider } from "../../decorationProvider";
import { EnvironmentManager } from "../../environmentManager";
import { IProjectT } from "../../iProjectT";
import { getDeployTools, getInstance, getTools } from "../../ibmi";
import { LINKS } from "../../ibmiProjectExplorer";
import { IProject } from "../../iproject";
import { ProjectManager } from "../../projectManager";
import ErrorItem from "./errorItem";
import IncludePaths from "./includePaths";
import Library, { LibraryType } from "./library";
import LibraryList from "./libraryList";
import LocalIncludePath from "./localIncludePath";
import MemberFile from "./memberFile";
import { migrateSource } from "./migrateSource";
import ObjectFile from "./objectFile";
import Project from "./project";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import RemoteIncludePath from "./remoteIncludePath";
import Source from "./source";
import SourceDirectory from "./sourceDirectory";
import SourceFile from "./sourceFile";
import Variable from "./variable";

/**
 * Represents the Project Explorer tree data provider.
 */
export default class ProjectExplorer implements TreeDataProvider<ProjectExplorerTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ProjectExplorerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private treeView: TreeView<ProjectExplorerTreeItem> | undefined;
  private projectTreeItems: Project[] = [];

  constructor(context: ExtensionContext) {
    const ibmi = getInstance();
    let currentDeploymentStorage: DeploymentPath;
    ibmi?.subscribe(context, `connected`, "Load IBM i Project Explorer", async () => {
      this.refresh();

      currentDeploymentStorage = JSON.parse(JSON.stringify(ibmi?.getStorage().getDeployment()));

      for await (const iProject of ProjectManager.getProjects()) {
        await iProject.syncLiblVars();
      }
    });
    ibmi?.subscribe(context, `deploy`, "Refresh IBM i Project Explorer after deploy", () => {
      this.refresh();
    });
    ibmi?.subscribe(context, `deployLocation`, "Refresh IBM i Project Explorer after deploy location changes", () => {
      this.refresh();

      const newDeploymentStorage = ibmi?.getStorage().getDeployment();
      for (const [workspaceFolderPath, deployLocation] of Object.entries(newDeploymentStorage)) {
        if (!currentDeploymentStorage || currentDeploymentStorage[workspaceFolderPath] !== deployLocation) {
          const iProject = ProjectManager.getProjectFromUri(Uri.file(workspaceFolderPath));
          ProjectManager.fire({ type: 'deployLocation', iProject: iProject });
        }
      }

      currentDeploymentStorage = JSON.parse(JSON.stringify(newDeploymentStorage));
    });
    ibmi?.subscribe(context, `disconnected`, "Disconnect IBM i Projects", () => {
      this.refresh();

      for (const iProject of ProjectManager.getProjects()) {
        iProject.setState(undefined);
        iProject.setLibraryList(undefined);
      }
    });

    const decorationProvider = new DecorationProvider();
    context.subscriptions.push(
      window.registerFileDecorationProvider(decorationProvider),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openDevelopmentWalkthrough`, async () => {
        await commands.executeCommand(`workbench.action.openWalkthrough`, 'IBM.vscode-ibmi-projectexplorer#projectExplorer.ibmiDevelopment');
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openProjectExplorerDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.projectExplorerDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openMigrateSourceDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.migrateSourceDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openJobLogDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.jobLogDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openArcadDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.projectModeDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openBobDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.bobDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openCode4iActionsDocs`, async () => {
        env.openExternal(Uri.parse(LINKS.actionsDocs));
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.goToObjectBrowser`, async () => {
        await commands.executeCommand(`objectBrowser.focus`);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.goToIFSBrowser`, async () => {
        await commands.executeCommand(`ifsBrowser.focus`);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.runBuild`, async (element?: Project) => {
        let iProject: IProject | undefined;
        if (element && element instanceof Project) {
          iProject = ProjectManager.get(element.workspaceFolder);
        } else {
          iProject = ProjectManager.getActiveProject();
        }

        if (iProject) {
          iProject.runBuildOrCompileCommandWithPrompt(true);
        } else {
          window.showErrorMessage(l10n.t('Failed to retrieve project'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setBuildCommand`, async (element: Project) => {
        let iProject: IProject | undefined;
        if (element) {
          iProject = ProjectManager.get(element.workspaceFolder);
        } else {
          iProject = ProjectManager.getActiveProject();
        }

        if (iProject) {
          const unresolvedState = await iProject.getUnresolvedState();
          if (unresolvedState) {
            let defaultCommand = '/QOpenSys/pkgs/bin/makei build';
            if (unresolvedState.buildCommand) {
              defaultCommand = unresolvedState.buildCommand;
            }
            const command = await window.showInputBox({
              prompt: l10n.t('Enter build command ({0} resolves to the base file name being edited. {1} resolves to the full IFS path corresponding to the source in the editor. {2} resolves to the IBM i hostname. {3} resolves to the user profile that the command will be executed under. {4} resolves to the name of the current git branch if this project is managed by git.)', '{filename}', '{path}', '{host}', '{usrprf}', '{branch}'),
              placeHolder: l10n.t('Build command'),
              value: defaultCommand,
            });

            if (command) {
              await iProject.setBuildOrCompileCommand(command, true);
            }
          }
        } else {
          window.showErrorMessage(l10n.t('Failed to retrieve project'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.runCompile`, async (element?: SourceFile | SourceDirectory | Uri) => {
        let iProject: IProject | undefined;
        if (element) {
          if (element instanceof SourceFile || element instanceof SourceDirectory) {
            // Invoked from a file or directory under the Source heading
            element = element.sourceInfo.localUri;
          }

          // Invoked from the editor or file explorer
          iProject = ProjectManager.getProjectFromUri(element);
        } else {
          // Invoked from the command palette
          let activeFileUri = window.activeTextEditor?.document.uri;
          element = activeFileUri?.scheme === 'file' ? activeFileUri : undefined;

          if (element) {
            iProject = ProjectManager.getProjectFromUri(element);
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve file to compile'));
            return;
          }
        }

        if (iProject) {
          iProject.runBuildOrCompileCommandWithPrompt(false, element);
        } else {
          window.showErrorMessage(l10n.t('Failed to retrieve project'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setCompileCommand`, async (element: Project) => {
        let iProject: IProject | undefined;
        if (element) {
          iProject = ProjectManager.get(element.workspaceFolder);
        } else {
          iProject = ProjectManager.getActiveProject();
        }

        if (iProject) {
          const unresolvedState = await iProject.getUnresolvedState();

          if (unresolvedState) {
            let defaultCommand = '/QOpenSys/pkgs/bin/makei compile -f {filename}';
            if (unresolvedState.compileCommand) {
              defaultCommand = unresolvedState.compileCommand;
            }
            const command = await window.showInputBox({
              prompt: l10n.t('Enter compile command ({0} resolves to the base file name being edited. {1} resolves to the full IFS path corresponding to the source in the editor. {2} resolves to the IBM i hostname. {3} resolves to the user profile that the command will be executed under. {4} resolves to the name of the current git branch if this project is managed by git.)', '{filename}', '{path}', '{host}', '{usrprf}', '{branch}'),
              placeHolder: l10n.t('Compile command'),
              value: defaultCommand,
            });

            if (command) {
              await iProject.setBuildOrCompileCommand(command, false);
            }
          }
        } else {
          window.showErrorMessage(l10n.t('Failed to retrieve project'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.launchActionsSetup`, async (element?: Project) => {
        let workspaceFolder: WorkspaceFolder | undefined;
        if (element) {
          workspaceFolder = element.workspaceFolder;
        } else {
          const activeProject = ProjectManager.getActiveProject();
          workspaceFolder = activeProject?.workspaceFolder;
        }

        if (workspaceFolder) {
          await ProjectManager.setActiveProject(workspaceFolder);

          const deployTools = getDeployTools();
          await deployTools?.launchActionsSetup(workspaceFolder);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.refreshProjectExplorer`, () => {
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.disableClearErrorsBeforeBuild`, async () => {
        let config = workspace.getConfiguration(`code-for-ibmi`);
        const currentVal = await config.get('clearErrorsBeforeBuild');
        await config.update('clearErrorsBeforeBuild', !currentVal, ConfigurationTarget.Global);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.enableClearErrorsBeforeBuild`, async () => {
        let config = workspace.getConfiguration(`code-for-ibmi`);
        const currentVal = await config.get('clearErrorsBeforeBuild');
        await config.update('clearErrorsBeforeBuild', !currentVal, ConfigurationTarget.Global);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.refresh`, async (element: ProjectExplorerTreeItem) => {
        if (element instanceof LibraryList) {
          const iProject = ProjectManager.get(element.workspaceFolder);
          await iProject?.forceResetLibraryList();
        }

        this.refresh(element);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setActiveProject`, async (element?: Project) => {
        if (element) {
          await ProjectManager.setActiveProject(element.workspaceFolder);
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
              await ProjectManager.setActiveProject(iProject.workspaceFolder);
              this.refresh();
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve project'));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.migrateSource`, async (element: Library | ObjectItem) => {
        if (element) {
          const library = ("object" in element ? element.object : element.libraryInfo).name.toLocaleUpperCase();
          const iProject = "workspaceFolder" in element ? ProjectManager.get(element.workspaceFolder) : ProjectManager.getActiveProject();

          if (iProject) {
            const result = await migrateSource(iProject, library);

            if (result) {
              this.refresh();
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.editDeployLocation`, async (element: Source) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.setDeployLocation`, undefined, element.workspaceFolder, `${element.deploymentParameters.remotePath}`);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setDeploymentMethod`, async (element?: Source) => {
        let workspaceFolder: WorkspaceFolder | undefined;
        if (element) {
          workspaceFolder = element.workspaceFolder;
        } else {
          const activeProject = ProjectManager.getActiveProject();
          workspaceFolder = activeProject?.workspaceFolder;
        }

        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);

          if (iProject) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            const deployTools = getDeployTools();
            const deploymentParameters = await iProject.getDeploymentParameters();
            if (deploymentParameters) {
              const methods: { method: DeploymentMethod, label: string, description?: string }[] = [];
              if (connection.remoteFeatures.md5sum) {
                methods.push({ method: 'compare', label: l10n.t('Compare'), description: l10n.t('Synchronizes using MD5 hash comparison') });
              }

              const files = await deployTools?.getDeployChangedFiles(deploymentParameters);
              const changes = files?.length || 0;
              methods.push({ method: 'changed', label: l10n.t('Changes'), description: changes > 1 || changes === 0 ? l10n.t('{0} changes detected since last upload', changes) : l10n.t('1 change detected since last upload') });

              const tools = getTools();
              if (tools!.getGitAPI()) {
                methods.push(
                  { method: 'unstaged', label: l10n.t('Working Changes'), description: l10n.t('Unstaged changes in git') },
                  { method: 'staged', label: l10n.t('Staged Changes') }
                );
              }

              methods.push({ method: 'all', label: l10n.t('All'), description: l10n.t('Every file in the local workspace') });

              const deploymentMethod = await window.showQuickPick(methods, { placeHolder: l10n.t('Select deployment method to {0}', deploymentParameters.remotePath) });
              if (deploymentMethod) {
                iProject.setDeploymentMethod(deploymentMethod.method);

                this.refresh();
              }
            } else {
              window.showErrorMessage(l10n.t('Chosen location ({0}) is not configured for deployment.', workspaceFolder.uri.fsPath));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.deployProject`, async (element?: Source) => {
        let workspaceFolder: WorkspaceFolder | undefined;
        if (element) {
          workspaceFolder = element.workspaceFolder;
        } else {
          const activeProject = ProjectManager.getActiveProject();
          workspaceFolder = activeProject?.workspaceFolder;
        }

        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);

          if (iProject) {
            await iProject.deployProject();

            this.refresh();
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.compareWithRemote`, async (element: SourceFile) => {
        if (element) {
          const remoteFile = path.parse(element.sourceInfo.remoteUri.path);
          const ibmi = getInstance();
          const remoteFileExists = await ibmi?.getContent().streamfileResolve([remoteFile.base], [remoteFile.dir]);

          if (remoteFileExists) {
            await commands.executeCommand(`vscode.diff`, element.sourceInfo.remoteUri, element.sourceInfo.localUri);
          } else {
            window.showErrorMessage(l10n.t('{0} does not exist remotely', remoteFile.base));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.iprojShortcut`, async (element: Project) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const fileUri = iProject.getProjectFileUri('iproj.json');
            const document = await workspace.openTextDocument(fileUri);
            await window.showTextDocument(document);
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.editVariable`, async (element: Variable) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const variable = element.label!.toString();
            const value = element.value;

            const newValue = await window.showInputBox({
              prompt: l10n.t('Enter new value for {0}', variable),
              placeHolder: l10n.t('Variable value'),
              value: value || ``,
            });

            if (newValue) {
              await iProject.updateEnvVar(variable, newValue);
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
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
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
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
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.addToLibraryList`, async (element: any) => {
        if (element) {
          const iProject = ProjectManager.getActiveProject();

          if (iProject) {
            const library = element.library;

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
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setAsCurrentLibrary`, async (element: any) => {
        if (element) {
          const library = element.library;

          if (library) {
            const iProject = ProjectManager.getActiveProject();

            if (iProject) {
              await iProject.setCurrentLibrary(library);
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve project'));
            }

          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve library'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setAsTargetLibraryForCompiles`, async (element: any) => {
        if (element) {
          const library = element.library;

          if (library) {
            const iProject = ProjectManager.getActiveProject();

            if (iProject) {
              await iProject.setAsTargetLibraryForCompiles(library);
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve project'));
            }

          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve library'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setTargetLibraryForCompiles`, async (element: SourceDirectory | Uri) => {
        if (element) {
          if (element instanceof SourceDirectory) {
            // Invoked from a directory under the Source heading
            element = element.sourceInfo.localUri;
          }

          const iProject = ProjectManager.getProjectFromUri(element);

          if (iProject) {
            const unresolvedIBMiJson = await iProject.getUnresolvedIBMiJson(element);
            const values = await iProject.getEnv();

            let library: string | undefined;
            let variable: string | undefined;
            let isLibrarySet = false;
            if (unresolvedIBMiJson && unresolvedIBMiJson.build?.objlib && unresolvedIBMiJson.build?.objlib.startsWith('&')) {
              variable = unresolvedIBMiJson.build?.objlib.substring(1);
              library = values[variable];
            } else {
              const variables = await iProject?.getVariables();
              if (variables.length > 0) {
                const variableItems: QuickPickItem[] = [{ label: l10n.t('{0} Create new variable', '$(add)') }];

                for (const variable of variables) {
                  variableItems.push({ label: `&${variable}`, description: values[variable] });
                }

                let variableSelection = await window.showQuickPick(variableItems, {
                  placeHolder: l10n.t('Select a variable')
                });

                if (variableSelection) {
                  if (variableSelection.label !== l10n.t('{0} Create new variable', '$(add)')) {
                    variable = variableSelection.label.substring(1);
                    if (values[variable]) {
                      library = values[variable];
                      isLibrarySet = true;
                    }
                  }
                } else {
                  return;
                }
              }
            }

            if (!variable) {
              variable = await window.showInputBox({
                prompt: l10n.t('Enter variable name'),
                placeHolder: l10n.t('Variable name')
              });

              if (variable) {
                while (variable.startsWith('&')) {
                  variable = variable.substring(1);
                }
              }
            }

            if (!isLibrarySet) {
              library = await window.showInputBox({
                prompt: l10n.t('Enter library name'),
                placeHolder: l10n.t('Library name'),
                value: library,
                validateInput: (library) => {
                  if (library.length > 10) {
                    return l10n.t('Library must be 10 characters or less');
                  } else {
                    return null;
                  }
                }
              });
            }

            if (library && variable) {
              await iProject.setTargetLibraryForCompiles(library, variable, element);
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.setTargetCCSIDForCompiles`, async (element: SourceDirectory | Uri) => {
        if (element) {
          if (element instanceof SourceDirectory) {
            // Invoked from a directory under the Source heading
            element = element.sourceInfo.localUri;
          }

          const iProject = ProjectManager.getProjectFromUri(element);

          if (iProject) {
            const ibmiJson = await iProject.getIBMiJson(element);

            const tgtCcsid = await window.showInputBox({
              prompt: l10n.t('Enter target CCSID'),
              placeHolder: l10n.t('Target CCSID'),
              value: ibmiJson?.build?.tgtCcsid,
              validateInput: (tgtCcsid) => {
                if (!/^\d+$/.test(tgtCcsid)) {
                  return l10n.t('Target CCSID must be a number');
                } else {
                  return null;
                }
              }
            });

            if (tgtCcsid) {
              await iProject.setTargetCCSIDForCompiles(tgtCcsid, element);
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.removeFromLibraryList`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.label!.toString();
            await iProject.removeFromLibraryList(library, element.libraryType);
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.moveLibraryUp`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.variable ? element.variable : element.label!.toString();
            await iProject.moveLibrary(library, element.libraryType, 'up');
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.projectExplorer.moveLibraryDown`, async (element: Library) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const library = element.variable ? element.variable : element.label!.toString();
            await iProject.moveLibrary(library, element.libraryType, 'down');
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createIProj`, async (element: ErrorItem | WorkspaceFolder) => {
        const workspaceFolder = element instanceof ErrorItem ? element.workspaceFolder : element;

        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            const description = await window.showInputBox({
              prompt: l10n.t('Enter project description'),
              placeHolder: l10n.t('Description')
            });

            if (description) {
              await iProject.createIProj(description);
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createEnv`, async (element: WorkspaceFolder) => {
        const workspaceFolder = element instanceof ErrorItem ? element.workspaceFolder : element;

        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);
          if (iProject) {
            await iProject.createEnv();
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.configureAsVariable`, async (element: Library | LocalIncludePath | RemoteIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            let variable = await window.showInputBox({
              prompt: l10n.t('Enter variable name'),
              placeHolder: l10n.t('Variable name')
            });

            if (variable) {
              while (variable.startsWith('&')) {
                variable = variable.substring(1);
              }

              let attributes: (keyof IProjectT)[] = [];
              if (element instanceof Library) {
                const libraryTypes = element.libraryTypes ? element.libraryTypes : [element.libraryType];

                for (const libraryType of libraryTypes) {
                  if (libraryType === LibraryType.preUserLibrary) {
                    attributes.push('preUsrlibl');
                  } else if (libraryType === LibraryType.postUserLibrary) {
                    attributes.push('postUsrlibl');
                  } else if (libraryType === LibraryType.currentLibrary) {
                    attributes.push('curlib');
                  } else if (libraryType === LibraryType.objectLibrary) {
                    attributes.push('objlib');
                  }
                }
              } else {
                attributes.push('includePath');
              }

              await iProject.configureAsVariable(attributes, variable, element.label!.toString());
            }
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.assignToVariable`, async (element: Library | any) => {
        if (element) {
          let value: string;
          if (element instanceof Library) {
            // Invoked from library in Project Explorer
            value = element.label!.toString();
          } else {
            // Invoked from library in Object Browser or directory in IFS Browser
            value = element.path;
          }

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
                  await activeProject.updateEnvVar(variable.label.substring(1),
                    value.toLocaleUpperCase().startsWith("QSYS/") ? value.substring(5).toLocaleUpperCase() : value);
                }
              } else {
                window.showErrorMessage(l10n.t('No variables found'));
              }
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.addToIncludePaths`, async (element: IncludePaths | SourceDirectory | Uri | any) => {
        if (element) {
          let iProject: IProject | undefined;
          let includePath: string | undefined;
          if (element instanceof IncludePaths) {
            // Invoked from Include Paths heading
            iProject = ProjectManager.get(element.workspaceFolder);

            if (iProject) {
              includePath = await window.showInputBox({
                prompt: l10n.t('Enter include path'),
                placeHolder: l10n.t('Include path')
              });
            }
          } else if (element instanceof SourceDirectory) {
            // Invoked from a directory under the Source heading
            includePath = element.sourceInfo.localUri.path;

            iProject = ProjectManager.get(element.workspaceFolder);
          } else if (element instanceof Uri) {
            // Invoked from the file explorer
            includePath = element.path;

            iProject = ProjectManager.getProjectFromUri(element);
          } else {
            // Invoked from the Code4i IFS browser
            includePath = element.path;

            if (includePath) {
              iProject = ProjectManager.getActiveProject();
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve path to directory'));
              return;
            }
          }

          if (includePath) {
            if (iProject) {
              await iProject.addToIncludePaths(includePath);
            } else {
              window.showErrorMessage(l10n.t('Failed to retrieve project'));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.removeFromIncludePaths`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            await iProject.removeFromIncludePaths(element.label!.toString());
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveIncludePathUp`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const pathToMove = element.variable ? element.variable : element.label!.toString();
            await iProject.moveIncludePath(pathToMove, 'up');
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveIncludePathDown`, async (element: RemoteIncludePath | LocalIncludePath) => {
        if (element) {
          const iProject = ProjectManager.get(element.workspaceFolder);

          if (iProject) {
            const pathToMove = element.variable ? element.variable : element.label!.toString();
            await iProject.moveIncludePath(pathToMove, 'down');
          } else {
            window.showErrorMessage(l10n.t('Failed to retrieve project'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.changeLibraryDescription`, async (element: Library) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.changeObjectDesc`, toObjectBrowserObject(element));

          const iProject = ProjectManager.get(element.workspaceFolder);
          await iProject?.forceResetLibraryList(element.libraryInfo.name);

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyLibrary`, async (element: Library) => {
        if (element) {
          const libraryName = await window.showInputBox({
            prompt: l10n.t('Enter new library file name'),
            placeHolder: l10n.t('New library name'),
            validateInput: (name) => {
              if (name.length > 10) {
                return l10n.t('Library name must be 10 characters or less');
              }
              else if (name.toLocaleUpperCase() === element.libraryInfo.name.toLocaleUpperCase()) {
                return l10n.t('New library name must be different from the existing one');
              }
              else {
                return null;
              }
            }
          });

          if (libraryName) {
            try {
              const result = await ibmi!.getConnection().runCommand({ command: `CPYLIB FROMLIB(${element.libraryInfo.name}) TOLIB(${libraryName})` });
              if (!result.code) {
                if (await window.showInformationMessage(l10n.t('{0} successfully copied to {1}.', element.libraryInfo.name, libraryName), l10n.t("Add to library list"))) {
                  await commands.executeCommand("vscode-ibmi-projectexplorer.projectExplorer.addToLibraryList", { name: libraryName });
                }
              }
            } catch (e: any) {
              window.showErrorMessage(l10n.t('Error copying library {0} to {1}', e));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameLibrary`, async (element: Library) => {
        if (element) {
          const objectBrowseObject = toObjectBrowserObject(element);

          let [, newObject] = objectBrowseObject.path.split(`/`);
          let newObjectOK;
          do {
            newObject = await window.showInputBox({
              prompt: l10n.t('Enter new library file name'),
              placeHolder: l10n.t('New library name'),
              validateInput: (name) => {
                if (name.length > 10) {
                  return l10n.t('Library name must be 10 characters or less');
                }
                else if (name.toLocaleUpperCase() === element.libraryInfo.name.toLocaleUpperCase()) {
                  return l10n.t('New library name must be different from the existing one');
                }
                else {
                  return null;
                }
              }
            }) || "";

            if (newObject) {
              const escapedObject = newObject.replace(/'/g, `''`).replace(/`/g, `\\\``).split(`/`);
              const ibmi = getInstance();
              const connection = ibmi!.getConnection();
              newObjectOK = await window.withProgress({ location: ProgressLocation.Notification, title: l10n.t('Renaming object {0} {1} to {2}...', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase(), escapedObject.toString()) }
                , async (progress) => {
                  const renameResult = await connection.runCommand({
                    command: `RNMOBJ OBJ(${objectBrowseObject.path}) OBJTYPE(${objectBrowseObject.object.type}) NEWOBJ(${escapedObject})`,
                    noLibList: true
                  });

                  if (renameResult.code !== 0) {
                    window.showErrorMessage(l10n.t('Error renaming object {0}! {1}', objectBrowseObject.path, renameResult.stderr));
                    return false;
                  }

                  const iProject = ProjectManager.get(element.workspaceFolder);
                  if (iProject) {
                    await iProject.renameLibrary(element.label!.toString(), newObject);
                  } else {
                    window.showErrorMessage(l10n.t('Failed to retrieve project'));
                  }

                  window.showInformationMessage(l10n.t('Renamed object {0} {1} to {2}', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase(), escapedObject.toString()));
                  this.refresh();
                  return true;
                }
              );
            }
          } while (newObject && !newObjectOK);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.clearLibrary`, async (element: Library) => {
        if (element) {
          const library = element.label?.toString();
          const path = `${element.libraryInfo.library}/${element.libraryInfo.name}`;
          const type = element.libraryInfo.type.startsWith(`*`) ? element.libraryInfo.type.substring(1) : element.libraryInfo.type;

          const result = await window.showWarningMessage(l10n.t('Are you sure you want to clear {0} *{1}?', path, type), l10n.t('Yes'), l10n.t('Cancel'));

          if (result === l10n.t('Yes')) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            try {
              await connection.runCommand({ command: `CLRLIB LIB(${library})` });

              window.showInformationMessage(l10n.t('Cleared {0} *{1}.', path, type));
              this.refresh();
            } catch (e: any) {
              window.showErrorMessage(l10n.t('Error clearing library! {0}', e));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteLibrary`, async (element: Library) => {
        if (element) {
          const objectBrowseObject = toObjectBrowserObject(element);

          let result = await window.showWarningMessage(l10n.t('Are you sure you want to delete {0} {1}?', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()), l10n.t(`Yes`), l10n.t(`Cancel`));

          if (result === l10n.t(`Yes`)) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            await window.withProgress({ location: ProgressLocation.Notification, title: l10n.t('Deleting object {0} {1}...', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()) }
              , async (progress) => {
                const deleteResult = await connection.runCommand({
                  command: `DLTOBJ OBJ(${objectBrowseObject.path}) OBJTYPE(${objectBrowseObject.object.type})`,
                  noLibList: true
                });

                if (deleteResult.code === 0) {
                  const iProject = ProjectManager.get(element.workspaceFolder);
                  if (iProject) {
                    await iProject.deleteLibrary(element.label!.toString());
                  } else {
                    window.showErrorMessage(l10n.t('Failed to retrieve project'));
                  }

                  window.showInformationMessage(l10n.t(`Deleted {0} {1}`, objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()));
                  this.refresh();
                } else {
                  window.showErrorMessage(l10n.t(`Error deleting object! {0}`, deleteResult.stderr));
                }
              }
            );
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createSourceFile`, async (element: Library) => {
        if (element) {
          const sourceFileName = await window.showInputBox({
            prompt: l10n.t('Enter source file name'),
            placeHolder: l10n.t('Source file name'),
            validateInput: (name) => {
              if (name.length > 10) {
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

              window.showInformationMessage(l10n.t('Creating source file {0}.', path));
              await connection.runCommand({ command: `CRTSRCPF FILE(${path}) RCDLEN(112)` });

              this.refresh();
            } catch (e: any) {
              window.showErrorMessage(l10n.t('Error creating source file! {0}', e));
            }
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.runAction`, async (element: Project | ObjectFile | MemberFile) => {
        if (element) {
          let chosenUri = element.resourceUri;

          // if project, get the uri of the active editor file if appropriate
          if (element instanceof Project) {
            await ProjectManager.setActiveProject(element.workspaceFolder);

            const activeProject = ProjectManager.getActiveProject();
            chosenUri = activeProject?.workspaceFolder.uri;
            let activeEditor = window.activeTextEditor;

            if (activeEditor) {
              const editorProject = ProjectManager.getProjectFromUri(activeEditor.document.uri);
              if (activeProject?.workspaceFolder.uri === editorProject?.workspaceFolder.uri) {
                chosenUri = activeEditor.document.uri;
              }
            }
          }

          await commands.executeCommand(`code-for-ibmi.runAction`, chosenUri);

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.changeObjectDescription`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.changeObjectDesc`, toObjectBrowserObject(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.copyObject`, toObjectBrowserObject(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.renameObject`, toObjectBrowserObject(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteObject`, async (element: ObjectFile) => {
        if (element) {
          const objectBrowseObject = toObjectBrowserObject(element);

          let result = await window.showWarningMessage(l10n.t('Are you sure you want to delete {0} {1}?', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()), { modal: true }, l10n.t(`Yes`));

          if (result === l10n.t(`Yes`)) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            await window.withProgress({ location: ProgressLocation.Notification, title: l10n.t('Deleting object {0} {1}...', objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()) }
              , async (progress) => {
                const deleteResult = await connection.runCommand({
                  command: `DLTOBJ OBJ(${objectBrowseObject.path}) OBJTYPE(${objectBrowseObject.object.type})`,
                  noLibList: true
                });

                if (deleteResult.code === 0) {
                  window.showInformationMessage(l10n.t(`Deleted {0} {1}`, objectBrowseObject.path, objectBrowseObject.object.type.toUpperCase()));
                  this.refresh();
                } else {
                  window.showErrorMessage(l10n.t(`Error deleting object! {0}`, deleteResult.stderr));
                }
              }
            );
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.moveObject`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.moveObject`, toObjectBrowserObject(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.createMember`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.createMember`, toObjectBrowserObject(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.searchSourceFile`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.searchSourceFile`, toObjectBrowserObject(element));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.debug.batch`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.debug.batch`, toObjectBrowserObject(element), element.workspaceFolder);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.debug.sep`, async (element: ObjectFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.debug.sep`, toObjectBrowserObject(element), element.workspaceFolder);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.browse`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.browse`, toObjectBrowserMember(element));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.edit`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.edit`, toObjectBrowserMember(element));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.selectForCompare`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.selectForCompare`, toObjectBrowserMember(element));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.compareWithSelected`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.compareWithSelected`, toObjectBrowserMember(element));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.updateMemberText`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.updateMemberText`, toObjectBrowserMember(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.copyMember`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.copyMember`, toObjectBrowserMember(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.renameMember`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.renameMember`, toObjectBrowserMember(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.deleteMember`, async (element: MemberFile) => {
        if (element) {
          const objectBrowseMember = toObjectBrowserMember(element);

          let result = await window.showWarningMessage(l10n.t('Are you sure you want to delete {0}?', objectBrowseMember.path!), { modal: true }, l10n.t(`Yes`));

          if (result === l10n.t(`Yes`)) {
            const ibmi = getInstance();
            const connection = ibmi!.getConnection();

            await window.withProgress({ location: ProgressLocation.Notification, title: l10n.t('Deleting member {0}...', objectBrowseMember.path!) }
              , async (progress) => {
                const deleteResult = await connection.runCommand({
                  command: `RMVM FILE(${objectBrowseMember.member.library}/${objectBrowseMember.member.file}) MBR(${objectBrowseMember.member.name})`,
                  noLibList: true
                });


                if (deleteResult.code === 0) {
                  window.showInformationMessage(l10n.t(`Deleted {0}`, objectBrowseMember.path!));
                  this.refresh();
                } else {
                  window.showErrorMessage(l10n.t(`Error deleting member! {0}`, deleteResult.stderr));
                }
              }
            );
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.download`, async (element: ObjectFile | MemberFile) => {
        if (element) {
          const objectBrowserItem = element instanceof ObjectFile ? toObjectBrowserObject(element) : toObjectBrowserMember(element);
          await commands.executeCommand(`code-for-ibmi.downloadMemberAsFile`, objectBrowserItem);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.uploadAndReplace`, async (element: MemberFile) => {
        if (element) {
          await commands.executeCommand(`code-for-ibmi.uploadAndReplaceMemberAsFile`, toObjectBrowserMember(element));
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.addFolderToWorkspace`, async (element: ErrorItem) => {
        if (element) {
          await commands.executeCommand(`workbench.action.addRootFolder`);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.openConnectionBrowser`, async () => {
        const isInMerlin = EnvironmentManager.isInMerlin();
        await commands.executeCommand(isInMerlin ? `ibmideveloper.connectionBrowser.focus` : `connectionBrowser.focus`);
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.scanForProjects`, async () => {
        const projects = ProjectManager.getProjects();
        const uris = projects.map(project => project.workspaceFolder.uri);
        for (const uri of uris) {
          ProjectManager.scanAndAddSubIProjects(uri, true);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.setDeployLocation`, async (element?: ErrorItem | WorkspaceFolder) => {
        let workspaceFolder: WorkspaceFolder | undefined;
        if (element instanceof ErrorItem) {
          workspaceFolder = element.workspaceFolder;
        } else if (element) {
          workspaceFolder = element;
        } else {
          const activeProject = ProjectManager.getActiveProject();
          workspaceFolder = activeProject?.workspaceFolder;
        }

        if (workspaceFolder) {
          const iProject = ProjectManager.get(workspaceFolder);

          if (iProject) {
            const defaultDeployLocation = iProject?.getDefaultDeployLocation();
            await commands.executeCommand(`code-for-ibmi.setDeployLocation`, undefined, workspaceFolder, defaultDeployLocation);
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.connect`, async () => {
        const connections = workspace.getConfiguration(`code-for-ibmi`).get<ConnectionData[]>('connections');
        if (connections && connections.length) {
          await commands.executeCommand(`code-for-ibmi.connectTo`, connections.length === 1 ? connections[0].name : undefined);
        } else {
          //Connect to a new system
          await commands.executeCommand(`code-for-ibmi.connect`);
        }
      })
    );
  }

  setTreeView(treeView: TreeView<ProjectExplorerTreeItem>) {
    this.treeView = treeView;
  }

  /**
   * Refresh the entire tree view or a specific tree item.
   * 
   * @param element The tree item to refresh.
   */
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
          await ProjectManager.load(folder);

          const iProject = ProjectManager.get(folder);
          if (iProject) {
            const metadataExists = await iProject.projectFileExists('iproj.json');
            if (metadataExists) {
              const state = await iProject.getState();

              if (state) {
                await iProject.syncLiblVars();
                items.push(new Project(folder, state));
              } else {
                const validatorResult = iProject.getValidatorResult();
                if (validatorResult) {
                  const errors = validatorResult.errors
                    .map(error => `• ${error.stack.replace('instance.', '').replace('instance', 'iproj')}`)
                    .join('\n');
                  items.push(ErrorItem.createResolveIProjError(folder, errors));
                } else {
                  items.push(new Project(folder));
                }
              }
            } else {
              items.push(ErrorItem.createNoIProjError(folder));
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
        items.push(ErrorItem.createNoWorkspaceFolderError());
      }

      return items;
    }
  }

  async resolveTreeItem(item: TreeItem, element: ProjectExplorerTreeItem, token: CancellationToken): Promise<ProjectExplorerTreeItem>  {
    if (element.getToolTip) {
      element.tooltip = await element.getToolTip();
    }

    return element;
  }

  /**
   * Get the project tree item associated with an IBM i project.
   * 
   * @param iProject The IBM i project.
   * @returns The project tree item or `undefined`.
   */
  getProjectTreeItem(iProject: IProject): Project | undefined {
    for (const projectTreeItem of this.projectTreeItems) {
      if (projectTreeItem.workspaceFolder === iProject.workspaceFolder) {
        return projectTreeItem;
      }
    }
  }
}

function toObjectBrowserObject(objectFile: Library | ObjectFile) {
  const object = Object.assign({}, "objectFileInfo" in objectFile ? objectFile.objectFileInfo : objectFile.libraryInfo);
  return {
    path: `${object.library}/${object.name}`,
    object,
    updateDescription: () => { }
  };
}

function toObjectBrowserMember(memberFile: MemberFile) {
  const member = Object.assign({}, memberFile.memberFileInfo);
  return {
    resourceUri: memberFile.resourceUri,
    path: memberFile.resourceUri?.path.substring(1),
    member
  };
}