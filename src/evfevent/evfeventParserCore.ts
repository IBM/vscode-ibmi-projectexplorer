class EventsFileParserCore {
    static Copyright: string;
    static LOGGER: any;

  private _exception: null;
  private _processor: QSYSEventsFileProcessorBlockCore | undefined;
  private _lastOutputFile: null;
  private _currentOutputFile: null;
  private _sourceTable: Object;

  constructor() {
    this._exception = null;
    this._processor = undefined;
    this._lastOutputFile = null;
    this._currentOutputFile = null;

    this._sourceTable = new Object();
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
      this._processor = new QSYSEventsFileExpansionProcessorCore();
    }
    this._processor.doPreProcessing();
    lineText = reader.readNextLine();
    while (lineText !== null) {
      st = new StringTokenizer(lineText);
      while (st.hasMoreTokens()) {
        word = st.nextToken();
        if (word === IQSYSEventsFileRecordType.ERROR_INFORMATION) {
          let version = st.nextToken();
          fileId = st.nextToken();
          fileProcessed = this._sourceTable[fileId];
          if (fileProcessed === null) {
            if (fileId.equals('000')) {
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
          let annotationClass = st.nextToken();
          line = String.valueOf(Integer.valueOf(st.nextToken()));
          lineStart = st.nextToken();
          charStart = st.nextToken();
          lineEnd = st.nextToken();
          charEnd = st.nextToken();
          id = st.nextToken();
          severityText = st.nextToken();
          severity = st.nextToken();
          let totalMessageLen = Integer.parseInt(st.nextToken());
          let msgToken = st.nextToken('\n\r\f');
          let msgTokenNl = new StringNL(msgToken, ccsid, true);
          let readMsgLen = msgTokenNl.getByteLength();
          msgTokenNl = msgTokenNl.trim();
          message = msgTokenNl.convertFromVisualToLogical(true);
          let messageLenCorrect = true;
          if (msgTokenNl.getByteLength() > totalMessageLen) {
            message = msgTokenNl.substring(0, totalMessageLen).convertFromVisualToLogical(true);
          } else {
            while ((msgTokenNl.getByteLength() < totalMessageLen) && messageLenCorrect) {
              lineText = reader.readNextLine();
              if (lineText === null) {
                let log = 'EventsFileParser: ' + MessageFormat.format(Messages.EventsFileParser_Incomplete_Msg, totalMessageLen, totalMessageLen, message);
                this.LOGGER.info(log);
                messageLenCorrect = false;
                msgToken = '';
                break;
              }
              let stcont = new StringTokenizer(lineText);
              msgToken = stcont.nextToken('\n\r\f');
              msgTokenNl = new StringNL(msgToken, ccsid, true);
              stcont = new StringTokenizer(msgToken);
              let lineType = stcont.nextToken();
              if (lineType.equals(IQSYSEventsFileRecordType.TIMESTAMP) || lineType.equals(IQSYSEventsFileRecordType.PROCESSOR) || lineType.equals(IQSYSEventsFileRecordType.FILE_ID) || lineType.equals(IQSYSEventsFileRecordType.FILE_CONT) || lineType.equals(IQSYSEventsFileRecordType.FILE_END) || lineType.equals(IQSYSEventsFileRecordType.ERROR_INFORMATION) || lineType.equals(IQSYSEventsFileRecordType.PROGRAM) || lineType.equals(IQSYSEventsFileRecordType.MAP_DEFINE) || lineType.equals(IQSYSEventsFileRecordType.MAP_END) || lineType.equals(IQSYSEventsFileRecordType.MAP_START) || lineType.equals(IQSYSEventsFileRecordType.FEEDBACK_CODE)) {
                messageLenCorrect = false;
                break;
              }
              readMsgLen += msgTokenNl.getByteLength();
              message += ' ' + msgTokenNl.trim().convertFromVisualToLogical(true);
            }
          }
          let record = new QSYSEventsFileErrorInformationRecord();
          record.setAnnotClass(annotationClass);
          record.setEndErrLine(lineEnd);
          record.setFileId(fileId);
          record.setFileName(fileProcessed.getLocation());
          record.setLength(String.valueOf(totalMessageLen));
          record.setMsg(message);
          record.setMsgId(id);
          record.setSevChar(severityText);
          record.setSevNum(severity);
          record.setStartErrLine(lineStart);
          record.setStmtLine(line);
          record.setTokenEnd(charEnd);
          record.setTokenStart(charStart);
          record.setVersion(version);
          if (this._processor !== null) {
            this._processor.processErrorRecord(record);
          }
          if (markerCreator !== null) {
            markerCreator.createMarker(record, record.getFileName(), fileProcessed.isReadOnly());
          }
          if (!messageLenCorrect) {
            st = new StringTokenizer(msgToken);
            continue;
          }
        } else {
          if (word.equals(IQSYSEventsFileRecordType.FILE_ID)) {
            let location = null;
            let browseMode = false;
            let version = st.nextToken();
            fileId = st.nextToken();
            let lineNumber = st.nextToken();
            let locationLength = Integer.parseInt(st.nextToken());
            location = st.nextToken('\n\r\f').trim();
            let timestamp = location.substring(location.length() - 16, location.length() - 2);
            try {
              Long.parseLong(timestamp);
            } catch (e) {
              timestamp = '';
            }
            let tempFlag = location.charAt(location.length() - 1);
            let isSpaceBeforeTempFlag = location.charAt(location.length() - 2) === 32;
            if (tempFlag === 49 && isSpaceBeforeTempFlag) {
              browseMode = true;
            } else {
              browseMode = false;
            }
            if (location.length() > locationLength) {
              location = location.substring(0, locationLength);
              location = this.resolveRelativePath(location);
            } else {
              if (location.length() < locationLength) {
                location = location.trim();
                let log = 'EventsFileParser: ' + MessageFormat.format(Messages.EventsFileParser_Line1_Location, location);
                this.LOGGER.info(log);
                while (location.length() < locationLength) {
                  lineText = reader.readNextLine();
                  st = new StringTokenizer(lineText);
                  if (st.nextToken().equals(IQSYSEventsFileRecordType.FILE_CONT)) {
                    st.nextToken();
                    st.nextToken();
                    st.nextToken();
                    st.nextToken();
                    location += st.nextToken('\n\r\f').trim();
                    if (location.length() > locationLength) {
                      location = location.substring(0, locationLength);
                      location = this.resolveRelativePath(location);
                    }
                    log = 'EventsFileParser: ' + MessageFormat.format(Messages.EventsFileParser_Updated_Location, location);
                    this.LOGGER.info(log);
                  } else {
                    throw new Exception('Events file has incorrect format.');
                  }
                }
              }
            }
            let index = location.indexOf(62);
            if (index !== -1 && location.indexOf(60) === 0) {
              if (markerCreator !== null) {
                markerCreator.updateConnectionName(location, index);
              }
              location = location.substring(index + 1);
            }
            let fileEntry = new SourceFile(location, browseMode);
            if ((this._lastOutputFile !== null && location.equals(this._lastOutputFile.getLocation())) || this._currentOutputFile !== null && location.equals(this._currentOutputFile.getLocation())) {
              fileEntry.setReadOnly(true);
            }
            if ('999'.equals(fileId)) {
              if (this._lastOutputFile === null) {
                this._lastOutputFile = this._currentOutputFile = fileEntry;
              } else {
                this._lastOutputFile = this._currentOutputFile;
                this._currentOutputFile = fileEntry;
              }
            }
            this._sourceTable[fileId] = fileEntry;
            if (this._processor !== null) {
              let record = new QSYSEventsFileFileIDRecord();
              record.setVersion(version);
              record.setFilename(location);
              record.setFlag(String.valueOf(tempFlag));
              record.setLength(Integer.toString(locationLength));
              record.setLine(lineNumber);
              record.setSourceId(fileId);
              record.setTimestamp(timestamp);
              try {
                this._processor.processFileIDRecord(record);
              } catch (e) {
                this.LOGGER.log(Level.SEVERE, '', e);
                this._exception = e;
              }
            }
          } else {
            if (word.equals(IQSYSEventsFileRecordType.FILE_END)) {
              if (this._processor !== null) {
                let record = new QSYSEventsFileFileEndRecord();
                record.setVersion(st.nextToken());
                record.setFileId(st.nextToken());
                record.setExpansion(st.nextToken());
                try {
                  this._processor.processFileEndRecord(record);
                } catch (e) {
                  this.LOGGER.log(Level.SEVERE, e.getMessage(), e);
                  this._exception = e;
                }
              }
              break;
            } else {
              if (word.equals(IQSYSEventsFileRecordType.EXPANSION)) {
                if (this._processor !== null) {
                  let record = new QSYSEventsFileExpansionRecord();
                  record.setVersion(st.nextToken());
                  record.setInputFileID(st.nextToken());
                  record.setInputLineStart(st.nextToken());
                  record.setInputLineEnd(st.nextToken());
                  record.setOutputFileID(st.nextToken());
                  record.setOutputLineStart(st.nextToken());
                  record.setOutputLineEnd(st.nextToken());
                  this._processor.processExpansionRecord(record);
                }
                break;
              } else {
                if (word.equals(IQSYSEventsFileRecordType.TIMESTAMP)) {
                  if (this._processor !== null) {
                    let record = new QSYSEventsFileTimestampRecord();
                    record.setVersion(st.nextToken());
                    record.setTimestamp(st.nextToken());
                    this._processor.processTimestampRecord(record);
                  }
                  break;
                } else {
                  if (word.equals(IQSYSEventsFileRecordType.PROCESSOR)) {
                    if (this._processor !== null) {
                      let record = new QSYSEventsFileProcessorRecord();
                      record.setVersion(st.nextToken());
                      record.setOutputId(st.nextToken());
                      record.setLineClass(st.nextToken());
                      try {
                        this._processor.processProcessorRecord(record);
                      } catch (e) {
                        this.LOGGER.log(Level.SEVERE, '', e);
                        this._exception = e;
                      }
                    }
                    break;
                  } else {
                    if (word.equals(IQSYSEventsFileRecordType.PROGRAM) || word.equals(IQSYSEventsFileRecordType.MAP_DEFINE) || word.equals(IQSYSEventsFileRecordType.MAP_END) || word.equals(IQSYSEventsFileRecordType.MAP_START) || word.equals(IQSYSEventsFileRecordType.FEEDBACK_CODE) || word.trim().length() === 0) {
                      break;
                    } else {
                      throw new Exception('Events file has incorrect format. Unexpected line type. LT=' + lineText);
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
        this._processor.doPostProcessing();
      } catch (ex) {
        this._exception = ex;
      }
    }
  }
  resolveRelativePath(location) {
    location = Paths.get(location).normalize().toString();
    location = location.replaceAll('\\\\', '/');
    return location;
  }
  getException() {
    return this._exception;
  }
  setProcessor(processor) {
    this._processor = processor;
  }
  getAllErrors() {
    if (this._processor === null) {
      return new LinkedList();
    }
    let nestedErrors = this._processor.getAllErrors();
    let allErrors = new LinkedList();
    for (let iter1 = nestedErrors.iterator(); iter1.hasNext();) {
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
      return this._processor.getAllFileIDRecords();
    }
  }
}
EventsFileParserCore.Copyright = '(C) Copyright IBM Corp. 2002, 2009.  All Rights Reserved.';
EventsFileParserCore.LOGGER = LoggerFactory.getLogger(.getName());