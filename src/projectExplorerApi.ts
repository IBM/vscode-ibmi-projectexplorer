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
  variables = 'variables',
  libraryList = 'libraryList',
  objectLibraries = 'objectLibraries',
  library = 'library',
  system = '_system',
  current = '_current',
  defaultUser = '_defaultUser',
  preUser = '_preUser',
  postUser = '_postUser',
  configurable = '_configurable',
  objectFile = `objectFile`,
  memberFile = 'memberFile',
  ifsDirectory = 'ifsDirectory',
  ifsFile = 'ifsFile',
  variable = 'variable',
  includePaths = 'includePaths',
  includePath = 'includePath',
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