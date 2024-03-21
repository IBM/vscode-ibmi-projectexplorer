/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands, env, EventEmitter, ExtensionContext, l10n, TreeDataProvider, window, workspace } from "vscode";
import { ProjectManager } from "../../projectManager";
import Project from "./project";
import Command from "./command";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
import { ContextValue } from "../../ibmiProjectExplorer";
import { IProjectT } from "../../iProjectT";
import ErrorItem from "./errorItem";
import Log from "./log";

const path = require('path');

/**
 * Represents the Job Log tree data provider.
 */
export default class JobLog implements TreeDataProvider<ProjectExplorerTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ProjectExplorerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.refreshJobLog`, () => {
        this.refresh();
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.refresh`, (element: ProjectExplorerTreeItem) => {
        this.refresh(element);
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
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.clearJobLogs`, async (element: Project) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {
          await iProject.clearJobLogs();
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.copy`, async (element: Command) => {
        try {
          await env.clipboard.writeText(element.commandInfo.cmd);
        } catch (error) {
          window.showErrorMessage(l10n.t('Failed to copy command'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showObjectOutput`, async (element: Command) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {

          const fileName = path.basename(element.commandInfo.output);
          const buildOutputExists = await iProject.projectFileExists(fileName);

          if (buildOutputExists) {
            const buildOutputUri = iProject.getProjectFileUri(fileName);
            await workspace.openTextDocument(buildOutputUri).then(async buildOutputDoc => {
              await window.showTextDocument(buildOutputDoc);
            });
          } else {
            window.showErrorMessage(l10n.t('No object build output found'));
          }
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showOnlyFailedJobs`, async (element: Log) => {
        const iProject = ProjectManager.get(element.workspaceFolder);

        if (iProject) {
          element.toggleShowFailed();
          this.refresh(element);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showAllJobs`, async (element: Log) => {
        const iProject = ProjectManager.get(element.workspaceFolder);

        if (iProject) {
          element.toggleShowFailed();
          this.refresh(element);
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.filterMessageSeverity`, async (element: Log) => {
        const iProject = ProjectManager.get(element.workspaceFolder);

        if (iProject) {
          let severities = [];

          severities.push({ severityLevel: 0, label: l10n.t('All'), description: l10n.t('All Messages') });
          severities.push({ severityLevel: 10, label: l10n.t('10'), description: l10n.t('Severity 10 or more') });
          severities.push({ severityLevel: 20, label: l10n.t('20'), description: l10n.t('Severity 20 or more') });
          severities.push({ severityLevel: 30, label: l10n.t('30'), description: l10n.t('Severity 30 or more') });
          severities.push({ severityLevel: 40, label: l10n.t('40'), description: l10n.t('Severity 40 or more') });
          severities.push({ severityLevel: 50, label: l10n.t('50'), description: l10n.t('Severity 50 or more') });

          const severityFilter = await window.showQuickPick(severities, { placeHolder: l10n.t('Select Severity Level'), canPickMany: false });
          if (severityFilter) {
            element.setSeverityLevel(severityFilter.severityLevel);
            this.refresh(element);
          }
        }
      })
    );
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

          let state: IProjectT | undefined;

          const iProject = ProjectManager.get(folder);
          if (iProject) {
            const metadataExists = await iProject.projectFileExists('iproj.json');

            if (metadataExists) {
              state = await iProject.getState();
            }
          }

          items.push(new Project(folder, state));
        }
      } else {
        items.push(ErrorItem.createNoWorkspaceFolderError());
      }

      return items;
    }
  }
}