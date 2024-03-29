/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { ProjectManager } from "../../projectManager";
import ErrorItem from "./errorItem";
import Variable from "./variable";
import { ContextValue } from "../../ibmiProjectExplorer";

/**
 * Tree item for the Variables heading.
 */
export default class Variables extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.variables;

  constructor(public workspaceFolder: WorkspaceFolder, unresolvedVariableCount: number) {
    super(l10n.t('Variables'), TreeItemCollapsibleState.Collapsed);

    this.resourceUri = Uri.parse(`variables:${unresolvedVariableCount}`, true);
    this.contextValue = Variables.contextValue;
    this.iconPath = new ThemeIcon(`symbol-variable`, new ThemeColor(`icon.foreground`));
    this.tooltip = l10n.t('Variables');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const iProject = ProjectManager.get(this.workspaceFolder);
    const possibleVariables = await iProject?.getVariables();
    if (!possibleVariables) {
      return [];
    }

    const actualValues = await iProject?.getEnv();
    if (!actualValues) {
      return [ErrorItem.createRetrieveEnvironmentVariablesError(this.workspaceFolder)];
    }

    items.push(...possibleVariables.map(
      varName => {
        return new Variable(this.workspaceFolder, varName, actualValues[varName]);
      }
    ));

    return items;
  }
}