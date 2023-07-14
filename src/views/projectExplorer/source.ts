/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import { FileType, ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, workspace } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { DeploymentMethod } from "@halcyontech/vscode-ibmi-types";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getDeployment } from "../../ibmi";
import SourceDirectory from "./sourceDirectory";
import SourceFile from "./sourceFile";
import { getDefaultIgnoreRules } from "../../iproject";

export interface SourceInfo {
  name: string,
  uri: Uri,
  children: SourceInfo[]
}

/**
 * Tree item for the Source heading
 */
export default class Source extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.source;
  deployLocation: string;
  deploymentMethod: DeploymentMethod;

  constructor(public workspaceFolder: WorkspaceFolder, deployLocation: string, deploymentMethod: DeploymentMethod) {
    super(l10n.t('Source'), TreeItemCollapsibleState.Collapsed);

    this.deployLocation = deployLocation;
    this.deploymentMethod = deploymentMethod ? deploymentMethod : 'compare';
    this.contextValue = Source.contextValue;
    this.iconPath = new ThemeIcon(`server-environment`);
    let deploymentMethodDescription: string;
    switch (deploymentMethod) {
      case 'compare':
        deploymentMethodDescription = l10n.t('compare');
        break;
      case 'changed':
        deploymentMethodDescription = l10n.t('changed');
        break;
      case 'unstaged':
        deploymentMethodDescription = l10n.t('unstaged');
        break;
      case 'staged':
        deploymentMethodDescription = l10n.t('staged');
        break;
      case 'all':
        deploymentMethodDescription = l10n.t('all');
        break;
    }
    this.description = `${deployLocation} (${deploymentMethodDescription})`;
    this.tooltip = l10n.t('Deploy Location: {0}\n', deployLocation) +
      l10n.t('Deploy Method: {0}\n', deploymentMethodDescription);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const deployment = getDeployment()!;
    const deployParameters = {
      method: this.deploymentMethod,
      workspaceFolder: this.workspaceFolder,
      remotePath: this.deployLocation,
      ignore: await getDefaultIgnoreRules(this.workspaceFolder)
    };

    const deployFiles: Uri[] = [];
    switch (this.deploymentMethod) {
      case 'compare':
        deployFiles.push(...await deployment.getDeployCompareFiles(deployParameters));
        break;
      case 'changed':
        deployFiles.push(...await deployment.getDeployChangedFiles(deployParameters));
        break;
      case 'unstaged':
        deployFiles.push(...await deployment.getDeployGitFiles(deployParameters, 'working'));
        break;
      case 'staged':
        deployFiles.push(...await deployment.getDeployGitFiles(deployParameters, 'staged'));
        break;
      case 'all':
        deployFiles.push(...await deployment.getDeployAllFiles(deployParameters));
        break;
    }

    const deployFileTree = this.getTreeFromFileList(deployFiles);
    for (const child of deployFileTree.children) {
      try {
        const statResult = await workspace.fs.stat(child.uri);
        if (statResult.type === FileType.Directory) {
          items.push(new SourceDirectory(this.workspaceFolder, child));
        } else {
          items.push(new SourceFile(this.workspaceFolder, child));
        }
      } catch (e) { }
    }

    items.sort((a, b) => {
      const fileTypeA = a instanceof SourceDirectory ? 0 : 1;
      const fileTypeB = b instanceof SourceDirectory ? 0 : 1;

      return fileTypeA - fileTypeB || a.label!.toString().localeCompare(b.label!.toString());
    });

    return items;
  }

  public setDeploymentMethod(deploymentMethod: DeploymentMethod) {
    this.deploymentMethod = deploymentMethod;
  }

  private getTreeFromFileList(files: Uri[]): SourceInfo {
    const workspaceFolderUri = this.workspaceFolder.uri;
    const deployTree: SourceInfo = {
      name: path.basename(workspaceFolderUri.fsPath),
      uri: workspaceFolderUri,
      children: []
    };

    for (const file of files) {
      let subTree = deployTree;

      const relativePath = path.relative(workspaceFolderUri.fsPath, file.fsPath);
      const parts = relativePath.split(path.sep);
      for (const part of parts) {
        const subResults = subTree.children.map(child => child.name);
        const index = subResults.indexOf(part);

        if (index > -1) {
          subTree = subTree.children[index];
        } else {
          subTree.children.push({ name: part, uri: Uri.joinPath(subTree.uri, part), children: [] });
          subTree = subTree.children[subTree.children.length - 1];
        }
      }
    }

    return deployTree;
  }
}