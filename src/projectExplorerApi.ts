/*
 * (c) Copyright IBM Corp. 2023
 */

import { ProjectManager } from "./projectManager";
import ProjectExplorer from "./views/projectExplorer";

export interface ProjectExplorerApi {
  projectManager: typeof ProjectManager,
  projectExplorer: ProjectExplorer
}

export enum ContextValue {
  project = 'project',
  inactive = '_inactive',
  active = '_active',
  source = 'source',
  sourceFile = 'sourceFile',
  sourceDirectory = 'sourceDirectory',
  variables = 'variables',
  variable = 'variable',
  libraryList = 'libraryList',
  library = 'library',
  system = '_system',
  current = '_current',
  defaultUser = '_defaultUser',
  preUser = '_preUser',
  postUser = '_postUser',
  configurable = '_configurable',
  objectFile = `objectFile`,
  memberFile = 'memberFile',
  objectLibraries = 'objectLibraries',
  includePaths = 'includePaths',
  includePath = 'includePath',
  ifsDirectory = 'ifsDirectory',
  ifsFile = 'ifsFile',
  first = '_first',
  middle = '_middle',
  last = '_last',
  local = '_local',
  remote = '_remote',
  error = 'error',
  log = 'log',
  command = 'command',
  message = 'message'
}