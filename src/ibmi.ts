/*
 * (c) Copyright IBM Corp. 2023
 */

import { CodeForIBMi } from "@halcyontech/vscode-ibmi-types";
import { CustomUI } from "@halcyontech/vscode-ibmi-types/api/CustomUI";
import Instance from "@halcyontech/vscode-ibmi-types/api/Instance";
import { Tools } from "@halcyontech/vscode-ibmi-types/api/Tools";
import { DeployTools } from "@halcyontech/vscode-ibmi-types/api/local/deployTools";
import { Extension, extensions } from "vscode";

let baseExtension: Extension<CodeForIBMi> | undefined;

export function loadBase(): CodeForIBMi | undefined {
  if (!baseExtension) {
    baseExtension = (extensions ? extensions.getExtension(`halcyontechltd.code-for-ibmi`) : undefined);
  }

  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports : undefined);
}

export function getInstance(): Instance | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.instance : undefined);
}

export function getDeployTools(): typeof DeployTools | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.deployTools : undefined);
}

export function getCustomUI(): CustomUI | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.customUI() : undefined);
}

export function getTools(): typeof Tools | undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.tools : undefined);
}
