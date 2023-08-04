# IBM i Project Explorer Types

Type definitions for the [IBM i Project Explorer](https://github.com/IBM/vscode-ibmi-projectexplorer) extension API.

## Export

The IBM i Project Explorer exports an API which can be used by other extensions to provide additional functionality. This API can be accessed using the `getExtension` API provided by VS Code.

```ts
import { ProjectExplorerApi } from "@IBM/vscode-ibmi-projectexplorer-types";

vscode.extensions.getExtension<ProjectExplorerApi>(`IBM.vscode-ibmi-projectexplorer`)
```

---

## Types

Type definitions for the exported API are available and can be installed from this repository by specifying the following in the extension's `package.json`:

```json
"devDependencies": {
	"@IBM/vscode-ibmi-projectexplorer-types" : "IBM/vscode-ibmi-projectexplorer-types"
}
```

---

## Usage

Use the example below for reference on how to access the project manager, project explorer, or job log APIs.

```typescript
import { Extension, extensions } from "vscode";
import { ProjectExplorerApi } from "@IBM/vscode-ibmi-projectexplorer-types/projectExplorerApi";
import { ProjectManager } from "@IBM/vscode-ibmi-projectexplorer-types/projectManager";
import ProjectExplorer from "@IBM/vscode-ibmi-projectexplorer-types/views/projectExplorer";
import JobLog from "@IBM/vscode-ibmi-projectexplorer-types/views/JobLog";

let baseExtension: Extension<ProjectExplorerApi> | undefined;

/**
 * This should be called on your extension activation.
 */
export function loadProjectExplorerApi(): ProjectExplorerApi | undefined {
  if (!baseExtension) {
    baseExtension = (extensions ? extensions.getExtension<ProjectExplorerApi>(`IBM.vscode-ibmi-projectexplorer`) : undefined);
  }

  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports : undefined);
}

/**
 * Get the access to the Project Manager APIs
 */
export function getProjectManager(): typeof ProjectManager | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.projectManager : undefined);
}

/**
 * Get the access to the Project Explorer APIs
 */
export function getProjectExplorer(): ProjectExplorer | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.projectExplorer : undefined);
}

/**
 * Get the access to the Job Log APIs
 */
export function getJobLog(): JobLog | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.jobLog : undefined);
}
```

---

## VS Code Integration

Other extensions can contribute commands to any tree item in the **Project Explorer** or **Job Log** views. You will need to first register the command as per usual, but expect a parameter for the chosen tree item from the tree view. Refer to the example below on how to register a command for retrieving the information of a library.

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand(`vscode-ibmi-projectexplorer.getLibraryInformation`,
        async (element: ProjectExplorerTreeItem) => {
            // some code
        }
    )
);
```

To then contribute a command to a specific tree item, specific when clauses in the extension's `package.json` can be specified to match the view and context value of the desired tree item. To specify a command contribution based on the view, use `view == projectExplorer` or `view == jobLog`. To then narrow down which specific tree items a command should appear in, use `viewItem =~ <contextValue>` where `<contextValue>` is a regular expression that matches the context value for the tree item.

For the set of all context values used by the **Project Explorer** or **Job Log** views, refer to the [ContextValue enum](https://github.com/IBM/vscode-ibmi-projectexplorer-types/blob/main/projectExplorerApi.d.ts). Each type of tree item has a specific context value along with suffixes (`_<suffix>`) that contain additional information for when the tree items can take on multiple states. 

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

To learn more about using the when clause, check out the documentation on [when clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts).