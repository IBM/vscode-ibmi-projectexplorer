/*
 * (c) Copyright IBM Corp. 2023
 */

import { ProjectManager } from "./projectManager";
import ProjectExplorer from "./views/projectExplorer";

export interface ProjectExplorerApi {
  projectManager: ProjectManager,
  projectExplorer: ProjectExplorer
}

export enum ContextValue {
  project = 'project',
  source = 'source',
  variables = 'variables',
  libraryList = 'libraryList',
  objectLibraries = 'objectLibraries',
  library = 'library',
  objectFile = `objectFile`,
  memberFile = 'memberFile',
  ifsDirectory = 'ifsDirectory',
  ifsFile = 'ifsFile',
  variable = 'variable',
  includePaths = 'includePaths',
  includePath = 'includePath',
  local = '_local',
  remote = '_remote',
  error = 'error'
}