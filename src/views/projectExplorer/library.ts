/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getInstance } from "../../ibmi";
import ObjectFile from "./objectFile";
import { ContextValue } from "../../projectExplorerApi";
import { IBMiObject } from "@halcyontech/vscode-ibmi-types";

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
  libraryInfo: IBMiObject;
  libraryType: LibraryType;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, libraryInfo: IBMiObject, libraryType: LibraryType) {
    super(libraryInfo.name, TreeItemCollapsibleState.Collapsed);

    this.libraryInfo = libraryInfo;
    this.libraryType = libraryType;
    const type = libraryInfo.type.startsWith(`*`) ? libraryInfo.type.substring(1) : libraryInfo.type;
    this.path = `/${libraryInfo.library}.LIB/${libraryInfo.name}.${type}`;
    this.contextValue = Library.contextValue;
    this.iconPath = new ThemeIcon(`library`);
    this.description = (libraryInfo.text.trim() !== '' ? `${libraryInfo.text} ` : ``) +
      (libraryInfo.attribute?.trim() !== '' ? `(${libraryInfo.attribute})` : '');
    this.tooltip = `Name: ${libraryInfo.name}\n` +
      `Path: ${this.path}\n` +
      (libraryInfo.text.trim() !== '' ? `Text: ${libraryInfo.text}\n` : ``) +
      `Attribute: ${libraryInfo.attribute}\n` +
      `Type: ${libraryInfo.type}`;
    let iconColor: ThemeColor | undefined;
    switch (this.libraryType) {
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
    const objectFiles = await ibmi?.getContent().getObjectList({ library: this.libraryInfo.name, }, 'name');
    if (objectFiles) {
      for (const objectFile of objectFiles) {
        items.push(new ObjectFile(this.workspaceFolder, objectFile, this.path));
      }
    }

    return items;
  }
}