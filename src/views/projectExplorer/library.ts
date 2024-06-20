/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, l10n, window } from "vscode";
import { ProjectExplorerTreeItem } from "./projectExplorerTreeItem";
import { getInstance } from "../../extensions/ibmi";
import ObjectFile from "./objectFile";
import { ContextValue } from "../../ibmiProjectExplorer";
import { IBMiObject } from "@halcyontech/vscode-ibmi-types";
import { Position } from '../../iproject';

/**
 * Represents the type of library.
 */
export enum LibraryType {
  library,
  objectLibrary,
  systemLibrary,
  currentLibrary,
  preUserLibrary,
  postUserLibrary,
  defaultUserLibrary
}

/**
 * Tree item for a library.
 */
export default class Library extends TreeItem implements ProjectExplorerTreeItem {
  static contextValue = ContextValue.library;
  libraryInfo: IBMiObject;
  libraryType: LibraryType;
  libraryTypes?: LibraryType[];
  variable?: string;
  path: string;

  constructor(public workspaceFolder: WorkspaceFolder, libraryInfo: IBMiObject, libraryType: LibraryType, position?: Position, variable?: string, libraryTypes?: LibraryType[]) {
    super(libraryInfo.name, TreeItemCollapsibleState.Collapsed);

    this.libraryInfo = libraryInfo;
    this.libraryType = libraryType;
    this.variable = variable;
    this.libraryTypes = libraryTypes;
    const type = libraryInfo.type.startsWith(`*`) ? libraryInfo.type.substring(1) : libraryInfo.type;
    this.path = `/${libraryInfo.library}.LIB/${libraryInfo.name}.${type}`;
    this.iconPath = new ThemeIcon(`library`);
    this.description = (variable ? `${variable} - ` : ``) +
      (libraryInfo.text.trim() !== '' ? `${libraryInfo.text} ` : ``) +
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
      case LibraryType.preUserLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        this.contextValue = Library.contextValue + ContextValue.preUser;
        break;
      case LibraryType.postUserLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        this.contextValue = Library.contextValue + ContextValue.postUser;
        break;
      case LibraryType.defaultUserLibrary:
        iconColor = new ThemeColor('projectExplorer.userLibrary');
        this.contextValue = Library.contextValue + ContextValue.defaultUser;
        break;
      default:
        iconColor = undefined;
        this.contextValue = Library.contextValue;
    }
    this.iconPath = new ThemeIcon(`library`, iconColor);
    this.contextValue +=
      (position === 'first' ? ContextValue.first : '') +
      (position === 'last' ? ContextValue.last : '') +
      (position === 'middle' ? ContextValue.middle : '') +
      ((![LibraryType.systemLibrary, LibraryType.defaultUserLibrary].includes(libraryType) && !variable) ? ContextValue.configurable : '');
  }

  async getChildren(): Promise<ProjectExplorerTreeItem[]> {
    let items: ProjectExplorerTreeItem[] = [];

    const ibmi = getInstance();
    if (ibmi && ibmi.getConnection()) {
      const objectFiles = await ibmi?.getContent().getObjectList({ library: this.libraryInfo.name, }, 'name');
      if (objectFiles) {
        for (const objectFile of objectFiles) {
          if (objectFile.type === "*LIB") {
            items.push(new Library(this.workspaceFolder, objectFile, LibraryType.library));
          } else {
            items.push(new ObjectFile(this.workspaceFolder, objectFile, this.path));
          }
        }
      }
    } else {
      window.showErrorMessage(l10n.t('Please connect to an IBM i'));
    }

    return items;
  }
}