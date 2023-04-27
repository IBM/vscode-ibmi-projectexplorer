/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectTreeItem";
import { getInstance } from "../../ibmi";
import ObjectFile from "./objectFile";
import MemberFile from "./memberFile";
import { ContextValue } from "../../projectExplorerApi";

export default class Library extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.library;
  name: string;

  constructor(public workspaceFolder: WorkspaceFolder, path: string, name: string) {
    super(name, TreeItemCollapsibleState.Collapsed);
    this.description = path;
    this.contextValue = this.contextValue;
    this.iconPath = new ThemeIcon(`symbol-folder`);
    this.name = name;
    this.tooltip = `Library ${path}`
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    const files = await ibmi?.getContent().getObjectList({
      library: this.name
    });
    if (files) {
      for (const file of files) {
        const path = `/QSYS.LIB/${this.name}/${file.name}`;
        if (file.attribute === "PF") {
          items.push(new ObjectFile(this.workspaceFolder, path, this.name, file.name, file.text));
        } else {
          // This is some other non physical file type
          items.push(new MemberFile(this.workspaceFolder, path, file.attribute, file.type, this.name, file.name, false, file.text, null));
        }
      }
    }

    return items;
  }
}