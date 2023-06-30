/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 

/**
 * This interface defines a backbone for processing Events File Records.<br>
 * 
 * As the Events File Format gets more complex and more used, the parsing logic
 * should be seperated from the processing logic. A different processor could
 * potentially be associated with Events Files generated for different purposes.
 * 
 * <br>
 * For instance, an SQL compile might need a different processor to make use of the
 * Expansion record.
 */
interface IQSYSEventsFileProcessor
{
	/**
	 * Processes a File ID record object.
	 * @param record
	 * @throws SecondLevelHelpException 
	 */
	processFileIDRecord(record: QSYSEventsFileFileIDRecord): void;
	
	/**
	 * Processes a File End record object.
	 * @param record
	 * @throws SecondLevelHelpException 
	 */
	processFileEndRecord(record: QSYSEventsFileFileEndRecord): void;
	
	/**
	 * Processes a Processor record object.
	 * @param record
	 * @throws SecondLevelHelpException 
	 */
	processProcessorRecord(record: QSYSEventsFileProcessorRecord): void;
	
	/**
	 * Processes a Timestamp record object.
	 * @param record
	 */
	processTimestampRecord(record: QSYSEventsFileTimestampRecord): void;
	
	/**
	 * Processes an Error record object.
	 * @param record
	 */
	processErrorRecord(record: QSYSEventsFileErrorInformationRecord): void;
	
	/**
	 * Processes a Program record object.
	 * @param record
	 */
	processProgramRecord(record: QSYSEventsFileProgramRecord): void;
	
	/**
	 * Processes a Feedback Code record object.
	 * @param record
	 */
	processFeedbackCodeRecord(record: QSYSEventsFileFeedbackCodeRecord): void;
	
	/**
	 * Processes a Map Define record object.
	 * @param record
	 */
	processMapDefineRecord(record: QSYSEventsFileMapDefineRecord): void;
	
	/**
	 * Processes a Map Start record object.
	 * @param record
	 */
	processMapStartRecord(record: QSYSEventsFileMapStartRecord): void;
	
	/**
	 * Processes a Map End record object.
	 * @param record
	 */
	processMapEndRecord(record: QSYSEventsFileMapEndRecord): void;
	
	/**
	 * Processes an Expansion record object.
	 * @param record
	 */
	processExpansionRecord(record: QSYSEventsFileExpansionRecord): void;
	
	/**
	 * After parsing all records in the Events File, this method will be called to
	 * process the records.
	 * @return <code>true</code> if post-processing was succesful. <code>false</code> otherwise.
	 * @throws SecondLevelHelpException 
	 */
	doPostProcessing(): boolean;
	
	/**
	 * Before parsing all records in the Events File, this method will be called to
	 * allow the processor to perform initialization.
	 * @return <code>true</code> if pre-processing was succesful. <code>false</code> otherwise.
	 */
	doPreProcessing(): boolean;

	/**
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
	getAllErrors(): Array<Array<QSYSEventsFileErrorInformationRecord>>;
	
	/**
	 * Return all file names. 
	 */
	getAllFileIDRecords(): Set<QSYSEventsFileFileIDRecord>;
}
