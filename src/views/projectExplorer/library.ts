/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getInstance } from "../../ibmi";
import ObjectFile from "./objectFile";
import { ContextValue } from "../../projectExplorerApi";
import { IBMiFile } from "@halcyontech/vscode-ibmi-types";

/**
 * Tree item for a library
 */
export default class Library extends ProjectExplorerTreeItem {
  static contextValue = ContextValue.library;
  libraryInfo: IBMiFile;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, libraryInfo: IBMiFile) {
    super(libraryInfo.name, TreeItemCollapsibleState.Collapsed);
    this.libraryInfo = libraryInfo;
    const type = libraryInfo.type.startsWith(`*`) ? libraryInfo.type.substring(1) : libraryInfo.type;
    this.path = `/${libraryInfo.library}.LIB/${libraryInfo.name}.${type}`;
    this.contextValue = Library.contextValue;
    this.iconPath = new ThemeIcon(`library`);
    this.description = (libraryInfo.text.trim() !== '' ? `${libraryInfo.text} ` : ``) +
      (libraryInfo.attribute ? `(${libraryInfo.attribute})` : '');
    this.tooltip = `Name: ${libraryInfo.name}\n` +
      `Path: ${this.path}\n` +
      (libraryInfo.text.trim() !== '' ? `Text: ${libraryInfo.text}\n` : ``) +
      `Attribute: ${libraryInfo.attribute}\n` +
      `Type: ${libraryInfo.type}`;
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