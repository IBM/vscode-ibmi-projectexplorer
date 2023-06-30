import Source from "../views/projectExplorer/source";

class EventsFileParserCore {
    static Copyright: string;
    static LOGGER: any;

  private _exception: Error | null;
  private _processor: IQSYSEventsFileProcessor | undefined;
  private _lastOutputFile: SourceFile | null;
  private _currentOutputFile: SourceFile | null;
  private _sourceTable: Map<String, SourceFile>;

  constructor() {
    this._exception = null;
    this._processor = undefined;
    this._lastOutputFile = null;
    this._currentOutputFile = null;

    this._sourceTable = new Map<String, SourceFile>();
  }
  getUntilTheEndOfTheLine(startIndex: number, st: string[]): string{
    let message = st[startIndex++];
          while (startIndex < st.length) {
              message.concat(' ');
              let curr_msg = st[startIndex++];
              message.concat(curr_msg);
          }
      return message;
  }

  getRemainderAfterToken(str: string, tokenIndex: number): string {
    const tokens = str.split(' ');
    const remainderTokens = tokens.slice(tokenIndex + 1);
    const remainder = remainderTokens.join(' ');
    return remainder;
  }

  log(content: string) {
    if (process.env.DEBUG) {
      console.log(content);
    }
  }

  logError(content: Error){
    console.log(content);
  }

  parse(reader: ISequentialFileReader, ccsid: number, markerCreator: IMarkerCreator) {
    let lineText = null;
    let st = null;
    let word = null;
    let id = null;
    let message = null;
    let severity = null;
    let severityText = null;
    let line = null;
    let charStart = null;
    let lineStart = null;
    let charEnd = null;
    let lineEnd = null;
    let fileProcessed = null;
    let fileId = null;
    if (this._processor === null) {
      this._processor = new IQSYSEventsFileProcessor(); // Why we need to initialize this?
    }
    this._processor?.doPreProcessing();
    lineText = reader.readNextLine();
    while (lineText !== null) {
      let st = lineText.split(" ");
      let i = 0
      while (i < st.length) {
        word = st[i++];
        if (word === IQSYSEventsFileRecordType.ERROR_INFORMATION) {
          let version = st[i++];
          fileId = st[i++];
          fileProcessed = this._sourceTable[fileId];
          if (fileProcessed === null) {
            if (fileId === ('000')) {
              let location001 = this._sourceTable['001'];
              if (location001 !== null) {
                fileProcessed = location001;
              } else {
                fileProcessed = new SourceFile('', false);
              }
            } else {
              fileProcessed = new SourceFile('', false);
            }
          }
          let annotationClass = st[i++];
          line = st[i++];
          lineStart = st[i++];
          charStart = st[i++];
          lineEnd = st[i++];
          charEnd = st[i++];
          id = st[i++];
          severityText = st[i++];
          severity = st[i++];
          let totalMessageLen = st[i++];
          // TODO: Handle continued message lines.
          let message = this.getUntilTheEndOfTheLine(i, st);
          
          // let msgToken = st.nextToken('\n\r\f');
          // let msgTokenNl = new StringNL(msgToken, ccsid, true);

          // msgTokenNl = msgTokenNl.trim();
          // message = msgTokenNl.convertFromVisualToLogical(true);
          // let messageLenCorrect = true;
          // if (msgTokenNl.getByteLength() > totalMessageLen) {
          //   message = msgTokenNl.substring(0, totalMessageLen).convertFromVisualToLogical(true);
          // } else {
          //   while ((msgTokenNl.getByteLength() < totalMessageLen) && messageLenCorrect) {
          //     lineText = reader.readNextLine();
          //     if (lineText === null) {
          //       let log = 'EventsFileParser: ' + MessageFormat.format(Messages.EventsFileParser_Incomplete_Msg, totalMessageLen, totalMessageLen, message);
          //       this.LOGGER.info(log);
          //       messageLenCorrect = false;
          //       msgToken = '';
          //       break;
          //     }
          //     let stcont = new StringTokenizer(lineText);
          //     msgToken = stcont.nextToken('\n\r\f');
          //     msgTokenNl = new StringNL(msgToken, ccsid, true);
          //     stcont = new StringTokenizer(msgToken);
          //     let lineType = stcont.get(i++);
          //     if (lineType === (IQSYSEventsFileRecordType.TIMESTAMP) || lineType === (IQSYSEventsFileRecordType.PROCESSOR) || lineType === (IQSYSEventsFileRecordType.FILE_ID) || lineType === (IQSYSEventsFileRecordType.FILE_CONT) || lineType === (IQSYSEventsFileRecordType.FILE_END) || lineType === (IQSYSEventsFileRecordType.ERROR_INFORMATION) || lineType === (IQSYSEventsFileRecordType.PROGRAM) || lineType === (IQSYSEventsFileRecordType.MAP_DEFINE) || lineType === (IQSYSEventsFileRecordType.MAP_END) || lineType === (IQSYSEventsFileRecordType.MAP_START) || lineType === (IQSYSEventsFileRecordType.FEEDBACK_CODE)) {
          //       messageLenCorrect = false;
          //       break;
          //     }
          //     readMsgLen += msgTokenNl.getByteLength();
          //     message += ' ' + msgTokenNl.trim().convertFromVisualToLogical(true);
          //   }
          // }
          let record = new QSYSEventsFileErrorInformationRecord(version, fileId, annotationClass, line, lineStart, charStart, 
            lineEnd, charEnd, id, severityText, severity, totalMessageLen, message);
          record.setFileName(fileProcessed.getLocation());
          if (this._processor !== null) {
            this._processor?.processErrorRecord(record);
          }
          if (markerCreator !== null) {
            markerCreator.createMarker(record, record.getFileName(), fileProcessed.isReadOnly());
          }
          // if (!messageLenCorrect) {
          //   st = new StringTokenizer(msgToken);
          //   st = msgToken.split(" ")
          //   continue;
          // }
        } else {
          if (word === (IQSYSEventsFileRecordType.FILE_ID)) {
            let browseMode = false;
            let version = st[i++];
            fileId = st[i++];
            let lineNumber = st[i++];
            let locationLength = parseInt(st[i++]);
            // location = st.nextToken('\n\r\f').trim();
            let location = this.getUntilTheEndOfTheLine(i, st);
            let timestamp = location.substring(location.length - 16, location.length - 2);
            try {
              parseInt(timestamp);
            } catch (e) {
              timestamp = '';
            }
            let tempFlag = location.charAt(location.length - 1);
            let isSpaceBeforeTempFlag = location.charAt(location.length - 2) === ' ';
            if (tempFlag === '1' && isSpaceBeforeTempFlag) {
              browseMode = true;
            } else {
              browseMode = false;
            }
            if (location.length > locationLength) {
              location = location.substring(0, locationLength);
              location = this.resolveRelativePath(location);
            } else {
              if (location.length < locationLength) {
                location = location.trim();
                let log = 'EventsFileParser: location from line 1 = ' + location;
                this.log(log);
                while (location.length < locationLength) {
                  lineText = reader.readNextLine();
                  st = lineText.split(' ');
                  if (st[i++] === (IQSYSEventsFileRecordType.FILE_CONT)) {
                    st[i++];
                    st[i++];
                    st[i++];
                    st[i++];
                    location += (this.getUntilTheEndOfTheLine(i, st));
                    if (location.length > locationLength) {
                      location = location.substring(0, locationLength);
                      location = this.resolveRelativePath(location);
                    }
                    log = 'EventsFileParser: location from line 1 = ' + location;
                    this.log(log);
                  } else {
                    throw new Error('Events file has incorrect format.');
                  }
                }
              }
            }
            let index = location.indexOf('>');
            if (index !== -1 && location.indexOf('<') === 0) {
              if (markerCreator !== null) {
                markerCreator.updateConnectionName(location, index);
              }
              location = location.substring(index + 1);
            }
            let fileEntry = new SourceFile(location, browseMode);
            if ((this._lastOutputFile !== null && location === (this._lastOutputFile.getLocation())) || this._currentOutputFile !== null && location === (this._currentOutputFile.getLocation())) {
              fileEntry.setReadOnly(true);
            }
            if ('999'===fileId) {
              if (this._lastOutputFile === null) {
                this._lastOutputFile = this._currentOutputFile = fileEntry;
              } else {
                this._lastOutputFile = this._currentOutputFile;
                this._currentOutputFile = fileEntry;
              }
            }
            this._sourceTable[fileId] = fileEntry;
            if (this._processor !== null) {
              let record = new QSYSEventsFileFileIDRecord(version, fileId, lineNumber, locationLength.toString(), location, timestamp.toString(), tempFlag);
              try {
                this._processor?.processFileIDRecord(record);
              } catch (e: Error) {
                this.logError(e);
                this._exception = e;
              }
            }
          } else {
            if (word === (IQSYSEventsFileRecordType.FILE_END)) {
              if (this._processor !== null) {
                let version = st[i++];
                let fileId = st[i++];
                let expansion = st[i++];
                let record = new QSYSEventsFileFileEndRecord(version, fileId, expansion);
                try {
                  this._processor?.processFileEndRecord(record);
                } catch (e: Error) {
                  this.logError(e);
                  this._exception = e; 
                }
              }
              break;
            } else {
              if (word === (IQSYSEventsFileRecordType.EXPANSION)) {
                if (this._processor !== null) {
                  let record = new QSYSEventsFileExpansionRecord(st[i++], st[i++], st[i++], st[i++], st[i++], st[i++], st[i++]);
                  // record.setVersion(st[i++]); // use split
                  // record.setInputFileID(st[i++]);
                  // record.setInputLineStart(st[i++]);
                  // record.setInputLineEnd(st[i++]);
                  // record.setOutputFileID(st[i++]);
                  // record.setOutputLineStart(st[i++]);
                  // record.setOutputLineEnd(st[i++]);
                  this._processor?.processExpansionRecord(record);
                }
                break;
              } else {
                if (word === (IQSYSEventsFileRecordType.TIMESTAMP)) {
                  if (this._processor !== null) {
                    let record = new QSYSEventsFileTimestampRecord(st[i++], st[i++]);
                    // record.setVersion(st[i++]);
                    // record.setTimestamp(st[i++]);
                    this._processor?.processTimestampRecord(record);
                  }
                  break;
                } else {
                  if (word === (IQSYSEventsFileRecordType.PROCESSOR)) {
                    if (this._processor !== null) {
                      let record = new QSYSEventsFileProcessorRecord(st[i++], st[i++], st[i++]);
                      // record.setVersion(st[i++]);
                      // record.setOutputId(st[i++]);
                      // record.setLineClass(st[i++]);
                      try {
                        this._processor?.processProcessorRecord(record);
                      } catch (e: Error) {
                        this.logError(e);
                        this._exception = e;
                      }
                    }
                    break;
                  } else {
                    if (word === (IQSYSEventsFileRecordType.PROGRAM) || word === (IQSYSEventsFileRecordType.MAP_DEFINE) || word === (IQSYSEventsFileRecordType.MAP_END) || word === (IQSYSEventsFileRecordType.MAP_START) || word === (IQSYSEventsFileRecordType.FEEDBACK_CODE) || word.trim().length() === 0) {
                      break;
                    } else {
                      throw new Error('Events file has incorrect format. Unexpected line type. LT=' + lineText);
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (lineText !== null) {
        lineText = reader.readNextLine();
      }
    }
    if (this._processor !== null) {
      try {
        this._processor?.doPostProcessing();
      } catch (ex: Error) {
        this._exception = ex;
      }
    }
  }
  resolveRelativePath(location: string) {
    location = Paths.get(location).normalize().toString();
    location = location.replaceAll('\\\\', '/');
    return location;
  }
  getException() {
    return this._exception;
  }
  setProcessor(processor: IQSYSEventsFileProcessor) {
    this._processor = processor;
  }
  getAllErrors() {
    if (this._processor === null) {
      return new Array();
    }
    let nestedErrors = this._processor?.getAllErrors();
    let allErrors = new Array();
    for (let iter1 = nestedErrors?.iterator(); iter1.hasNext();) {
      let curErrorList = iter1.next();
      for (let iter2 = curErrorList.iterator(); iter2.hasNext();) {
        allErrors.add((iter2.next()));
      }
    }
    return allErrors;
  }
  getAllFileIDRecords() {
    if (this._processor === null) {
      return Collections.emptySet();
    } else {
      return this._processor?.getAllFileIDRecords();
    }
  }
}
EventsFileParserCore.Copyright = '(C) Copyright IBM Corp. 2002, 2009.  All Rights Reserved.';
EventsFileParserCore.LOGGER = LoggerFactory.getLogger(.getName());