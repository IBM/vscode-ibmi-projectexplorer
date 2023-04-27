/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import * as path from "path";
import { ProjectTreeItem } from "./projectTreeItem";
import IFSFile from "./ifsFile";
import { getInstance } from "../../ibmi";
import { ContextValue } from "../../typings";

export default class IFSDirectory extends ProjectTreeItem {
  static contextValue = ContextValue.ifsDirectory;

  constructor(public workspaceFolder: WorkspaceFolder, ifsFolder: string, customTitle?: string) {
    super(customTitle || path.posix.basename(ifsFolder), TreeItemCollapsibleState.Collapsed);

    if (customTitle) {
      this.description = ifsFolder;
    }

    this.resourceUri = Uri.from({
      scheme: `streamfile`,
      path: ifsFolder
    });
    this.contextValue = IFSDirectory.contextValue;
    this.iconPath = new ThemeIcon(`symbol-folder`);
  }

  async getChildren(): Promise<ProjectTreeItem[]> {
    let items: ProjectTreeItem[] = [];

    const ibmi = getInstance();
    const objects = await ibmi?.getContent().getFileList(this.resourceUri?.path!);
    const objectItems = objects?.map((object) => (object.type === `directory` ? new IFSDirectory(this.workspaceFolder, object.path) : new IFSFile(this.workspaceFolder, object.path))) || [];

    items.push(...objectItems);
    return items;
  }
}


