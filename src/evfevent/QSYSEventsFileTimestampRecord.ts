/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


/**
 * This class represents a Timestamp record in an events file.
 */
class QSYSEventsFileTimestampRecord implements EvfeventRecord {

   public Copyright = "(C) Copyright IBM Corp. 2003  All Rights Reserved.";

	
	private version: string;
	private timestamp: string;

	constructor(version: string, timestamp: string){
		this.version = version;
		this.timestamp = timestamp;
	}
	
	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType() {
		return IQSYSEventsFileRecordType.TIMESTAMP;
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
	 * Set the timestamp.
	 * @param the timestamp
	 */
	public setTimestamp(timestamp: string) {
		this.timestamp = timestamp;
	}
		
	/**
	 * Get the timestamp.
	 * @return the timestamp
	 */
	public getTimestamp(): string {
		return this.timestamp;
	}
}