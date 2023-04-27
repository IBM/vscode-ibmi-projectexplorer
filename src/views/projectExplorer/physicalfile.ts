/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import * as path from "path";
import { ProjectExplorerTreeItem } from "./projectTreeItem";
import MemberFile from "./file";
import { getInstance } from "../../ibmi";
import { ContextValue } from "../../typings";

export default class ObjectFile extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.objectFile;
  library: string;
  file: string;

  constructor(public workspaceFolder: WorkspaceFolder, fullpath: string, library: string, file: string, text: string) {
    super(`${path.posix.basename(fullpath)}`, TreeItemCollapsibleState.Collapsed);

    this.resourceUri = Uri.from({
      scheme: `physicalfile`,
      path: fullpath
    });
    this.library = library;
    this.file = file;
    this.description = "(PF)"
    this.tooltip = text;
    this.contextValue = ObjectFile.contextValue;
    this.iconPath = new ThemeIcon(`file`);
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const members = await ibmi?.getContent().getMemberList(this.library, this.file);

    if (members) {
      for (const member of members) {
        items.push(new MemberFile(this.workspaceFolder, member.name, member.extension, "MBR", this.library, this.file, true, member.text, member));
      }
    }

    return items;
  }
}