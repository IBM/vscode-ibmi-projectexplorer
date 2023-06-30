/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 

/**
 * This class represents a Program record in an events file.
 */
class QSYSEventsFileProgramRecord implements EvfeventRecord {

   public Copyright = "(C) Copyright IBM Corp. 2003  All Rights Reserved.";

	
	private version: string;
	private line: string;

	constructor(version: string, line: string){
		this.version = version;
		this.line = line;
	}

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType() {
		return null;
	}
	
	/**
	 * Set the version.
	 * @param the version
	 */
	public setVersion(version: string) {
		this.version = version;
	}
	
	/**
	 * Get the version.
	 * @return the version
	 */
	public getVersion(): string {
		return this.version;
	}
	
	/**
	 * Set the line.
	 * @param the line
	 */
	public setLine(line: string) {
		this.line = line;
	}
	
	/**
	 * Get the line.
	 * @return the line
	 */
	public getLine(): string {
		return this.line;
	}
}
