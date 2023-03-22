import { WorkspaceFolder } from "vscode";
import { IProject } from "./iproject";

export class ProjectManager {
    private static loaded: { [index: number]: IProject } = {};

    public static load(workspaceFolder: WorkspaceFolder) {
        if (!this.loaded[workspaceFolder.index]) {
            this.loaded[workspaceFolder.index] = new IProject(workspaceFolder);
        }
    }

    public static get(workspaceFolder: WorkspaceFolder): IProject | undefined {
        return this.loaded[workspaceFolder.index];
    }

    public static clear() {
        this.loaded = {};
    }
}