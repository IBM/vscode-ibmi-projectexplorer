/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


/**
 * This class represents a Processor record in an events file.
 */
class QSYSEventsFileProcessorRecord implements EvfeventRecord {

   public Copyright = "(C) Copyright IBM Corp. 2003  All Rights Reserved.";


	private version: string;
	private outputId: string;
	private lineClass: string;

	constructor(version: string, outputId: string, lineClass: string){
		this.version = version;
		this.outputId = outputId;
		this.lineClass = lineClass;
	}
	
	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType() {
		return IQSYSEventsFileRecordType.PROCESSOR;
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
	 * Set the output id.
	 * @param the output id
	 */
	public setOutputId(outputId: string) {
		this.outputId = outputId;
	}
	
	/**
	 * Get the output id.
	 * @return the output id
	 */
	public getOutputId(): string {
		return this.outputId;
	}
	
	/**
	 * Set the line class.
	 * @param the line class
	 */
	public setLineClass(lineClass: string) {
		this.lineClass = lineClass;
	}
	
	/**
	 * Get the line class.
	 * @return the line class
	 */
	public getLineClass(): string {
		return this.lineClass;
	}
}