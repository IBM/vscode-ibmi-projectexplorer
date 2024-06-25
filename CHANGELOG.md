# Change Log

All notable changes to the "vscode-ibmi-projectexplorer" extension will be documented in this file.

## `2.11.0`
* Add scanning for sub projects
* Create `.gitignore` file when creating a new project
* Add all inline actions to right-click menu
* Fix error handling of invalid `iproj.json` file
* Fix syncing of `LIBL` and `CURLIB`
* Fix minor job log issues, update decorations, add new tree view badge
* Update wording from failed jobs to failed objects
* Add Code4i tooltips for libraries, objects, members, and ifs files 
* Add event for `buildMap` changes
### Housekeeping
* Bump @typescript-eslint/eslint-plugin from 7.10.0 to 7.14.1
* Bump tar from 7.1.0 to 7.4.0
* Bump @typescript-eslint/parser from 7.10.0 to 7.14.1
* Bump @types/node from 20.12.12 to 20.14.8
* Bump braces from 3.0.2 to 3.0.3
* Bump webpack from 5.91.0 to 5.92.1
* Bump @halcyontech/vscode-ibmi-types from 2.10.1 to 2.11.0
* Bump actions/github-script from 5 to 7
* Bump esbuild-loader from 4.1.0 to 4.2.0
* Bump typescript from 5.4.5 to 5.5.2

## `2.10.5`
* Update ARCAD link to project mode page
* Fix debug to use the project's library list and current library

## `2.10.4`
* Add "Get Started on a New IBM i Project" walkthrough
* Add "Development with an Existing IBM i Project" walkthrough
* Add new `includePaths` event in Project Manager
* Add action to enable/disable `Clear Errors Before Build` setting in Code4i

## `2.10.3`
* Fix context value for source physicals

## `2.10.2`
* Fix incorrect category for job log commands
* Publish to Open VSX before the Marketplace

## `2.10.1`
* Fix missing string for translation

## `2.10.0`
* Now requires vscode_ibmi 2.10.1
* Update types for Code for i 2.10.1 as there has been an API change to getObjectList()
* Disable connect to previous connection in Merlin

## `2.9.1`
* Allow debugging multiple programs

## `2.9.0`
* Depend on `Code for i` 2.9.0
* Added debug as Service Entry Point (SEP) to debug menu
* Disable Download member functionality in Merlin
* Set LIBL and CURLIB in .env whenever they are updated by project so Code 4 i actions run correctly

## `2.6.8`
* Add merlin context value and suppress the upload member action in the cloud context

## `2.6.7`
* Make version optional in .ibmi.json to avoid errors on `Migrate source`
* fix source orbit enablement for Migrate Source
* Describe deployment methods more clearly 
* Fix `IBM i Job og` view actions and document thoroughly

## `2.6.6`
* Issue 377 support doublequoted libraries
* Issue 360 When running build current action, active editor path not used
* Fix browse/edit actions and uri issue for comparing members
* Fix object and member delete actions
### Housekeeping
* Bump @typescript-eslint/parser from 7.1.1 to 7.3.0
* Bump @types/node from 20.11.24 to 20.11.28
* Bump esbuild-loader from 4.0.3 to 4.1.0
* Bump typescript from 5.3.3 to 5.4.2
* Bump @typescript-eslint/eslint-plugin

## `2.6.5`
* Update `iproj.json` and `.env` after renaming/deleting library 
* Identify and filter out PRD libraries as they are side effect of command to query the library list
* Allow retesting individual unit tests 
### Housekeeping
* Bump @typescript-eslint/eslint-plugin from 7.0.0 to 7.1.1 
* Bump @types/node from 20.11.19 to 20.11.24
* Bump @vscode/l10n-dev from 0.0.33 to 0.0.34
* Bump @typescript-eslint/parser from 7.0.2 to 7.1.1
* Bump @halcyontech/vscode-ibmi-types from 2.7.0 to 2.8.0
* Bump eslint from 8.56.0 to 8.57.0
* Bump dotenv from 16.4.4 to 16.4.5

## `2.6.4`
- Create connection action in merlin should NOT be Code for IBM i dialog
- Hide Source Orbit migration options if Source Orbit not installed
- Missing iProject field when projects event is fired
- Make library type more explicit
- Fix missing deleted files in sub-directories
- Force refresh library list when changing library list description
- Rename configuration to `Disable User Library List View`
- Fix retrieval of members and objects
### Housekeeping
- Bump webpack from 5.89.0 to 5.90.3
- Bump @vscode/l10n-dev from 0.0.31 to 0.0.33
- Bump @types/tar from 6.1.10 to 6.1.11
- Bump dotenv from 16.3.2 to 16.4.4 by
- Bump @types/node from 20.11.5 to 20.11.19
- Bump @typescript-eslint/parser from 6.19.1 to 7.0.2
- Bump @typescript-eslint/eslint-plugin from 6.19.1 to 7.0.0
- Bump esbuild-loader from 4.0.2 to 4.0.3
- Bump ignore from 5.3.0 to 5.3.1

## `2.6.2`
- Add checkbox to generate bob Rules.mk files on migrate source by @edmundreinhardt in #329
- Adds checkbox to import member text on migrate source by @irfanshar in #298
- Changed IBM i panel to IBM i Project Explorer by @sebjulliand in #308
- Adds option during migrate source to have files in lowercase by @irfanshar in #322
- Fix incorrect link to library list and object library doc pages by @SanjulaGanepola in #316
- Fix file extension during file source orbit rename by @irfanshar in #325
- Fixes the iterable warning by @edmundreinhardt in #327
### Housekeeping
- Bump @halcyontech/vscode-ibmi-types from 2.6.0 to 2.6.5 by @dependabot in #314
- Bump typescript from 5.3.2 to 5.3.3 by @dependabot in #294
- Bump eslint from 8.55.0 to 8.56.0 by @dependabot in #292
- Bump actions/upload-artifact from 3 to 4 by @dependabot in #291
- Bump @typescript-eslint/parser from 6.18.0 to 6.19.1 by @dependabot in #321
- Bump dotenv from 16.3.1 to 16.3.2 by @dependabot in #320
- Bump @types/node from 20.10.7 to 20.11.5 by @dependabot in #319
- Bump @typescript-eslint/eslint-plugin from 6.13.2 to 6.19.1 by @dependabot in #318

## `2.6.0`
- Version numbers will now be in sync with the required `Code for i` extension.
  This caused extensions using this API to fail, including Merlin by @william-xiang
- When using the Compare filter on the Source node of the explorer, the temp files
  in the deployed directory will not be deleted upon refresh of the view. BOB builds
  that rely on generated `.Rules.mk.build` files will now succeed.
- When deleting deploy directories, the parent directory could mistakenly be synched
  and files not in the current project would be deleted.  This is now fixed.
- When the build and compile commands are not set, the prompt will now be prefilled
  with the BOB build and compile commands.  Once the command is set, it will also be
  run as invoked.
- If the `Set Build Command` or `Set Compile Command` are invoked from the command
  pallete, the prompt will appear.

## `1.2.6`
- The project state API threw an exception if no `iproj.json` is found in the project root.
  This caused extensions using this API to fail, including Merlin by @william-xiang
  
## `1.2.4`
- Gave explicit type to event's callback function by @sebjulliand in #201
- Add debug action to programs by @SanjulaGanepola in #86
- Fix update member text action by @SanjulaGanepola in #210
- Implement Job Log Updates by @irfanshar in #219
- Fixed explorer command calls by @sebjulliand in #225
- Fixed library actions by @sebjulliand in #228
- Fixed explorer crashing on non string values in iproj.json by @sebjulliand in #232
- Fixed launch configuration to run actual watch task by @sebjulliand in #233
- Fixed explorer crashing when refreshing project with extensible children by @sebjulliand in #234

## `1.2.2`
- Contribute the job log to the bottom panel
- Add docs about installation and Project Explorer features
- Add docs for release process
- Fix assign to variable from Project Explorer
- Fix build and compile when no `.logs` or `.evfevent`
- Fix job log error when no `iproj.json`

## `1.2.1`

- Fix missing action to resolve project metadata
- Fix file watcher exception
- Fix `libraryList` and `deployLocation` events not firing
- Fix incorrect file uri when running compile
- Create directories during source migration
- Add missing `Add to Include Paths` action in the file explorer and add actions to the Source

## `1.2.0`

- Add Connect to/Connect previous actions to project explorer
- Fix IProject state "extensions" mapping
- Add variable support for `extensions` attribute in `iproj.json`
- Add configuration to enable/disable Code4i user library list view
- Add `Set Deployment Method` and `Deploy Project` actions
- Add Environment Manager to detect if running in Merlin
- Add clean up from Source Orbit to source migration
- Add build/compile actions and improved optional action support

## `1.1.0`

- Add offline project support
- Improve error handling when no connection

## `1.0.2`

- Rename API to IBMiProjectExplorer
- Update docs with API changes

## `1.0.1`

- Update doc landing page
- Remove types submodule, update git workflow, and rename API

## `1.0.0`

- Initial release
