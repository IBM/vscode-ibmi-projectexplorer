# vscode-ibmi-projectexplorer README

Extension that implements Project Explorer and Job Log Viewer using the Code for IBM i API

### Project Explorer

* Each workspace folder
  * [ ] Source view
    * Supposedly is a diff between remote and local sources
    * Currently is a simple IFS Browser of the deploy directory
  * [ ] Variables
    * Variables get listed from `iproj.json`
    * Values come from and update `.env`
    * Perhaps create the `.env` if it doesn't exist with the default variables
  * [ ] Library list
    * Library list comes from and updates `LIBL` in local `.env`
    * Initial list comes from connection default libraries 
    * Same for current library
  * [ ] Object Libraries
    * Has the library list below it
    * Libraries can be expanded to view objects inside of it

Refresh explorer when:

* Connection changes
* `.env` changes (fs watcher?)

### Job Log Viewer

Job log viewer simple listens for changes to `.logs/joblog.json` and displays the JSON in the treeview with pretty colours.