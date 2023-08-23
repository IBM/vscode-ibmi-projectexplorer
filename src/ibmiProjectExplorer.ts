/*
 * (c) Copyright IBM Corp. 2023
 */

import { ProjectManager } from "./projectManager";
import JobLog from "./views/jobLog";
import ProjectExplorer from "./views/projectExplorer";

/**
 * The IBM i Project Explorer API to be used by other extensions.
 */
export interface IBMiProjectExplorer {
  /**
   * The set of APIs associated with managing the projects.
   */
  projectManager: typeof ProjectManager,

  /**
   * The set of APIs associated with managing the Project Explorer view.
   */
  projectExplorer: ProjectExplorer,

  /**
   * The set of APIs associated with managing the Job Log view.
   */
  jobLog: JobLog
}

/**
 * An enum that represents context values used by each tree item in the
 * Project Explorer view and Job Log view.
 * 
 * A tree item's context value is composed of base context value along with
 * suffixes (`_<suffix>`) that contain additional information for when the 
 * tree item can take on multiple states.
 */
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
  createIProj = '_createIProj',
  resolveIProj = '_resolveIProj',
  createEnv = '_createEnv',
  addFolderToWorkspace = '_addFolderToWorkspace',
  openConnectionBrowser = '_openConnectionBrowser',
  setDeployLocation = '_setDeployLocation',
  log = 'log',
  command = 'command',
  message = 'message'
}