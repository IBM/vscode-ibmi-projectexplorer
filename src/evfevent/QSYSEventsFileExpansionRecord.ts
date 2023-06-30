/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2006, 2023 
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


/**
 * This class represents an Expansion record in an Events File.
 */
class QSYSEventsFileExpansionRecord implements EvfeventRecord
{
	public static Copyright = "(C) Copyright IBM Corp. 2006  All Rights Reserved.";
	
	private _version: string;
	private _inputFileID: string;
	private _inputLineStart: string;
	private _inputLineEnd: string;
	private _outputFileID: string;
	private _outputLineStart: string;
	private _outputLineEnd: string;

	constructor(version: string, inputFileID: string, inputLineStart: string, inputLineEnd: string, 
		outputFileID: string, outputLineStart: string, outputLineEnd: string){
			this._version = version;
			this._inputFileID = inputFileID;
			this._inputLineStart = inputLineStart;
			this._inputLineEnd = inputLineEnd;
			this._outputFileID = outputFileID;
			this._outputLineStart = outputLineStart;
			this._outputLineEnd = outputLineEnd;

	}

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType(): string
	{
		return IQSYSEventsFileRecordType.EXPANSION;
	}

	/**
	 * Get the input file ID.
	 * @return the input file ID
	 */
	public getInputFileID(): string
	{
		return this._inputFileID;
	}

	/**
	 * Set the input file ID.
	 * @param the input file ID
	 */
	public setInputFileID(fileID: string)
	{
		this._inputFileID = fileID;
	}

	/**
	 * Get the input line end.
	 * @return the input line end
	 */
	public getInputLineEnd(): string
	{
		return this._inputLineEnd;
	}

	/**
	 * Set the input line end.
	 * @param the input line end
	 */
	public setInputLineEnd(lineEnd: string)
	{
		this._inputLineEnd = lineEnd;
	}

	/**
	 * Get the input line start.
	 * @return the input line start
	 */
	public getInputLineStart(): string
	{
		return this._inputLineStart;
	}

	/**
	 * Set the input line start.
	 * @param the input line start
	 */
	public setInputLineStart(lineStart: string)
	{
		this._inputLineStart = lineStart;
	}

	/**
	 * Get the output file ID.
	 * @return the output file ID
	 */
	public getOutputFileID(): string
	{
		return this._outputFileID;
	}

	/**
	 * Set the output file ID.
	 * @param the output file ID
	 */
	public  setOutputFileID(fileID: string)
	{
		this._outputFileID = fileID;
	}

	/**
	 * Get the output line end.
	 * @return the output line end
	 */
	public getOutputLineEnd(): string
	{
		return this._outputLineEnd;
	}

	/**
	 * Set the output line end.
	 * @param the output line end
	 */
	public setOutputLineEnd(lineEnd: string)
	{
		this._outputLineEnd = lineEnd;
	}

	/**
	 * Get the output line start.
	 * @return the output line start
	 */
	public getOutputLineStart(): string
	{
		return this._outputLineStart;
	}

	/**
	 * Set the output line start.
	 * @param the output line start
	 */
	public setOutputLineStart(lineStart: string)
	{
		this._outputLineStart = lineStart;
	}

	/**
	 * Get the version.
	 * @return the version
	 */
	public getVersion(): string
	{
		return this._version;
	}

	/**
	 * Set the version.
	 * @param the version
	 */
	public setVersion(_version: string)
	{
		this._version = _version;
	}

}
