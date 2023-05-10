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
  inactive = '_inactive',
  active = '_active',
  source = 'source',
  variables = 'variables',
  objectLibraries = 'objectLibraries',
  library = 'library',
  objectFile = `objectFile`,
  memberFile = 'memberFile',
  ifsDirectory = 'ifsDirectory',
  ifsFile = 'ifsFile',
  variable = 'variable',
  includePaths = 'includePaths',
  includePath = 'includePath',
  error = 'error'
}