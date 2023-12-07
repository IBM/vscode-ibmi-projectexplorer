# .ibmi.json

> [!NOTE]
>
> **Specifics of directory level metadata:**
>
> - The attributes specified in `iproj.json` hold true for all subdirectories by default
> - If a sub-directory wants to override the object library or target CCSID, they can use the `.ibmi.json` file in that sub-directory
> - An `.ibmi.json` file can exist in any directory within a project including the root. It specifies which `OBJLIB` and `TGTCCSID` should be used when compiling the source within the directory

## Configuration Options

### version

### build

Build options

#### objlib

Objects created by building source in this directory will be put into the `objlib` library (can contain references to named libraries).

> [!NOTE]
>
> If not specified, the value of the parent directory `.ibmi.json` are used. If none of those are specified, the `objlib` specified in the `iproj.json` is used. If no `objlib` is specified here as well then the `*CURLIB` of the job is used. If the `*CURLIB` is desired, then an explicit value of `*CURLIB` should be used.

#### tgtCcsid

Value of the `TGTCCSID` to be used when compiling source in this directory.  Any national characters in string literals
will be stored into the compiled object in this CCSID.

> [!NOTE]
>
> If not specified, `*JOB` is used as the `TGTCCSID`.

## Example

In the example below, the `objlib` is set to a variable named `L01` that can be set at build time. This allows different directories to compile into different object libraries. 
The EBCDIC CCSID that the source will be compiled in will be the CCSID of the current JOB.

```json
{
    "version":"0.0.1",
    "build": {
        "objlib":"&L01",
        "tgtCcsid":"*JOB"
    } 
}
```

## Schema

The schema for the `.ibmi.json` file can be found here: [ibmi.schema.json](https://github.com/IBM/vscode-ibmi-projectexplorer/blob/main/schema/ibmi.schema.json).
