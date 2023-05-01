/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, l10n } from "vscode";
import * as path from "path";
import { getMemberUri } from "../../QSysFs";
import { IBMiMember } from "@halcyontech/vscode-ibmi-types";

export default class File extends TreeItem {
  //
  static contextValue = `file`;
  memberUri: Uri | null;
  constructor(fullpath: string, attribute: string | undefined, type: string | undefined, library: string, file: string,
    isPhyicalFile: boolean, tooltip: string, member: IBMiMember | null) {
    let fileExtension = '';
    if (type === "*PGM") {
      fileExtension = "PGM";
    } else if (attribute) {
      // Remove space characters
      attribute = attribute.replace(/\s/g, '');
      if (attribute.length > 0) {
        fileExtension += `${attribute}`;
      }
    }
    const basename = path.posix.basename(fullpath)
    const label = `${basename}`;

    super(label, TreeItemCollapsibleState.None);
    this.memberUri = null;
    this.resourceUri = Uri.from({
      scheme: `file`,
      path: fullpath
    });
    if (member) {
      this.memberUri = getMemberUri(member, { filter: member.name });
    }

    this.contextValue = File.contextValue;
    this.iconPath = new ThemeIcon(`file`);
    this.description = fileExtension ? `(${fileExtension})` : "";
    this.tooltip = tooltip;

    // We only want to add a command if it's a physical file
    if (isPhyicalFile) {
      this.command = {
        command: `showMemberContent`,
        title: l10n.t(`Show member contents`),
        arguments: [library, file, basename, this.memberUri]
      };
    }
  }
}