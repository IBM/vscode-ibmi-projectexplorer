# iproj.json

> [!NOTE]
>
> **Specifics of project level metadata:**
>
> - The project will be referred to by its relative path
> - This metadata is stored in a `iproj.json` file in the root directory of the project
> - Even an empty `iproj.json` file will mark a directory as a project
> - Projects cannot be nested, only the ancestor directory containing the `iproj.json` will be considered a project

## Configuration Options

### description

Descriptive application name.

### version

Version of this file format (used for migration purposes).

> [!NOTE]
>
> **Current Version:** `1.0.0`

### repository

URL of repository of this projects home.

### license

Licensing terms for this project.

### objlib

Target library for compiled objects (can contain references to named libraries).

> [!NOTE]
>
> If not specified defaults to `*CURLIB`.

### curlib

Library that is CURLIB in the LIBL for project's connection (can contain references to named libraries).

> [!NOTE]
>
> If `objlib` is not specified, then this will also serve as the `objlib`.

### preUsrlibl

Libraries to add at the beginning of the user portion of the LIBL (can contain references to named libraries).

### postUsrlibl

Libraries to add at the end of the user portion of the LIBL (can contain references to named libraries).

### setIBMiEnvCmd

List of CL commands to be executed whenever this project connects to the IBM i (typically this involves LIBL, ENVVAR and iASP setup).
While these commands will configure the build and compile environment, due to limitations in the way that `Code for IBM i` is architected they will
not impact the LIBL shown in the Project Explorer UI.
 
### includePath

Directories to be searched for includes/copy file (can contain references to named directories).

### buildCommand

PASE command line used to build this entire project.

> The following substitution variables are supported:
> - `{filename}` resolves to the base file name being edited.
> - `{path}` resolves to the full IFS path corresponding to the source in the editor.
> - `{host}` resolves to the IBM i hostname.
> - `{usrprf}` the user profile that the command will be executed under.
> - `{branch}` resolves to the name of the current git branch if this project is managed by git.

### compileCommand

PASE command line used to compile a specific source file in this project. The same substitution parameters used in the `buildCommand` are supported.

### extensions

Attributes used by external software vendors to provide additional functionality.

### uses

> [!ATTENTION]
> Not yet in use.

Prerequisite projects in the format `project-name$tag:tag-value` (ie. `acme/core$tag:1.53`). Large companies may have multiple versions of the project at different levels (core, regional, country district). These versions can be at distinct levels (tags in git). Note that 2 projects might use each other and infinite loops need to be avoided. 

> The following actions will take place when a prerequisite project is specified:
> * Include paths will be appended to
> * Library list will be adjusted

## Example

In the example below, we have a project with the description `Payroll application for ACME`. This project has a variable named `&accounting` whose value is used not only for the object library and current library, but also in the beginning of the user library list followed by `ACMEUTIL`. To initialize the environment, this value is also used in the initial CL command where the `SETUP` program is called. A variable named `&tax` is used in the end of the user library list. Include files are searched for in the the prototypes sub-directory. Include files are searched for in the `prototypes` sub-directory. ARCAD tooling is also storing an additional attribute for the `libraryPrefix` which their tooling uses.

```json
 {
    "version": "1.0.0",
    "description": "Payroll application for ACME",
    "objlib": "&accounting",
    "curlib": "&accounting",
    "includePath": ["prototypes"],
    "preUsrlibl": "&accounting, ACMEUTIL",
    "postUsrlibl": "&tax",
    "setIBMiEnvCmd": ["CALL &accounting/SETUP"],
    "repository" : "https://github.com/acme/backoffice",
    "extensions": {
        "arcad": {
            "libraryPrefix": "ARC"
        }
    }
}
```

## Schema

The schema for the `iproj.json` file can be found here: [iproj.schema.json](https://github.com/IBM/vscode-ibmi-projectexplorer/blob/main/schema/iproj.schema.json).