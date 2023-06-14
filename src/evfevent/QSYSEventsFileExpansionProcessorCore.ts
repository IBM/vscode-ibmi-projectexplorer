class QSYSEventsFileProcessorBlockCore {
    INPUT_FILE_ID: string;
    private _errors: null;
    private _inputFile: null;
    private _outputFile: null;
    private _currentProcessor: EvfeventRecord;
    private _mappingTable: QSYSEventsFileMapTable;
    private _previousProcessorBlock: QSYSEventsFileProcessorBlockCore;
    private _containsExpansionEvents: boolean;
    private _isFirstInEventsFile: boolean;
    private _mappingSupported: boolean;
    private _totalNumberOfLinesInOutputFile: number;
    private _totalNumberOfLinesInInputFiles: number;
    _connection: string;
    private _profile: string;
    private _type: string;
    private _project: string;
    
    constructor(record : EvfeventRecord ) {
      this.INPUT_FILE_ID = '001';
      this._errors = null;
      this._inputFile = null;
      this._outputFile = null;
      this._currentProcessor = null;
      this._mappingTable = null;
      this._previousProcessorBlock = null;
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
      this._errors = new LinkedList();
    }
    getInputFile() {
      return this._inputFile;
    }
    getInitialInputFile() {
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile()) {
        return this._previousProcessorBlock.getInitialInputFile();
      }
      return this.getInputFile();
    }
    setInputFile(file) {
      this._inputFile = file;
    }
    addFile(file) {
      this._mappingTable.addFileInformation(file);
    }
    closeFile(file) {
      if (this._outputFile === null) {
        return undefined;
      }
      if (!(file.getFileId().equals(this._outputFile.getSourceId()))) {
        this.increaseTotalNumberOfLinesInInputFiles(Integer.parseInt(file.getExpansion()));
      } else {
        this.setTotalNumberOfLinesInOutputFile(Integer.parseInt(file.getExpansion()));
        return undefined;
      }
      this._mappingTable.closeFile(file);
    }
    getOutputFile() {
      return this._outputFile;
    }
    setOutputFile(file) {
      this._outputFile = file;
    }
    getMappingTable() {
      return this._mappingTable;
    }
    isProcessorIDZero() {
      let procID = Integer.parseInt(this._currentProcessor.getOutputId());
      return procID === 0;
    }
    addErrorInformation(record) {
      this._errors.add(record);
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
    getPreviousProcessorBlock() {
      return this._previousProcessorBlock;
    }
    modifyErrorInformation(error) {
      this._mappingTable.modifyErrorInformation(error);
      let inputFileLocation = '';
      let inputFileId = '';
      if (this.getInputFile() !== null) {
        inputFileLocation = this.getInputFile().getFilename();
        inputFileId = this.getInputFile().getSourceId();
      }
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile() && this.isMappingSupported() && (error.getFileId().equals(inputFileId) || error.getFileId().equals(inputFileLocation))) {
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
    isFileReadOnly(fileIDRecord) {
      return fileIDRecord.getFlag().equals('1') || ((this._previousProcessorBlock !== null && !this.isFirstInEventsFile()) && this._previousProcessorBlock.getOutputFile() !== null && fileIDRecord.getFilename().equals(this._previousProcessorBlock.getOutputFile().getFilename())) || (this.getOutputFile() !== null && fileIDRecord.getFilename().equals(this.getOutputFile().getFilename()));
    }
    getAllProcessorErrors() {
      let allPrevErrs = new LinkedList();
      if (this._previousProcessorBlock !== null) {
        allPrevErrs = this._previousProcessorBlock.getAllProcessorErrors();
      }
      allPrevErrs.addLast(this._errors);
      return allPrevErrs;
    }
    resolveFileNamesForAllErrors() {
      if (this._previousProcessorBlock !== null) {
        this._previousProcessorBlock.resolveFileNamesForAllErrors();
      }
      let errors = this._errors.iterator();
      while (errors.hasNext()) {
        let error = errors.next();
        this.resolveFileNameAndDetermineIfReadOnly(error);
      }
    }
    resolveFileNameAndDetermineIfReadOnly(error) {
      let readOnly = false;
      if (this._previousProcessorBlock !== null && !this.isFirstInEventsFile() && this.isMappingSupported() && error.getFileId().equals(this.INPUT_FILE_ID)) {
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