/*
 * (c) Copyright IBM Corp. 2023
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
     * Target library for compiled objects (if not specified defaults to *CURLIB).
     */
    objlib?: string;

    /**
     * Library that is CURLIB in the LIBL for project's connection. Note that if
     * objlib is not specified, then this will also serve as the objlib.
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
     * Directories to be searched for includes/copy file (can contain variable
     * references).
     */
    includePath?: string[];

    /**
     * List of CL commands to be executed whenever this project connects to the
     * IBM i. Typically this involves LIBL, ENVVAR and iASP setup.
     */
    setIBMiEnvCmd?: string[];

    /**
     * PASE command line used to build this entire project. The following substitution
     * variables are supported:\n {path} resolves to the full IFS path corresponding
     * to the source in the editor.\n {host} resolves to the IBM i hostname.\n {usrprf}
     * the user profile that the command will be executed under.\n {branch} resolves to
     * the name of the current git branch if this project is managed by git.
     */
    buildCommand?: string;

    /**
     * PASE command line used to compile a specific source file in this project. The
     * following substitution variables are supported:\n {files} resolves to the list of
     * files being selected or the active editor.\n {path} resolves to the full IFS path
     * corresponding to the source in the editor.\n {host} resolves to the IBM i hostname.
     * \n {usrprf} the user profile that the command will be executed under.\n {branch}
     * resolves to the name of the current git branch if this project is managed by git.
     */
    compileCommand?: string;

    /**
     * Setting the current IASP allows this project access to a set of libraries and
     * directories. IASP is a collection of disk units that can be brought on-line or
     * taken off-line independently from the remaining storage on a system, including
     * the system ASP, basic user ASPs, and other independent ASPs.
     */
    iasp?: string;

    /**
     * The properties specified when connecting to DB2 for IBM i using JDBC.
     */
    sql?: SQLProperties;

    /**
     * Attributes used by external software vendors to provide additional functionality.
     */
    extensions?: Map<string, object>;
}

export interface SQLProperties {
    /**
     * The system uses this SQL schema to resolve unqualified names in SQL statements.
     */
    defaultSchema?: string;

    /**
     * Specifies the naming convention used when referring to tables.
     */
    naming?: string;

    /**
     * The system uses this path to resolve the schema name for unqualified types,
     * functions, variables, and procedures.
     */
    currentPath?: string[];
}