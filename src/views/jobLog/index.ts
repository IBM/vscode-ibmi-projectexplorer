import { CancellationToken, commands, env, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace, WorkspaceFolder } from "vscode";
import { getInstance } from "../../ibmi";
import { IProject } from "../../iproject";
import ErrorItem from "../../test/errorItem";
import { ProjectManager } from "../../projectManager";
import Log from "./log";
import Command from "./command";
import Message from "./message";
import Project from "../projectExplorer/project";

export default class JobLog implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-ibmi-projectmode.jobLog.refresh`, () => {
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.jobLog.showJobLog`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          const jobLogExists = await iProject.jobLogExists();
          if (jobLogExists) {
            const jobLogUri = iProject.getJobLogPath();
            await workspace.openTextDocument(jobLogUri).then(async jobLogDoc => {
              await window.showTextDocument(jobLogDoc);
            });
          } else {
            window.showErrorMessage('No job log found.');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.jobLog.showBuildOutput`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          const buildOutputExists = await iProject.buildOutputExists();
          if (buildOutputExists) {
            const buildOutputUri = iProject.getBuildOutputPath();
            await workspace.openTextDocument(buildOutputUri).then(async buildOutputDoc => {
              await window.showTextDocument(buildOutputDoc);
            });
          } else {
            window.showErrorMessage('No build output found.');
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.jobLog.clearJobLogs`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          await iProject.clearJobLogs();
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectmode.jobLog.copy`, async (element: Command) => {      
        try {
            await env.clipboard.writeText(element.label!.toString());
        } catch (error) {
            window.showErrorMessage('Failed to copy command.');
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
    if (element) {
      let items: TreeItem[] = [];
      let iProject: IProject | undefined;

      switch (element.contextValue) {
        case Project.contextValue:
          const projectElement = element as Project;

          iProject = ProjectManager.get(projectElement.workspaceFolder);
          await iProject?.readJobLog();
          const jobLogs = iProject?.getJobLogs().slice().reverse();
          const jobLogExists = await iProject?.jobLogExists();

          if (jobLogs) {
            items.push(...jobLogs?.map((jobLog, index) => {
              if (index === 0 && jobLogExists) {
                // Local job log
                return new Log(jobLogs[0], true);
              } else {
                // Old job logs in memory
                return new Log(jobLog);
              }
            }
            ));
          } else {
            items.push(new ErrorItem(`No job log found.`));
          }

          break;
        case Log.contextValue:
          const logElement = element as Log;
          const jobLogInfo = logElement.jobLogInfo;

          items.push(...jobLogInfo.commands?.map(
            command => new Command(command)
          ));
          break;

        case Command.contextValue:
          const commandElement = element as Command;
          const commandInfo = commandElement.commandInfo;
          if (commandInfo.msgs) {
            items.push(...commandInfo.msgs?.map(
              msgs => new Message(msgs)
            ));
          }

          break;
      }

      return items;

    } else {
      const workspaceFolders = workspace.workspaceFolders;

      if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders.map(folder => {
          ProjectManager.load(folder);

          return new Project(folder);
        });
      } else {
        return [new ErrorItem(`Please open a local workspace folder.`)];
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