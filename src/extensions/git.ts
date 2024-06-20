/*
 * (c) Copyright IBM Corp. 2024
 */

import { extensions } from "vscode";
import { API, GitExtension } from "../import/git";

let gitLookedUp: boolean;
let gitAPI: API | undefined;

export function getGitApi(): API | undefined {
  if (!gitLookedUp) {
    try {
      gitAPI = extensions.getExtension<GitExtension>(`vscode.git`)?.exports.getAPI(1);

    } catch (error) {
      console.log(`Failed to load Git API`, error);
    } finally {
      gitLookedUp = true;
    }
  }

  return gitAPI;
}