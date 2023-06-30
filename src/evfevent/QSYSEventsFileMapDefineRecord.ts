/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 

/**
 * This class represents a Map Define record in an events file.
 */
class QSYSEventsFileMapDefineRecord implements EvfeventRecord {

   public Copyright = "(C) Copyright IBM Corp. 2003  All Rights Reserved.";

	
	private version: string;
	private macroId: string;
	private line: string;
	private length: string;
	private macroName: string;

	constructor(version: string, macroId: string, line: string, length: string, macroName: string){
		this.version = version;
		this.macroId = macroId;
		this.line = line;
		this.length = length;
		this.macroName = macroName;
	}

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType(): string {
		return IQSYSEventsFileRecordType.MAP_DEFINE;
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
	 * Set the macro id.
	 * @param the macro id
	 */
	public setMacroId(macroId: string) {
		this.macroId = macroId;
	}
	
	/**
	 * Get the macro id.
	 * @return the macro id
	 */
	public getMacroId(): string {
		return this.macroId;
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
	
	/**
	 * Set the length.
	 * @param the length
	 */
	public setLength(length: string) {
		this.length = length;
	}
	
	/**
	 * Get the length.
	 * @return the length
	 */
	public getLength(): string {
		return this.length;
	}
	
	/**
	 * Set the macro name.
	 * @param the macro name
	 */
	public setMacroName(macroName: string) {
		this.macroName = macroName;
	}
	
	/**
	 * Get the macro name.
	 * @return the macro name
	 */
	public getMacroName(): string {
		return this.macroName;
	}
}