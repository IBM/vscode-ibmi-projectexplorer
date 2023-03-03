import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, workspace } from "vscode";
import { getInstance } from "../../ibmi";
import ErrorItem from "../../test/errorItem";
import IFSFolder from "./ifsFolder";
import Project from "./project";
import Streamfile from "./streamfile";

export default class ProjectExplorer implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<any[]> {
    const ibmi = getInstance();

    if (element) {
      let items: TreeItem[] = [];

      switch (element.contextValue) {
        case Project.contextValue:
          const deploymentDirs = ibmi?.getStorage().getDeployment()!;

          const localDir = element.resourceUri?.path!;
          const remoteDir = deploymentDirs[localDir];

          if (remoteDir) {
            items.push(new IFSFolder(remoteDir, `Source`));
          } else {
            items.push(new ErrorItem(`Source`, {
              description: `Please configure remote directory.`,
              command: {
                command: `code-for-ibmi.setDeployLocation`,
                title: `Set deploy location`,
                arguments: [{}, element.resourceUri]
              }
            }));
          }
          
          items.push(new ErrorItem(`Variables`, {
            description: `Please configure environment file.`
          }));
          break;
        
        case IFSFolder.contextValue:
          const objects = await ibmi?.getContent().getFileList(element.resourceUri?.path!);
          const objectItems = objects?.map((object) => (object.type === `directory` ? new IFSFolder(object.path) : new Streamfile(object.path))) || [];

          items.push(...objectItems);
          break;
      }

      return items;
      
    } else {

      if (ibmi && ibmi.getConnection()) {
        const workspaceFolders = workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
          return workspaceFolders.map(folder => {
            return new Project(folder);
          });
        } else {
          return [new ErrorItem(`Please open a local workspace folder.`)];
        }
      } else {
        return [new ErrorItem(`Please connect to an IBM i.`)];
      }
    }
  }

  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }

  resolveTreeItem?(item: TreeItem, element: any, token: CancellationToken): Promise<TreeItem> {
    throw new Error("Method not implemented.");
  }
}