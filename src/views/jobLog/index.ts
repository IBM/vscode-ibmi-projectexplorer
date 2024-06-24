/*
 * (c) Copyright IBM Corp. 2023
 */

import { commands, env, EventEmitter, ExtensionContext, l10n, TreeDataProvider, TreeView, window, workspace } from "vscode";
import { ProjectManager } from "../../projectManager";
import Project from "./project";
import IleObject from "./ileObject";
import Command from "./command";
import { ProjectExplorerTreeItem } from "../projectExplorer/projectExplorerTreeItem";
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
  private treeView: TreeView<ProjectExplorerTreeItem> | undefined;

  constructor(context: ExtensionContext) {
    this.loadAllJobLogs();

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
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.copy`, async (element: IleObject | Command) => {
        try {
          var commandString = '';
          if (element instanceof Command) {
            commandString = element.cmd;
          } else if (element instanceof IleObject) {
            commandString = element.objectInfo.cmd;
          }
          await env.clipboard.writeText(commandString);
        } catch (error) {
          window.showErrorMessage(l10n.t('Failed to copy command'));
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showObjectOutput`, async (element: IleObject) => {
        const iProject = ProjectManager.get(element.workspaceFolder);
        if (iProject) {

          const fileName = path.basename(element.objectInfo.output);
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
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showFailedObjects`, async (element: Log) => {
        const iProject = ProjectManager.get(element.workspaceFolder);

        if (iProject) {
          element.jobLogInfo.toggleShowFailedObjects();
          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-ibmi-projectexplorer.jobLog.showAllObjects`, async (element: Log) => {
        const iProject = ProjectManager.get(element.workspaceFolder);

        if (iProject) {
          element.jobLogInfo.toggleShowFailedObjects();
          this.refresh();
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

          const severityFilter = await window.showQuickPick(severities, {
            placeHolder: l10n.t('Select Severity Level'),
            canPickMany: false
          });

          if (severityFilter) {
            element.jobLogInfo.setSeverityLevel(severityFilter.severityLevel);
            this.refresh();
          }
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
  async refresh(element?: ProjectExplorerTreeItem) {
    if (!element) {
      await this.loadAllJobLogs().then(() => {
        this._onDidChangeTreeData.fire();
      });
    } else {
      this._onDidChangeTreeData.fire(element);
    }
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

  async loadAllJobLogs() {
    // Load all job logs
    for (const iProject of ProjectManager.getProjects()) {
      await iProject?.readJobLog();
    }

    // Update view badge
    const activeProject = ProjectManager.getActiveProject();
    if (activeProject) {
      const jobLogs = activeProject?.getJobLogs().slice().reverse();
      const jobLogExists = await activeProject?.projectFileExists('joblog.json');

      if (jobLogExists && jobLogs[0]) {
        const numFailedObjects = jobLogs[0].objects.filter(object => object.failed).length
        this.updateBadge(numFailedObjects);
      } else {
        this.updateBadge(0);
      }
    }
  }

  updateBadge(numFailedObjects: number) {
    if (numFailedObjects > 0) {
      this.treeView!.badge = {
        tooltip: l10n.t('{0} Failed Object(s)', numFailedObjects),
        value: numFailedObjects
      }
    } else {
      this.treeView!.badge = undefined;
    }
  }
}