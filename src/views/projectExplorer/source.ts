/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import { FileType, ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, workspace } from "vscode";
import { ContextValue } from "../../projectExplorerApi";
import { DeploymentParameters } from "@halcyontech/vscode-ibmi-types";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getDeployment } from "../../ibmi";
import SourceDirectory from "./sourceDirectory";
import SourceFile from "./sourceFile";

export interface SourceInfo {
  name: string,
  type: FileType,
  uri: Uri,
  children: SourceInfo[]
}

/**
 * Tree item for the Source heading
 */
export default class Source extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.source;
  deploymentParameters: DeploymentParameters;

  constructor(public workspaceFolder: WorkspaceFolder, deploymentParameters: DeploymentParameters) {
    super(l10n.t('Source'), TreeItemCollapsibleState.Collapsed);

    this.deploymentParameters = deploymentParameters;
    this.contextValue = Source.contextValue;
    this.iconPath = new ThemeIcon(`server-environment`);
    let deploymentMethodDescription: string;
    switch (deploymentParameters.method) {
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
    this.description = `${deploymentParameters.remotePath} (${deploymentMethodDescription})`;
    this.tooltip = l10n.t('Deploy Location: {0}\n', deploymentParameters.remotePath) +
      l10n.t('Deployment Method: {0}\n', deploymentMethodDescription);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const deployment = getDeployment()!;

    const deployFiles: Uri[] = [];
    switch (this.deploymentParameters.method) {
      case 'compare':
        deployFiles.push(...await deployment.getDeployCompareFiles(this.deploymentParameters));
        break;
      case 'changed':
        deployFiles.push(...await deployment.getDeployChangedFiles(this.deploymentParameters));
        break;
      case 'unstaged':
        deployFiles.push(...await deployment.getDeployGitFiles(this.deploymentParameters, 'working'));
        break;
      case 'staged':
        deployFiles.push(...await deployment.getDeployGitFiles(this.deploymentParameters, 'staged'));
        break;
      case 'all':
        deployFiles.push(...await deployment.getDeployAllFiles(this.deploymentParameters));
        break;
    }

    const deployFileTree = await this.getTreeFromFileList(deployFiles);
    for (const child of deployFileTree.children) {
      if (child.type === FileType.Directory) {
        items.push(new SourceDirectory(this.workspaceFolder, child));
      } else {
        items.push(new SourceFile(this.workspaceFolder, child));
      }
    }

    items.sort((a, b) => {
      const fileTypeA = a instanceof SourceDirectory ? 0 : 1;
      const fileTypeB = b instanceof SourceDirectory ? 0 : 1;

      return fileTypeA - fileTypeB || a.label!.toString().localeCompare(b.label!.toString());
    });

    return items;
  }

  private async getTreeFromFileList(files: Uri[]): Promise<SourceInfo> {
    const workspaceFolderUri = this.workspaceFolder.uri;
    const deployTree: SourceInfo = {
      name: path.basename(workspaceFolderUri.fsPath),
      type: FileType.Directory,
      uri: workspaceFolderUri,
      children: []
    };

    for await (const file of files) {
      let subTree = deployTree;

      const relativePath = path.relative(workspaceFolderUri.fsPath, file.fsPath);
      const parts = relativePath.split(path.sep);
      for (const part of parts) {
        const subTreeNames = subTree.children.map(child => child.name);
        const index = subTreeNames.indexOf(part);

        if (index > -1) {
          subTree = subTree.children[index];
        } else {
          const uri = Uri.joinPath(subTree.uri, part);
          const statResult = await workspace.fs.stat(uri);
          subTree.children.push({ name: part, type: statResult.type, uri: uri, children: [] });
          subTree = subTree.children[subTree.children.length - 1];
        }
      }
    }

    return deployTree;
  }
}