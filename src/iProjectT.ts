/*
 * (c) Copyright IBM Corp. 2023
 */

/**
 * Represents the state of an IBM i Project which is a project consisting of
 * an `iproj.json`.
 */
export interface IProjectT {

    /**
     * Descriptive application name.
     */
    description?: string;

    /**
     * Version of this file format, used for migration purposes.
     */
    version?: string;

    /**
     * URL of repository of this projects home.
     */
    repository?: string;

    /**
     * Licensing terms for this project.
     */
    license?: string;

    /**
     * Target library for compiled objects (can contain references to named
     * libraries). If not specified defaults to *CURLIB.
     */
    objlib?: string;

    /**
     * Library that is CURLIB in the LIBL for project's connection (can contain 
     * references to named libraries). If the objlib is not specified, then this 
     * will also serve as the objlib.
     */
    curlib?: string;

    /**
     * Libraries to add at the beginning of the user portion of the LIBL (can
     * contain references to named libraries).
     */
    preUsrlibl?: string[];

    /**
     * Libraries to add at the end of the user portion of the LIBL (can contain
     * references to named libraries).
     */
    postUsrlibl?: string[];

    /**
     * Directories to be searched for includes/copy file (can contain references
     * to named directories).
     */
    includePath?: string[];

    /**
     * List of CL commands to be executed whenever this project connects to the
     * IBM i (typically this involves LIBL, ENVVAR and iASP setup).
     */
    setIBMiEnvCmd?: string[];

    /**
     * PASE command line used to build this entire project. The following substitution
     * variables are supported:\n {filename} resolves to the base file name being edited.\n
     * {path} resolves to the full IFS path corresponding to the source in the editor.\n
     * {host} resolves to the IBM i hostname.\n {usrprf} the user profile that the command
     * will be executed under.\n {branch} resolves to the name of the current git branch if
     * this project is managed by git.
     */
    buildCommand?: string;

    /**
     * PASE command line used to compile a specific source file in this project. The
     * following substitution variables are supported:\n {filename} resolves to the base
     * file name being edited.\n {files} resolves to the list of files being selected or
     * the active editor.\n {path} resolves to the full IFS path corresponding to the
     * source in the editor.\n {host} resolves to the IBM i hostname.\n {usrprf} the user
     * profile that the command will be executed under.\n {branch} resolves to the name of
     * the current git branch if this project is managed by git.
     */
    compileCommand?: string;

    /**
     * List of mappings from branch name to library name.
     */
    branches?: Map<string, string>;

    /**
     * Attributes used by external software vendors to provide additional functionality.
     */
    extensions?: Map<string, object>;
}