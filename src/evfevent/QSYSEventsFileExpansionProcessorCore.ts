/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2009, 2023
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


class QSYSEventsFileExpansionProcessorCore implements EvfeventRecord {
	
	private PRE_COMPILE_PROCESSOR_ID = "999";
	
	protected _currentProcessor: QSYSEventsFileProcessorBlockCore;

	// Flags any errors that occur during processing and disables the processor if needed
	protected _postProcessingNeeded = true;

	// Flags if the Events File contains any EXPANSION Events or not
//	private boolean _containsExpansionEvents = false;

	//Needed for events files that contain multiple events files that have been combined into one (as done in iProjects).
	//Gets set to true at the beginning of each new "sub" events file (marked by a new TIMESTAMP record),
	//and to false after each first PROCESSOR event in the "sub" events file.
	//The scope of this variable is only the current "sub" events file.
	private _noProcessorEventsYet = true;
	
	//Needed to decide whether to do mappings of errors to input members
	//If true, temporary output members are involved, and mappings may be needed (unless not supported by pre-compilers)
	protected _containsPreCompileProcessorBlocks = false;
		
	constructor(){
		let record = new QSYSEventsFileProcessorRecord('', '', '');
		this._currentProcessor = new QSYSEventsFileProcessorBlockCore(record);
	}

	public processErrorRecord(record: QSYSEventsFileErrorInformationRecord ) {
		this._currentProcessor.addErrorInformation(record);
	}

	public processExpansionRecord(record: QSYSEventsFileExpansionRecord) {
//		_containsExpansionEvents = true;
		this._currentProcessor.setContainsExpansionEvents(true);
		this._currentProcessor.getMappingTable().addExpansionRecord(record);
	}

	public  processFeedbackCodeRecord(record: QSYSEventsFileFeedbackCodeRecord) {
		return;
	}

	public processFileEndRecord(record: QSYSEventsFileFileEndRecord){ // throws SecondLevelHelpException
		try {
			this._currentProcessor.closeFile(record);
		} catch(ex) {
			this._postProcessingNeeded = false;
			throw ex;
		}
	}

	public processFileIDRecord(record: QSYSEventsFileFileIDRecord){ // throws SecondLevelHelpException
		// The Try-Catch block is there to flag any problems, disable processing and allow regular Events File processing to continue
		try
		{
			let fileID: number;
			
			fileID = parseInt(record.getSourceId());
			
			if(!this._currentProcessor.isProcessorIDZero())
			{
				if(fileID > 1)
				{
					if(this._currentProcessor.getOutputFile() === null)
					{
						this._currentProcessor.setOutputFile(record);
						return;
					}
				}
				else if(fileID === 1 && this._currentProcessor.getInputFile() === null)
				{
					this._currentProcessor.setInputFile(record);
				}
				this._currentProcessor.addFile(record);
			}
			else {//We need to keep track of all files in the compiler processor block to be able to get the location for files
				if(fileID === 1 && this._currentProcessor.getInputFile() === null)				
					{this._currentProcessor.setInputFile(record);}
				this._currentProcessor.getMappingTable().addFileToFileTable(record);				
			}
		}
		catch(e)
		{
			this._postProcessingNeeded = false;
			throw new Error();
		}
		
	}

	public  processMapDefineRecord(record: QSYSEventsFileMapDefineRecord) {
		return;
	}

	public  processMapEndRecord(record: QSYSEventsFileMapEndRecord) {
		return;
	}

	public  processMapStartRecord(record: QSYSEventsFileMapStartRecord) {
		return;
	}

	public  processProcessorRecord(record: QSYSEventsFileProcessorRecord){ //throws SecondLevelHelpException
		if(!this._containsPreCompileProcessorBlocks && record.getOutputId() === this.PRE_COMPILE_PROCESSOR_ID)
			{this._containsPreCompileProcessorBlocks = true;}
			
		try
		{
			if(this._currentProcessor !== null)
				{this._currentProcessor.processorEnded();}
		} catch(ex) {
			this._postProcessingNeeded = false;
			throw ex;
		}
			let newProcessor = this.constructEventsFileProcessorBlock(record);
			//Set this processor block as the first one in the current "sub" events file 
			//(needed for events file that contains multiple events files that have been combined into one)
			if(this._noProcessorEventsYet){
				newProcessor.setFirstInEventsFile(true);
				this._noProcessorEventsYet = false;
			}		
			
			newProcessor.setPreviousProcessor(this._currentProcessor);
			this._currentProcessor = newProcessor;
		}
	

	protected constructEventsFileProcessorBlock(record: QSYSEventsFileProcessorRecord): QSYSEventsFileProcessorBlockCore {
		return new QSYSEventsFileProcessorBlockCore(record);
	}

	public  processProgramRecord(record: QSYSEventsFileProgramRecord) {
		return;
	}

	public  processTimestampRecord(record: QSYSEventsFileTimestampRecord) {
		this._noProcessorEventsYet = true;		
	}

	public doPreProcessing(): boolean {
		return false;
	}
	public doPostProcessing(): boolean { //throws SecondLevelHelpException
		if(!this._postProcessingNeeded ||  !this._containsPreCompileProcessorBlocks || !this.determineAndSetMappingSupport(this._currentProcessor))
			{return true;}
		this._currentProcessor.resolveFileNamesForAllErrors();
		return false;
	}

	/** 
	 * Recursively determines whether the events file (or any of the "sub" events files
	 * when multiple have been combined into one) supports mapping of errors from the 
	 * final temporary output member to the original input members.
	 * Also sets a property of each processor block for whether it supports mappings.
	 * Mapping is supported for an events file if all its processor blocks support error mapping.
	 * IMPORTANT: When called at the top level, this method should only be called on the 
	 * very last processor block of the [combined] events file.
	 * @param lastProcessorBlock - the first processor block to check. When called at 
	 * the top level, this should be the very last processor block of the [combined] events file.
	 * @return true if any of the events files support mapping of errors, false otherwise
	 */
	protected determineAndSetMappingSupport(lastProcessorBlock: QSYSEventsFileProcessorBlockCore): boolean
	{
		let isMappingSupportedByAny = false;
		let curProc: QSYSEventsFileProcessorBlockCore;
		for(curProc = lastProcessorBlock; curProc !== null; ){
			let curSupport = this.isMappingSupportedByCurrentEventsFile(curProc);
			this.setMappingSupportForCurrentEventsFile(curProc, curSupport);
			if(!isMappingSupportedByAny && curSupport) 
				{isMappingSupportedByAny = true;}
			
			//Iterate to the first processor block in the current "sub" events file,
			while(curProc !== null && !curProc.isFirstInEventsFile()) 
				{curProc = curProc.getPreviousProcessorBlock();}
			//use it to get the previous "sub" events file's last processor block			
			if(curProc !== null) 
				{curProc = curProc.getPreviousProcessorBlock();}
		}
		return isMappingSupportedByAny;
	}

	/**
	 * Sets the _supportsMappings property for each processor block in the current events file
	 * to the value provided.
	 * IMPORTANT: This method should only be called on the last processor block
	 * of the current events file.
	 * @param lastProcessorBlock - the last processor block of the current events file.
	 * @param support - boolean value corresponding to whether the current events file requires and supports mappings.
	 */
	private  setMappingSupportForCurrentEventsFile(lastProcessorBlock: QSYSEventsFileProcessorBlockCore, support: boolean) {
		let curProc: QSYSEventsFileProcessorBlockCore | null;
		for(curProc = lastProcessorBlock; curProc !== null; ){
			curProc.setMappingSupported(support);
			
			if(curProc.isFirstInEventsFile())
				{
					curProc = null;
				}
			else  {curProc = curProc.getPreviousProcessorBlock();}
		}
		
	}

	/**
	 * Recursively determines whether the current events file (or "sub" events file in the case of
	 * multiple events files combined into one) requires and supports mapping of errors
	 * from its output file to its input files. An ["sub"] events file supports mapping of
	 * errors if all of its processor blocks support error mappings.
	 * For individual processor blocks in the events file:
	 * For compile processor blocks, when they come after pre-compile processor blocks(s),
	 * mapping is considered to be supported. If they do not come after pre-compile
	 * block(s), there is no need to do mappings, so mapping is not considered supported.
	 * For pre-compile processor blocks (which will have temporary output members),
	 * mapping is supported if there are expansion events, or if there are no
	 * expansion events but the total number of lines written to the output
	 * file equals the total number of lines read from the input files, and is not zero.
	 * IMPORTANT: When called at the top level, this method should only be called on 
	 * the last processor block of the current events file.
	 * @param lastProcessorBlock - the last processor block of the current events file. 
	 * @return true if the current events file supports mapping of errors,
	 * false otherwise
	 */
	private isMappingSupportedByCurrentEventsFile(lastProcessorBlock: QSYSEventsFileProcessorBlockCore): boolean
	{
		let supported: boolean;
		
		if(lastProcessorBlock.getOutputFile() === null) {//compile processor block case
			if(lastProcessorBlock.getPreviousProcessorBlock() === null || lastProcessorBlock.isFirstInEventsFile())
				{supported = false;}
			else {supported = true;}
		}
		else if(lastProcessorBlock.containsExpansionEvents())
			{supported = true;}
		else if(lastProcessorBlock.getTotalNumberOfLinesInOutputFile() === 0)
			{supported = false;}
		else
			{supported = lastProcessorBlock.getTotalNumberOfLinesInOutputFile() === lastProcessorBlock.getTotalNumberOfLinesInInputFiles();}
		
		if(lastProcessorBlock.getPreviousProcessorBlock() !== null && !lastProcessorBlock.isFirstInEventsFile())
			{supported = supported && this.isMappingSupportedByCurrentEventsFile(lastProcessorBlock.getPreviousProcessorBlock());}
		
		return supported;
	}
	
	/**
	 * This method is used by the JUnit test for event file processing.
	 * 
	 * After all records in the Events File are processed, this method is called to
	 * return all the errors from all the processor blocks (QSYSEventsFileProcessorBlock)
	 * of the Events File. Since each QSYSEventsFileProcessorBlock contains a LinkedList
	 * of errors, the result will be returned as a LinkedList of those linked lists.
	 * 
	 * This method is called by EventsFileParser.printEventFileErrors(), which in turn is
	 * called by the JUnit test for event file processing.
	 * @return a list of lists of all parsed errors from all processor blocks of the Events File
	 * (one list for each processor block).
	 */
	public getAllErrors(): Array<QSYSEventsFileErrorInformationRecord> {
		if (this._currentProcessor !== null) {
			return this._currentProcessor.getAllProcessorErrors();
		}
		
		return new Array<QSYSEventsFileErrorInformationRecord>();
	}
	
	/**
	 * Return all file ID records.
	 */
	public getAllFileIDRecords(): Array<QSYSEventsFileFileIDRecord>{
		if (this._currentProcessor !== null)
		    {return this._currentProcessor.getMappingTable().getAllFileIDRecords();}
		else 
			{
				let emptyArray = new Array<QSYSEventsFileFileIDRecord>();
				return emptyArray;}
	}
}