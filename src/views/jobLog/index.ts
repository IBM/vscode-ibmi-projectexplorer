/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands, env, EventEmitter, ExtensionContext, l10n, TreeDataProvider, window, workspace } from "vscode";
import ErrorItem from "../projectExplorer/errorItem";
import { ProjectManager } from "../../projectManager";
import Project from "./project";
import Command from "./command";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { IProjectT } from "../../iProjectT";

export default class JobLog implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<ProjectExplorerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.refreshJobLog`, () => {
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showJobLog`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          const jobLogExists = await iProject.projectFileExists('joblog.json');
          if (jobLogExists) {
            const jobLogUri = iProject.getProjectFileUri('joblog.json');
            await workspace.openTextDocument(jobLogUri).then(async jobLogDoc => {
              await window.showTextDocument(jobLogDoc);
            });
          } else {
            window.showErrorMessage(l10n.t('No job log found'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showBuildOutput`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          const buildOutputExists = await iProject.projectFileExists('output.log');
          if (buildOutputExists) {
            const buildOutputUri = iProject.getProjectFileUri('output.log');
            await workspace.openTextDocument(buildOutputUri).then(async buildOutputDoc => {
              await window.showTextDocument(buildOutputDoc);
            });
          } else {
            window.showErrorMessage(l10n.t('No build output found'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.clearJobLogs`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          await iProject.clearJobLogs();
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.copy`, async (element: Command) => {
        try {
          await env.clipboard.writeText(element.label!.toString());
        } catch (error) {
          window.showErrorMessage(l10n.t('Failed to copy command'));
        }
      })
    );
  }

  refresh() {
    this._onDidChangeTreeData.fire(null);
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

          let state: IProjectT | undefined;

          const iProject = ProjectManager.get(folder);
          if (iProject) {
            state = await iProject.getState();
          }

          items.push(new Project(folder, state));
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
}