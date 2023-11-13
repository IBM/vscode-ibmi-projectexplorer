# Change Log

All notable changes to the "vscode-ibmi-projectexplorer" extension will be documented in this file.
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
