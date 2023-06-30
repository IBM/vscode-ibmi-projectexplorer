/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2023
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


/**
 * This class represents a File ID record in an events file.
 */
class QSYSEventsFileFileIDRecord implements EvfeventRecord {

   public static Copyright = "(C) Copyright IBM Corp. 2003, 2023  All Rights Reserved.";


	private version: string;
	private sourceId: string;
	private line: string;
	private length: string;
	private filename: string;
	private timestamp: string;
	private flag: string;

    constructor(version: string, sourceId: string, line: string, length: string, 
        filename: string, timestamp: string, flag: string){
            this.version = version;
            this.sourceId = sourceId;
            this.line = line;
            this.length = length;
            this.filename = filename;
            this.timestamp = timestamp;
            this.flag = flag;
        }
	
	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType(): string {
		return IQSYSEventsFileRecordType.FILE_ID;
	}
	
	/**
	 * Get the version.
	 * @return the version
	 */
	public getVersion(): string {
		return this.version;
	}
	
	/**
	 * Get the source id.
	 * @return the source id
	 */
	public getSourceId(): string {
		return this.sourceId;
	}

	/**
	 * Get the line.
	 * @return the line
	 */
	public getLine(): string {
		return this.line;
	}
	
	/**
	 * Get the length.
	 * @return the length
	 */
	public getLength(): string {
		return this.length;
	}
	
	/**
	 * Get the filename.
	 * @return the filename
	 */
	public getFilename(): string {
		return this.filename;
	}
	
	/**
	 * Get the timestamp.
	 * @return the timestamp
	 */
	public getTimestamp(): string {
		return this.timestamp;
	}
	
	/**
	 * Get the flag.
	 * @return the flag
	 */
	public getFlag(): string {
		return this.flag;
	}
}
