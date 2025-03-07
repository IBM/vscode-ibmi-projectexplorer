# iproj.json

> [!NOTE]
>
> **Specifics of project level metadata:**
>
> - The project will be referred to by its relative path
> - This metadata is stored in a `iproj.json` file in the root directory of the project
> - Even an empty `iproj.json` file will mark a directory as a project
> - Projects cannot be nested, only the ancestor directory containing the iproj.json will be considered a project

## Configuration Options

### description

Descriptive application name.

### version

Version of this file format, used for migration purposes.

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
> - `{branch}` resolves to the name of the current git branch if this project is managed by Git.

### buildObjectCommand

PASE command line used to build a specific object in this project.

> The following substitution variables are supported:
> - `{object}` resolves to the base object name.
> - `{filename}` resolves to the base file name being edited.
> - `{path}` resolves to the full IFS path corresponding to the source in the editor.
> - `{host}` resolves to the IBM i hostname.
> - `{usrprf}` the user profile that the command will be executed under.
> - `{branch}` resolves to the name of the current git branch if this project is managed by Git.

### compileCommand

PASE command line used to compile a specific source file in this project.

> The following substitution variables are supported:
> - `{filename}` resolves to the base file name being edited.
> - `{files}` resolves to the list of files being selected or the active editor.
> - `{path}` resolves to the full IFS path corresponding to the source in the editor.
> - `{host}` resolves to the IBM i hostname.
> - `{usrprf}` the user profile that the command will be executed under.
> - `{branch}` resolves to the name of the current git branch if this project is managed by Git.

### extensions

Attributes used by external software vendors to provide additional functionality.

## Example

In the example below, we have a project with the description `Payroll application for ACME`. This project has a variable named `&accounting` whose value is used not only for the object library and current library, but also in the beginning of the user library list followed by `ACMEUTIL`. To initialize the environment, this value is also used in the initial CL command where the `SETUP` program is called. A variable named `&tax` is used in the end of the user library list. Include files are searched for in the the prototypes sub-directory. Include files are searched for in the `prototypes` sub-directory. ARCAD tooling is also storing an additional attribute for the `libraryPrefix` which their tooling uses.

```json
 {
    "version": "0.0.1",
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