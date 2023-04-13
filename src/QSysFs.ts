/*
 * (c) Copyright IBM Corp. 2023
 */

import { stringify, ParsedUrlQueryInput } from "querystring";
import * as vscode from "vscode";

export function getMemberUri(member: IBMiMember, options?: QsysFsOptions) {
  return getUriFromPath(`${member.asp ? `${member.asp}/` : ``}${member.library}/${member.file}/${member.name}.${member.extension}`, options);
}

export function getUriFromPath(path: string, options?: QsysFsOptions) {
  const query = stringify(options as ParsedUrlQueryInput);
  if (path.startsWith(`/`)) {
    //IFS path
    return vscode.Uri.parse(path).with({ scheme: `streamfile`, path, query });
  } else {
    //QSYS path
    return vscode.Uri.parse(path).with({ scheme: `member`, path: `/${path}`, query });
  }
}

export interface IBMiMember {
  library: string
  file: string
  name: string
  extension: string
  recordLength: number
  text: string
  asp?: string
}

export interface QsysFsOptions {
  filter?: string
  readonly?: boolean
}

export interface ObjectFilters {
  name: string
  library: string
  object: string
  types: string[]
  member: string
  memberType: string
  protected: boolean
}