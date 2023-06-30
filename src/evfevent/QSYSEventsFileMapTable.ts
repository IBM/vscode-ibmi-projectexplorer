/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


// SourceLineRange and FileIDLinesPair
class QSYSEventsFileMapTable
{
	// The map: made up of SourceLineRanges
	private _map: Array<SourceLineRange>;
	
	// Holds the EXPANSION records until processed
	private _queueExpansion: Array<QSYSEventsFileExpansionRecord>;
	
	// Data needed to determine where copybook SourceLineRange should be inserted in the list
	private _files: ArrayStack<FileIDLinesPair> ;
	private _lookupIndex: number;
	
	// Hashtable of File IDs and locations for fast lookup
	private _fileTable: Map<String, QSYSEventsFileFileIDRecord>;
	
	constructor()
	{
		this._map = new Array<SourceLineRange>();
		this._queueExpansion = new Array<QSYSEventsFileExpansionRecord>();
		this._files = new ArrayStack<FileIDLinesPair>();
		this._fileTable = new Map<String, QSYSEventsFileFileIDRecord>();
		this._lookupIndex = 0;
	}
	
	/**
	 * Adds file information to the map
	 * @param record The File ID record
	 */
	public addFileInformation(record: QSYSEventsFileFileIDRecord)
	{
		let range = this.createOpenEndedSourceLineRange(record);
		let file = new FileIDLinesPair(record.getSourceId());
		
		//This should mean that the new FILEID is a copy member
		if(!this._files.isEmpty())
		{
			let parentFile =  this._files.peek();
			
			let parentRange = this._map.getLast();
			if(parentRange.getOutputStartLine() === range.getOutputStartLine())
			{
				this._map.removeLast();
			}
			else
			{
				parentRange.setOutputEndLine(range.getOutputStartLine() - 1);
				parentRange.setInputEndLine(parentRange.getOutputEndLine() - parentRange.getOutputStartLine() + parentRange.getInputStartLine());

				// Add 2 to account for the /copy statement that was commented out
				parentFile?.increaseLinesProcessed(parentRange.getInputEndLine() - parentRange.getInputStartLine() + 1);
			}
		}
		
		this._map.addLast(range);
		this._files.push(file);
		this._fileTable.set(record.getSourceId(), record);
	}
	
	/**
	 * Adds file information only to the file table. This is useful for processing the
	 * compiler (000) processor block, since we don't need to keep track of line mappings
	 * and FileIDLinesPair pairings.
	 * @param record The File ID record
	 */
	public addFileToFileTable(record: QSYSEventsFileFileIDRecord)
	{
		this._fileTable.set(record.getSourceId(), record);
	}
	
	/**
	 * Sets the correct bounds for the files in the map that were added using <code>AddFileInformation()</code>.
	 * @param record The FileEnd record that contains the number of lines in the source.
	 */
	public closeFile(record: QSYSEventsFileFileEndRecord) 
	{
		// Make sure that the stack is not empty
		if(this._files.isEmpty())
			{throw new Error("A FILEEND event does not have a matching FILEID." + "\n" +  
							"Faulty event: " + record.toString());}
		
		let file = this._files.pop();
		
		// Make sure that the FILEID matches the FILEEND on the stack
		if(file?.getID() !== (record.getFileId()))
			{throw new Error("The ID field of the FILEEND event does not match the ID field of the last FILEID event." + '\n' +  
							"Mismatched IDs: \t FILEID: " + file?.getID() + "\t FILEEND: " + record.toString());}
		
		let last = this._map.getLast();
		
		// Make sure that last retrieved node matches the ID of the FILEEND
		if(last.getInputFileID() !== (record.getFileId()))
			{throw new Error("The ID field of the FILEEND event does not match the ID field of the last SourceLineRange." + '\n' + 
							"Mismatched IDs: \t FILEID: " + last.getInputFileID() + "\t FILEEND: " + record.toString());}
		
		let expansion = 0;
		
		try
		{
			expansion = parseInt(record.getExpansion());
		}
		catch (e)
		{
			throw new Error("Unable to parse the expansion field of the FILEEND record to an integer" + '\n' +
							"Faulty record: " + record.toString());
		}
		
		// If the expansion field of the FileEnd record is different than 0, use that information to set the bounds
		if(expansion !== 0)
		{
			last.setInputEndLine(last.getInputStartLine() + expansion - file.getLinesProcessed() - 1);
			last.setOutputEndLine(last.getOutputStartLine() + expansion - file.getLinesProcessed() - 1);

			// All files have been handled
			if(this._files.isEmpty()){
				return;
			}

			let parent = this._files.peek();

			let range = new SourceLineRange();
			range.setInputFileID(parent?.getID());
			range.setInputStartLine(parent?.getLinesProcessed() + 1);
			range.setOutputStartLine(last.getOutputEndLine() + 1);
			
			this._map.addLast(range);
		}
		// If the expansion field is 0, assume that the bounds go to the end of the file
		// defect 7526: according to Gina Whitney, the expansion field is only 0 if the copy file
		// is empty, or if we are working with 5.4 or 6.1 before the PTF that enabled expansion events
		// So we will handle this as if it were an empty include and that should work for both cases.
		else
		{
			last.setInputEndLine(last.getInputStartLine());
			last.setOutputStartLine(last.getOutputStartLine()-1);// no output whatsoever, so point errors to commented out include
			last.setOutputEndLine(last.getOutputStartLine());
			// All files have been handled -i.e. this was the end of the containing file
			if(this._files.isEmpty()){
				return;
			}
			
			// Otherwise this was the end of an included file
			// Now add an entry for the remainder of the containing file
			let parent = this._files.peek();
			let range = new SourceLineRange();
			range.setInputFileID(parent.getID());
			range.setInputStartLine(parent.getLinesProcessed() + 1);
			range.setOutputStartLine(last.getOutputStartLine() + 1);
			this._map.addLast(range);
		}
	}
	
	/**
	 * Create a <code>SourceLineRange</code> with open bounds. The bounds will be set once the FileEnd record is read.
	 * @param record The FileID record that contains information about where the <code>SourceLineRange</code> should start.
	 */
	private createOpenEndedSourceLineRange(record: QSYSEventsFileFileIDRecord): SourceLineRange
	{
		let line = 1;

		try
		{
			line = parseInt(record.getLine());
		}
		catch (e)
		{
			throw new Error("Unable to parse the line field of the FILEID record to an integer" + '\n'+
							"Faulty record: " + record.toString());
		}

		let range = new SourceLineRange();
		range.setInputFileID(record.getSourceId());
		range.setInputStartLine(1);
		 
		
		//We need to take into consideration lines that have already been mapped to the output file.
		//line - parentFile.getLinesProcessed() === lines between the new /copy and the old /copy
		if(!this._files.isEmpty()) {
			let parentRange = this._map.getLast();
			let parentFile = this._files.peek();	
			range.setOutputStartLine(parentRange.getOutputStartLine() + line - parentFile.getLinesProcessed());
		}
		else {
			range.setOutputStartLine(1);
		}
		return range;
	}
	
	public addExpansionRecord(record: QSYSEventsFileExpansionRecord)
	{
		this._queueExpansion.addLast(record);
	}
	
	private getSourceLineRangeForOutputLine(line: number): SourceLineRange | null
	{
		this._map.forEach(range => {
			if(range.containsOutputLine(line)){
				return range;
			}
		});
		// let ranges = this._map.iterator();
		// while(ranges.hasNext()) {
		// 	let range = ranges.next();
		// 	if(range.containsOutputLine(line))
		// 		return range;
		// }

		return null;
	}
	
	private optimizedSourceLineRangeLookup(line: number): SourceLineRange | null
	{
		// Start searching from last known position
		for(var i = this._lookupIndex; i < this._map.size(); i++)
		{
			let range = this._map.get(i);
			if(range.containsOutputLine(line))
			{
				this._lookupIndex = i;
				return range;
			}
		}
		
		// If not found, wrap around and search from beginning
		for(var i = 0; i < this._lookupIndex && i < this._map.size(); i++)
		{
			let range = this._map.get(i);
			if(range.containsOutputLine(line))
			{
				this._lookupIndex = i;
				return range;
			}
		}
		
		return null;
	}
	
	private getSourceLineRangeForInputLine(line: number, id: string): SourceLineRange | null
	{
		this._map.forEach(range => {
			if(range.containsInputLine(line, id)){
				return range;
			}
		});
		// Iterator<SourceLineRange> ranges = this._map.iterator();
		// while(ranges.hasNext()) {
		// 	SourceLineRange range = ranges.next();
		// 	if(range.containsInputLine(line, id))
		// 		return range;
		// }		
		return null;
	}
	
	private shiftRangesBy(amount: number, atIndex: number)
	{
		for(var i = atIndex; i < this._map.size(); i++){
			(this._map.get(i)).shiftOutputLines(amount);
		}
	}
	
	private handleExpansion(record: QSYSEventsFileExpansionRecord) 
	{
		let expansionRange = this.createSourceLineRange(record);
		let expandedSource = null;
		//Handle the case where the expansion comes at the end of file (right after the last range)
		if(expansionRange.getOutputStartLine() - (this._map.getLast()).getOutputEndLine() === 1) {
			if(expansionRange.getInputStartLine() === expansionRange.getInputEndLine()) { 
				this._map.addLast(expansionRange);
				return;
			}	
		}
		//05/25/09: There are currently no regular expansion events where the input start and input end lines are different,
		//so there is currently no implementation to handle such events, 
		//and this code should only be reached by negative expansion events.
		else if (expansionRange.getInputStartLine() !== expansionRange.getInputEndLine() || (expansionRange.getOutputStartLine() === 0 && expansionRange.getOutputEndLine() === 0))
			{expandedSource = this.getSourceLineRangeForInputLine(expansionRange.getInputStartLine(), expansionRange.getInputFileID());}		
		else 
			{expandedSource = this.getSourceLineRangeForOutputLine(expansionRange.getOutputStartLine());}
		
		this.splitExpandedSourceLineRange(expansionRange, expandedSource);
	}
	
	private splitExpandedSourceLineRange(expansion: SourceLineRange, expanded: SourceLineRange)
	{
		let index = this._map.indexOf(expanded);
		let isExpansionNegative = expansion.getOutputStartLine() === 0 && expansion.getOutputEndLine() === 0;
		let expansionSize = (isExpansionNegative)?
							expansion.getInputStartLine() - expansion.getInputEndLine() - 1:
							expansion.getOutputEndLine() - expansion.getOutputStartLine() + 1;
							
		
		//Handle a negative expansion event
		if(isExpansionNegative) {
			if(expansion.getInputStartLine() === expanded.getInputStartLine() && expansion.getInputEndLine() === expanded.getInputEndLine()) {
				//Assume 1 to 1 mapping
				this._map.remove(index);
				
				this.shiftRangesBy(expansionSize, index);				
			}
			else if(expansion.getInputStartLine() === expanded.getInputStartLine()) {
				expanded.setInputStartLine(expansion.getInputEndLine() + 1);
				expanded.setOutputStartLine(expanded.getOutputStartLine() + Math.abs(expansionSize));
				
				this.shiftRangesBy(expansionSize, index);
			}
			else if(expansion.getInputEndLine() === expanded.getInputEndLine()) {
				//Assume 1 to 1 mapping
				expanded.setInputEndLine(expansion.getInputStartLine() - 1);
				expanded.setOutputEndLine(expanded.getOutputEndLine() - Math.abs(expansionSize));
				
				this.shiftRangesBy(expansionSize, index + 1);
			}
			else {
				let extraRange = new SourceLineRange(expanded);
				
				expanded.setInputEndLine(expansion.getInputStartLine() - 1);
				expanded.fixOutputRangeBasedOnInputRange();
				
				extraRange.setInputStartLine(expansion.getInputEndLine() + 1);
				extraRange.setOutputStartLine(expanded.getOutputEndLine() + Math.abs(expansionSize) + 1);
				
				this._map.add(index + 1, extraRange);
				
				this.shiftRangesBy(expansionSize, index + 1);
			}			
		}
		else if(expanded.getOutputStartLine() === expansion.getOutputStartLine()) {
			//only supports expansions where expansion.getInputStartLine() === expansion.getInputEndLine()
			
			//insert the expansion before the current range
			//(to keep the output ranges sorted), and then
			//shift the output ranges by amount of expansion
			if(expansion.getInputStartLine() === expansion.getInputEndLine()) {
				this._map.add(index, expansion);
				this.shiftRangesBy(expansionSize, index + 1);				
			
			}		
		}
		//Not necessary - handled the same way as generic case:
		//else if(expanded.getOutputEndLine() === expansion.getOutputEndLine()){
		//}		
		//Handle generic case
		else
		{
			//only supports expansions where expansion.getInputStartLine() === expansion.getInputEndLine()
			
			//split the current range in half at the point of expansion's output start,
			//insert the expansion between the two halves, and 
			//shift the outputs of the the remaining ranges (starting with the second half) 
			//by the mount of the expansion			
			let extraRange = new SourceLineRange(expanded);
			
			expanded.setOutputEndLine(expansion.getOutputStartLine() - 1);
			expanded.fixInputRangeBasedOnOutputRange();
			
			this._map.add(index + 1, expansion);
			
			extraRange.setInputStartLine(expanded.getInputEndLine() + 1);
			extraRange.setOutputStartLine(expanded.getOutputEndLine() + 1);
			this._map.add(index + 2, extraRange);
			
			this.shiftRangesBy(expansionSize, index + 2);
		}
	}
	
	private createSourceLineRange(record: QSYSEventsFileExpansionRecord): SourceLineRange
	{
		let range = new SourceLineRange();
		
		range.setInputFileID(record.getInputFileID());
		let iStart = 0, iEnd = 0, oStart = 0, oEnd = 0;
		
		try
		{
			iStart = parseInt(record.getInputLineStart());
			iEnd = parseInt(record.getInputLineEnd());
			oStart = parseInt(record.getOutputLineStart());
			oEnd = parseInt(record.getOutputLineEnd());
		}
		catch (e)
		{
			throw new Error("Unable to parse the fields of the EXPANSION record to integers" + '\n' +
					"Faulty record: " + record.toString());
		}
		
		range.setInputStartLine(iStart);
		range.setInputEndLine(iEnd);
		range.setOutputStartLine(oStart);
		range.setOutputEndLine(oEnd);
		
		return range;
	}
	
	/**
	 * Returns the QSYSEventsFileFileIDRecord corresponding to a file ID
	 * @param ID - the ID of the file to look for 
	 * @return - the QSYSEventsFileFileIDRecord corresponding to the file ID if it exists in the table, null otherwise
	 */
	public getFileIDRecordForFileID(ID: string): QSYSEventsFileFileIDRecord
	{
		return this._fileTable.get(ID);
	}
	
	public getFileLocationForFileID(ID: string): string | null
	{
		let fileRecord = this.getFileIDRecordForFileID(ID);
		if(fileRecord === null) {
			return null;
		}
		return fileRecord.getFilename();
	}
	
	/**
	 * Modifies the information contained in the Error record based on the available map.
	 * @param record the Error record to be modified.
	 */
	public modifyErrorInformation(record: QSYSEventsFileErrorInformationRecord) 
	{
		let statementLine, startLineNumber, endLineNumber;
		
		let range;
		statementLine = parseInt(record.getStmtLine());
		range = this.optimizedSourceLineRangeLookup(statementLine);
		
		if(range === null)
		{
			throw new Error("The line number on which ERROR occurs could not be found in the map." + "\n" +
											"Faulty event: " + record.toString());
		}
		
		try
		{
			record.setStmtLine(this.getLineFromSourceLineRange(range, statementLine).toString());
			record.setFileId(range.getInputFileID());
			
			startLineNumber = parseInt(record.getStartErrLine());
			record.setStartErrLine(this.getLineFromSourceLineRange(range, startLineNumber).toString());
			
			endLineNumber = parseInt(record.getEndErrLine());
			record.setEndErrLine(this.getLineFromSourceLineRange(range, endLineNumber).toString());
			
			record.setFileName((this._fileTable.get(range.getInputFileID())).getFilename());
		}
		catch (e)
		{
			throw new Error("Unable to parse the line fields of the ERROR record to integers" + "\n" +
										       "Faulty record: " + record.toString());
		}
	}
	
	/**
	 * Calculates the line number based on the initial number and how many lines where shifted in the expansion process.
	 * @param range <code>SourceLineRange</code> that contains mapping information
	 * @param initial line number
	 * @return the new line number
	 */
	private getLineFromSourceLineRange(range: SourceLineRange, initial: number): number
	{
		if(range === null)
			{return initial;}
		
		if(range.getInputEndLine() - range.getInputStartLine() === range.getOutputEndLine() - range.getOutputStartLine())
			{return initial - range.getOutputStartLine() + range.getInputStartLine();}
		//Temporary fix for the problem where all errors in the last range get mapped to getInputStartLine
		//when the last range has open bounds
		else if (range.getInputEndLine() === -1 &&  range.getOutputEndLine() === -1)
			{return initial - range.getOutputStartLine() + range.getInputStartLine();}		
		else
			{return range.getInputStartLine();}
	}
	
	public finalizeMap() 
	{
		if(!this._files.isEmpty())
		{
			throw new Error(
					"One or more FILEID records do not have matching FILEEND records" + "\n" +
					"List of outstanding FILEID records:" + this._files);
		}
		
		this._queueExpansion.forEach(expansion => {
			this.handleExpansion(expansion);
		});
		// Iterator<QSYSEventsFileExpansionRecord> expansions = this._queueExpansion.iterator();
		// while(expansions.hasNext()) {
		// 	handleExpansion((QSYSEventsFileExpansionRecord)expansions.next());
		// }
		
		// This handles errors at line 0 of the main source file.
		// Those are usually sev 40 errors.
		let header = new SourceLineRange();
		header.setInputFileID("001");
		header.setInputStartLine(0);
		header.setInputEndLine(0);
		header.setOutputStartLine(0);
		header.setOutputEndLine(0);
		
		this._map.addFirst(header);
	}
	
	/**
	 * Get all file locations.
	 */
	public getAllFileIDRecords(): Array<QSYSEventsFileFileIDRecord>{
		if (this._fileTable === null || this._fileTable.size === 0){
			let emptySet = new Set<QSYSEventsFileFileIDRecord>();
			return emptySet;
		}
		
		let fileIDRecords = new Set<QSYSEventsFileFileIDRecord>();
	    let fileRecordID: string;
	    let fileIDRecord: QSYSEventsFileFileIDRecord;
		for(let key of this._fileTable.keys()){
			fileRecordID = keyIter;
			fileIDRecord = this._fileTable.get(fileRecordID);
			fileIDRecords.add(fileIDRecord);
		}
		// while (keyIter.hasNext()){
		// 	fileRecordID = keyIter.next();
		// 	fileIDRecord = this._fileTable.get(fileRecordID);
		// 	fileIDRecords.add(fileIDRecord);
		// }
		return fileIDRecords;
	}
}
