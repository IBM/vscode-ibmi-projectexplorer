# Overview

## Vision

The IBM i projects will self-describe how to build themselves as much as possible.  The project could be git cloned directly into an IFS directory or onto a client that is more convenient for editing and synchronized to the IFS directory it is built from. The project metadata needs to have sufficient information to specify the environment for both editing and compiling. The ultimate goal is that a Git project can contain all the information to build a working application. I.e. a git hook can trigger the cloning, building, and deploying of a project without any additional dependencies on a target IBM i.

## Technical Assumptions

- Metadata will be stored in JSON because:
  - JSON is the most popular persistence mechanism because it is lightweight and easily understood by both humans and computers.
  - JSON is native to any node.js based platform and has readily available tooling in all others.
- All third parties should generate and use the common metadata. Third-parties can store additional metadata in additional JSON within the same file.
- Places to store information:
  - Project level JSON (`iproj.json`): The root directory of the project should contain an `iproj.json` (analogous to package.json) and should be used for storing the project name, description, version, repository, license, and IBM i attributes such as target object library, target CCSID, pre/post user libraries, current library, initial CL commands, include directories, and build/compile commands.
  (part of the vision to make an IBM i package manager that is still in progress)
  - Directory level JSON (`.ibmi.json`): Any directory of the project can contain an `.ibmi.json` to override the target object library and target CCSID for that directories and its sub-directories.
  - Comments in the code itself