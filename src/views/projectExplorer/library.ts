/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getInstance } from "../../ibmi";
import ObjectFile from "./objectFile";
import MemberFile from "./memberFile";
import { ContextValue } from "../../projectExplorerApi";

export enum LibraryType {
  library,
  systemLibrary,
  currentLibrary,
  userLibrary
}

/**
 * Tree item for a library
 */
export default class Library extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.library;
  name: string;
  type: LibraryType;

  constructor(public workspaceFolder: WorkspaceFolder, path: string, name: string, type: LibraryType) {
    super(name, TreeItemCollapsibleState.Collapsed);
    this.description = path;
    this.contextValue = Library.contextValue;
    this.name = name;
    this.tooltip = `Library ${path}`;
    this.type = type;

    let iconColor: ThemeColor | undefined;
    switch (type) {
      case LibraryType.systemLibrary:
        iconColor = new ThemeColor('projectExplorer.systemLibrary');
        break;
      case LibraryType.currentLibrary:
        iconColor = new ThemeColor('projectExplorer.currentLibrary');
        break;
      case LibraryType.userLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        break;
      default:
        iconColor = undefined;
    }
    this.iconPath = new ThemeIcon(`library`, iconColor);
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