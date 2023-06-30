class QSYSEventsFileProcessorBlockCore {
    protected INPUT_FILE_ID: string;
    private _errors: Array<QSYSEventsFileErrorInformationRecord>;
    private _inputFile: QSYSEventsFileFileIDRecord;
    private _outputFile: QSYSEventsFileFileIDRecord;
    private _currentProcessor: QSYSEventsFileProcessorRecord;
    private _mappingTable: QSYSEventsFileMapTable;
    private _previousProcessorBlock: QSYSEventsFileProcessorBlockCore;
    private _containsExpansionEvents: boolean;
    private _isFirstInEventsFile: boolean;
    private _mappingSupported: boolean;
    private _totalNumberOfLinesInOutputFile: number;
    private _totalNumberOfLinesInInputFiles: number;
    _connection: string | null;
    private _profile: string | null;
    private _type: string | null;
    private _project: string | null;
    
    constructor(record : QSYSEventsFileProcessorRecord) {
      this.INPUT_FILE_ID = '001';
      // this._errors = null;
      this._inputFile = new QSYSEventsFileFileIDRecord('','','','','','','');
      this._outputFile = new QSYSEventsFileFileIDRecord('','','','','','','');;
      this._currentProcessor = new QSYSEventsFileProcessorRecord('', '', '');
      this._mappingTable = new QSYSEventsFileMapTable();
      this._previousProcessorBlock = new QSYSEventsFileProcessorBlockCore(record);
      this._containsExpansionEvents = false;
      this._isFirstInEventsFile = false;
      this._mappingSupported = false;
      this._totalNumberOfLinesInOutputFile = 0;
      this._totalNumberOfLinesInInputFiles = 0;
      this._connection = null;
      this._profile = null;
      this._type = null;
      this._project = null;
  
      this._currentProcessor = record;
      this._mappingTable = new QSYSEventsFileMapTable();
      this._errors = new Array<QSYSEventsFileErrorInformationRecord>();
    }
    getInputFile(): QSYSEventsFileFileIDRecord {
      return this._inputFile;
    }
    getInitialInputFile(): QSYSEventsFileFileIDRecord {
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile()) {
        return this._previousProcessorBlock.getInitialInputFile();
      }
      return this.getInputFile();
    }
    setInputFile(file: QSYSEventsFileFileIDRecord) {
      this._inputFile = file;
    }
    addFile(file: QSYSEventsFileFileIDRecord) {
      this._mappingTable.addFileInformation(file);
    }
    closeFile(file: QSYSEventsFileFileEndRecord) {
      if (this._outputFile === null) {
        return undefined;
      }
      if (!(file.getFileId() === (this._outputFile.getSourceId()))) {
        this.increaseTotalNumberOfLinesInInputFiles(parseInt(file.getExpansion()));
      } else {
        this.setTotalNumberOfLinesInOutputFile(parseInt(file.getExpansion()));
        return undefined;
      }
      this._mappingTable.closeFile(file);
    }
    getOutputFile() {
      return this._outputFile;
    }
    setOutputFile(file: QSYSEventsFileFileIDRecord) {
      this._outputFile = file;
    }
    getMappingTable() {
      return this._mappingTable;
    }
    isProcessorIDZero() {
      let procID = parseInt(this._currentProcessor.getOutputId());
      return procID === 0;
    }
    addErrorInformation(record: QSYSEventsFileErrorInformationRecord) {
      this._errors.push(record);
    }
    processorEnded() {
      this._mappingTable.finalizeMap();
    }
    setPreviousProcessor(previous: QSYSEventsFileProcessorBlockCore) {
      this._previousProcessorBlock = previous;
    }
    setContainsExpansionEvents(containsExpansionEvents: boolean) {
      this._containsExpansionEvents = containsExpansionEvents;
    }
    containsExpansionEvents() {
      return this._containsExpansionEvents;
    }
    increaseTotalNumberOfLinesInInputFiles(numberOfLines: number) {
      this._totalNumberOfLinesInInputFiles += numberOfLines;
    }
    getTotalNumberOfLinesInInputFiles() {
      return this._totalNumberOfLinesInInputFiles;
    }
    setTotalNumberOfLinesInOutputFile(numberOfLines: number) {
      this._totalNumberOfLinesInOutputFile = numberOfLines;
    }
    getTotalNumberOfLinesInOutputFile() {
      return this._totalNumberOfLinesInOutputFile;
    }
    getPreviousProcessorBlock(): QSYSEventsFileProcessorBlockCore {
      return this._previousProcessorBlock;
    }
    modifyErrorInformation(error: QSYSEventsFileErrorInformationRecord) {
      this._mappingTable.modifyErrorInformation(error);
      let inputFileLocation = '';
      let inputFileId = '';
      if (this.getInputFile() !== null) {
        inputFileLocation = this.getInputFile().getFilename();
        inputFileId = this.getInputFile().getSourceId();
      }
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile() && this.isMappingSupported() && (error.getFileId() === (inputFileId) || error.getFileId() === (inputFileLocation))) {
        this._previousProcessorBlock.modifyErrorInformation(error);
      }
    }
    setFirstInEventsFile(isFirstInEventsFile : boolean) {
      this._isFirstInEventsFile = isFirstInEventsFile;
    }
    isFirstInEventsFile() {
      return this._isFirstInEventsFile;
    }
    setMappingSupported(mappingSupported: boolean) {
      this._mappingSupported = mappingSupported;
    }
    isMappingSupported() {
      return this._mappingSupported;
    }
    isFileReadOnly(fileIDRecord: QSYSEventsFileFileIDRecord) {
      return fileIDRecord.getFlag() === ('1') || ((this._previousProcessorBlock !== null && !this.isFirstInEventsFile()) && this._previousProcessorBlock.getOutputFile() !== null && fileIDRecord.getFilename() === (this._previousProcessorBlock.getOutputFile().getFilename())) || (this.getOutputFile() !== null && fileIDRecord.getFilename() === (this.getOutputFile().getFilename()));
    }
    getAllProcessorErrors() {
      let allPrevErrs = new Array<QSYSEventsFileErrorInformationRecord>();
      if (this._previousProcessorBlock !== null) {
        allPrevErrs = this._previousProcessorBlock.getAllProcessorErrors();
      }
      allPrevErrs.concat(this._errors);
      return allPrevErrs;
    }
    resolveFileNamesForAllErrors() {
      if (this._previousProcessorBlock !== null) {
        this._previousProcessorBlock.resolveFileNamesForAllErrors();
      }
      this._errors.forEach(error => {
        this.resolveFileNameAndDetermineIfReadOnly(error);
      });
      // let errors = this._errors.iterator();
      // while (errors.hasNext()) {
      //   let error = errors.next();
      //   this.resolveFileNameAndDetermineIfReadOnly(error);
      // }
      
    }
    resolveFileNameAndDetermineIfReadOnly(error: QSYSEventsFileErrorInformationRecord) {
      let readOnly = false;
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile() && this.isMappingSupported() && error.getFileId() === (this.INPUT_FILE_ID)) {
        this._previousProcessorBlock.modifyErrorInformation(error);
      } else {
        let fileLocation = this._mappingTable.getFileLocationForFileID(error.getFileId());
        if (fileLocation !== null) {
          readOnly = this.isFileReadOnly(this._mappingTable.getFileIDRecordForFileID(error.getFileId()));
          error.setFileName(fileLocation);
        } else {
          readOnly = this.isFileReadOnly(this.getInitialInputFile());
          error.setFileName(this.getInitialInputFile().getFilename());
          error.setStmtLine('0');
          error.setStartErrLine('0');
          error.setTokenStart('000');
          error.setEndErrLine('0');
          error.setTokenEnd('000');
        }
      }
      return readOnly;
    }
  }