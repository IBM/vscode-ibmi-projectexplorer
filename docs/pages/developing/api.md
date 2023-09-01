# API

## Export

The IBM i Project Explorer exports an API which can be used by other extensions to provide additional functionality. This API can be accessed using the `getExtension` API provided by VS Code.

```ts
import { IBMiProjectExplorer } from "@ibm/vscode-ibmi-projectexplorer-types/ibmiProjectExplorer";

vscode.extensions.getExtension<IBMiProjectExplorer>(`IBM.vscode-ibmi-projectexplorer`)
```

---

## Types

Type definitions for the exported API are available and can be installed from NPM: [@ibm/vscode-ibmi-projectexplorer-types
](https://www.npmjs.com/package/@ibm/vscode-ibmi-projectexplorer-types).

```bash
npm i @ibm/vscode-ibmi-projectexplorer-types -D
```

---

## Usage

### Importing APIs

Use the example below for reference on how to access the `ProjectManager`, `ProjectExplorer`, or `JobLog` APIs.

```typescript
import { Extension, extensions } from "vscode";
import { IBMiProjectExplorer } from "@ibm/vscode-ibmi-projectexplorer-types/ibmiProjectExplorer";
import { ProjectManager } from "@ibm/vscode-ibmi-projectexplorer-types/projectManager";
import ProjectExplorer from "@ibm/vscode-ibmi-projectexplorer-types/views/projectExplorer";

let baseExtension: Extension<IBMiProjectExplorer> | undefined;

export function loadIBMiProjectExplorer(): IBMiProjectExplorer | undefined {
  if (!baseExtension) {
    baseExtension = (extensions ? extensions.getExtension<IBMiProjectExplorer>(`IBM.vscode-ibmi-projectexplorer`) : undefined);
  }

  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports : undefined);
}

/**
 * Get the access to the Project Manager APIs.
 */
export function getProjectManager(): typeof ProjectManager | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.projectManager : undefined);
}

/**
 * Get the access to the Project Explorer APIs.
 */
export function getProjectExplorer(): ProjectExplorer | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.projectExplorer : undefined);
}

/**
 * Get the access to the Job Log APIs.
 */
export function getJobLog(): JobLog | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.jobLog : undefined);
}
```

---

### Adding Custom Tree Items

All tree items in the **Project Explorer** view must implement the `ProjectExplorerTreeItem` interface. This interface includes a `workspaceFolder` property to associate each tree item with a workspace folder along with a `getChildren` function to retrieve subsequent children.

Refer to the example below of a custom tree item that will render the metadata for a project.

```typescript
/**
 * Tree item for the Project Metadata heading.
 */
export class ProjectMetadata extends TreeItem implements ProjectExplorerTreeItem {
	constructor(public workspaceFolder: WorkspaceFolder) {
		super('Project Metadata', vscode.TreeItemCollapsibleState.Collapsed);
	}

	async getChildren(): Promise<ProjectExplorerTreeItem[]> {
		const items: ProjectExplorerTreeItem[] = [];

		const projectManager = getProjectManager();
		if (projectManager) {
			const iProject = projectManager.get(this.workspaceFolder);

			if (iProject) {
				const state = await iProject.getState();

				if (state) {
					for (const [key, value] of Object.entries(state)) {
						items.push(new Info(this.workspaceFolder, key, value));
					}
				}
			}
		}

		return items;
	}
}

/**
 * Tree item for metadata information.
 */
export class Info extends TreeItem implements ProjectExplorerTreeItem {
	constructor(public workspaceFolder: WorkspaceFolder, label: string, description: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
	}

	getChildren(): ProjectExplorerTreeItem[] {
		return [];
	}
}
```

Once you have your tree item class implemented, you can push tree items to the view using the `pushExtensibleChildren` API in `ProjectManager` as shown below. Your tree items will be rendered under each project tree item when a connection is made.

```typescript
const projectManager = getProjectManager();

if (projectManager) {
	projectManager.pushExtensibleChildren(async (iProject: IProject) => {
		return [new ProjectMetadata(iProject.workspaceFolder)];
	});
}
```

---

### Event listener

The IBM i Project Explorer provides an event listener for other extensions to be notified of specific events.

```typescript
const projectManager = getProjectManager();

if(projectManager) {
	projectManager.onEvent('projects', () => {
        // Some code
	});
}
```

Refer to the different events below.

| ID               | Event                                                                    |
|------------------|--------------------------------------------------------------------------|
| `projects`       | Fired when there is a change to some project (create, update, or delete) |
| `activeProject`  | Fired when there is a change to the active project                       |
| `libraryList`    | Fired when there is a change to a project's library list                 |
| `deployLocation` | Fired when there is a change to a project's deploy location              |
| `build`          | Fired when a build is finished                                           |
| `compile`        | Fired when a compile is finished                                         |

---

## VS Code Integration

Other extensions can contribute commands to any tree item in the **Project Explorer** or **Job Log** views. You will need to first register the command as per usual, but expect a parameter for the chosen tree item from the tree view. Refer to the example below on how to register a command for retrieving the information of a library.

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand(`vscode-ibmi-projectexplorer.getLibraryInformation`,
        async (element: ProjectExplorerTreeItem) => {
            // Some code
        }
    )
);
```

To then contribute a command to a specific tree item, specific when clauses in the extension's `package.json` can be specified to match the view and context value of the desired tree item. To specify a command contribution based on the view, use `view == projectExplorer` or `view == jobLog`. To then narrow down which specific tree items a command should appear in, use `viewItem =~ <contextValue>` where `<contextValue>` is a regular expression that matches the context value for the tree item.

For the set of all context values used by the **Project Explorer** or **Job Log** views, refer to the [ContextValue enum](https://github.com/IBM/vscode-ibmi-projectexplorer-types/blob/main/ibmiProjectExplorer.d.ts). Each type of tree item has a specific context value along with suffixes (`_<suffix>`) that contain additional information for when the tree items can take on multiple states. 

Refer to the example below on how to contribute the command registered above to all current library tree items in the **Project Explorer** view.

```json
"commands": [
    {
        "command": "vscode-ibmi-projectexplorer.getLibraryInformation",
        "title": "Get Library Information",
        "category": "Your Extension"
    }
],
"menus": {
    "view/item/context": [
        {
            "command": "vscode-ibmi-projectexplorer.getLibraryInformation",
            "when": "view == projectExplorer && viewItem =~ /^library.*/ && viewItem =~ /^.*_current.*/",
            "group": "inline"
        }
    ]
}
```

?> To learn more about using the when clause, check out the documentation on [when clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts).

---

## Code for IBM i API

Extending the IBM i Project Explorer may require having to use the Code for IBM i API. These set of APIs can be used to access the connection, run commands on the IBM i, retrieve members and stream files, and much more.

?> To learn more about how to install and use the Code for IBM i APIs, check out their [API documentation](https://halcyon-tech.github.io/docs/#/pages/dev/api).