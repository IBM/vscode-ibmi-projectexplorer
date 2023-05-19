/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItemCollapsibleState, WorkspaceFolder, l10n } from "vscode";
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
    this.iconPath = new ThemeIcon(`library`);
    this.description = (libraryInfo.text.trim() !== '' ? `${libraryInfo.text} ` : ``) +
      (libraryInfo.attribute?.trim() !== '' ? `(${libraryInfo.attribute})` : ``);
    this.tooltip = l10n.t('Name: {0}\n', libraryInfo.name) +
      l10n.t('Path: {0}\n', this.path) +
      (libraryInfo.text.trim() !== '' ? l10n.t('Text: {0}\n', libraryInfo.text) : ``) +
      (libraryInfo.attribute ? l10n.t('Attribute: {0}\n', libraryInfo.attribute) : ``) +
      l10n.t('Type: {0}', libraryInfo.type);
    let iconColor: ThemeColor | undefined;
    switch (this.libraryType) {
      case LibraryType.systemLibrary:
        iconColor = new ThemeColor('projectExplorer.systemLibrary');
        this.contextValue = Library.contextValue + ContextValue.system;
        break;
      case LibraryType.currentLibrary:
        iconColor = new ThemeColor('projectExplorer.currentLibrary');
        this.contextValue = Library.contextValue + ContextValue.current;
        break;
      case LibraryType.userLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        this.contextValue = Library.contextValue + ContextValue.user;
        break;
      default:
        iconColor = undefined;
        this.contextValue = Library.contextValue;
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