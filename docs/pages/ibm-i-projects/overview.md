# Overview

## Vision

The IBM i projects will self-describe how to build themselves as much as possible.  The project could be git cloned directly into an IFS directory or onto a client that is more convenient for editing and synchronized to the IFS directory it is built from. The project metadata needs to have sufficient information to specify the environment for both editing and compiling. The ultimate goal is that a Git project can contain all the information to build a working application. I.e. a git hook can trigger the cloning, building, and deploying of a project without any additional dependencies on a target IBM i.

## Application Source
-  All source for the application will be in stream files that can be stored in the IFS and can be managed by any PASE/Open Source tools such as git, gmake, BOB etc. The IFS frees the source from restrictions on line length, file naming, directory structure, upper case only etc. which allows your application source to be intuitively structured and named.  
- The encoding of all streamfiles will be UTF-8 (CCSID 1208) which allows all national characters to be represented.  The [migration tooling](projectExplorer/migrate-source.md) provided will automatically ensure this using the[STMFCCSID(1208) parameter](https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/cl/cpytostmf.html), but it is important that your default PASE CCSID is 1208 and not 819 so that `git clone` or `Code for IBM i` deploy or any other PASE mechanism creates your new files with the right CCSID.  This is the default on the latest V7R4 and following but can be configured using the [PASE_DEFAULT_UTF8](https://www.ibm.com/docs/en/i/7.4?topic=system-default-pase-ccsid-locale-changed-utf-8) environment variable.
```
ADDENVVAR ENVVAR(PASE_DEFAULT_UTF8) VALUE(Y) LEVEL(*SYS)
```
- IBM i compilers expect to read their source in EBCDIC.  The EBCDIC CCSID used to be retrieved from the SRC-PF containing the source member.  It is now specified via the `tgtccsid` attribute in the `ibmi.json` metadata file.  More details found [here](ibmi-i-projects/ibmi-json.md).
- Different compilers have different levels of support for compiling from IFS.  Most of these are surmountable see [BOB's description](https://ibm.github.io/ibmi-bob/#/prepare-the-project/compiler-specific) of how it handles these differences and what prerequisites may apply.    

## Metadata

- Metadata will be stored in JSON because:
  - JSON is the most popular persistence mechanism because it is lightweight and easily understood by both humans and computers.
  - JSON is native to any node.js based platform and has readily available tooling in all others.
- All third parties should generate and use the common metadata. Third-parties can store additional metadata in additional JSON within the same file.
- Places to store information:
  - Project level JSON (`iproj.json`): The root directory of the project should contain an `iproj.json` (analogous to package.json) and should be used for storing the project name, description, version, repository, license, and IBM i attributes such as target object library, pre/post user libraries, current library, include directories, and build/compile commands. 
  - Directory level JSON (`.ibmi.json`): Any directory of the project can contain an `.ibmi.json` to override the target object library and target CCSID for that directories and its sub-directories.
  - Comments in the code itself