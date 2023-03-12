import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { JobLogInfo, MessageInfo } from "../../jobLog";

export default class Message extends TreeItem {
  static contextValue = `message`;
  constructor(public msg: MessageInfo) {
    const msgSeverity = msg.severity > 9 ? `${msg.severity}` : '0' + `${msg.severity}`;
    const msgLabel = '[' + msgSeverity + '] ' + msg.msgid + ' - ' + msg.message_text;
    super(msgLabel, TreeItemCollapsibleState.None);

    this.contextValue = Message.contextValue;
    this.description = msg.type + ' (' + msg + ')';

    const fromToText = JobLogInfo.createFromToTextForMsgEntity(msg);
    let msgHover = msg.second_level !== null ? msg.second_level.replace(/&N\s/, '').replace(/\s&N\s/g, '\n\n').replace(/\s&P\s/g, '\n\t') : '';
    this.tooltip = msgHover === '' ? fromToText : `${msgHover}\n\n${fromToText}`;

    let msgIcon: ThemeIcon;
    switch (msg.severity) {
      case 0:
        msgIcon = new ThemeIcon('info'); //TODO: ADD COLOR
        break;
      case 10:
        msgIcon = new ThemeIcon('issues'); //TODO: ADD COLOR
        break;
      case 20:
        msgIcon = new ThemeIcon('warning'); //TODO: ADD COLOR
        break;
      case 30:
        msgIcon = new ThemeIcon('close'); //TODO: ADD COLOR
        break;
      case 40:
        msgIcon = new ThemeIcon('workspace-untrusted'); //TODO: ADD COLOR
        break;
      default:
        msgIcon = new ThemeIcon('error'); //TODO: ADD COLOR
        break;
    }
    this.iconPath = msgIcon;

  }
}