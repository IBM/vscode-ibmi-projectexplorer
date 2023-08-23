/*
 * (c) Copyright IBM Corp. 2023
 */

import * as path from "path";
import { FileType, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder, l10n, workspace } from "vscode";
import { ContextValue } from "../../ibmiProjectExplorer";
import { DeploymentParameters } from "@halcyontech/vscode-ibmi-types";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getDeployTools } from "../../ibmi";
import SourceDirectory from "./sourceDirectory";
import SourceFile from "./sourceFile";

export interface SourceInfo {
  name: string,
  type: FileType,
  localUri: Uri,
  remoteUri: Uri,
  children: SourceInfo[]
}

/**
 * Tree item for the Source heading
 */
export default class Source extends TreeItem implements ProjectExplorerTreeItem {
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
      l10n.t('Deployment Method: {0}', deploymentMethodDescription);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const deployTools = getDeployTools()!;

    const deployFiles: Uri[] = [];
    switch (this.deploymentParameters.method) {
      case 'compare':
        deployFiles.push(...await deployTools.getDeployCompareFiles(this.deploymentParameters));
        break;
      case 'changed':
        deployFiles.push(...await deployTools.getDeployChangedFiles(this.deploymentParameters));
        break;
      case 'unstaged':
        deployFiles.push(...await deployTools.getDeployGitFiles(this.deploymentParameters, 'working'));
        break;
      case 'staged':
        deployFiles.push(...await deployTools.getDeployGitFiles(this.deploymentParameters, 'staged'));
        break;
      case 'all':
        deployFiles.push(...await deployTools.getDeployAllFiles(this.deploymentParameters));
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
      localUri: workspaceFolderUri,
      remoteUri: Uri.parse(this.deploymentParameters.remotePath).with({ scheme: `streamfile`, query: `readonly=true` }),
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
          const localUri = Uri.joinPath(subTree.localUri, part);
          const statResult = await workspace.fs.stat(localUri);
          const remoteUri = Uri.joinPath(subTree.remoteUri, part);

          subTree.children.push({
            name: part,
            type: statResult.type,
            localUri: localUri,
            remoteUri: remoteUri,
            children: []
          });
          subTree = subTree.children[subTree.children.length - 1];
        }
      }
    }

    return deployTree;
  }
}