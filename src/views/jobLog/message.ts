/*
 * (c) Copyright IBM Corp. 2023
 */

import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { JobLogInfo, MessageInfo, parseDateTime } from "../../jobLog";

export default class Message extends TreeItem {
  static contextValue = `message`;
  constructor(public msg: MessageInfo) {
    const msgSeverity = String(msg.severity).padStart(2, `0`);
    const msgLabel = '[' + msgSeverity + '] ' + msg.msgid + ' - ' + msg.message_text;
    super(msgLabel, TreeItemCollapsibleState.None);

    this.contextValue = Message.contextValue;
    const msgTime = parseDateTime(msg.message_time).toLocaleString();
    this.description = msg.type + ' (' + msgTime + ')';

    const fromToText = JobLogInfo.createFromToTextForMsgEntity(msg);
    let msgHover = msg.second_level !== null ? msg.second_level.replace(/&N\s/, '').replace(/\s&N\s/g, '\n\n').replace(/\s&P\s/g, '\n\t') : '';
    this.tooltip = msgHover === '' ? fromToText : `${msgHover}\n\n${fromToText}`;

    let msgIcon: ThemeIcon;
    switch (msg.severity) {
      case 0:
        msgIcon = new ThemeIcon('info', new ThemeColor('joblog.severity.0'));
        break;
      case 10:
        msgIcon = new ThemeIcon('issues', new ThemeColor('joblog.severity.10'));
        break;
      case 20:
        msgIcon = new ThemeIcon('warning', new ThemeColor('joblog.severity.20'));
        break;
      case 30:
        msgIcon = new ThemeIcon('close', new ThemeColor('joblog.severity.30'));
        break;
      case 40:
        msgIcon = new ThemeIcon('workspace-untrusted', new ThemeColor('joblog.severity.40'));
        break;
      default:
        msgIcon = new ThemeIcon('error', new ThemeColor('joblog.severity.50'));
        break;
    }
    this.iconPath = msgIcon;

  }
}