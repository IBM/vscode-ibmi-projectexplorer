/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2023
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 

/**
 * This class represents a Error Information record in an events file.
 */
class QSYSEventsFileErrorInformationRecord implements EvfeventRecord {
	
	private version: string;
	private fileId: string;
	private annotClass: string;
	private stmtLine: string;
	private startErrLine: string;
	private tokenStart: string;
	private endErrLine: string;
	private tokenEnd: string;
	private msgId: string;
	private sevChar: string;
	private sevNum: string;
	private length: string;
	private msg: string;

	// source file name corresponding to file id - is computed later
	private fileName: string;

	constructor(version: string, fileId: string, annotClass: string, stmtLine: string,
		startErrLine: string, tokenStart: string, endErrLine: string, tokenEnd: string,
		msgId: string, sevChar: string, sevNum: string, length: string, msg: string){
		this.version = version;
		this.fileId = fileId;
		this.annotClass = annotClass;
		this.stmtLine = stmtLine;
		this.startErrLine = startErrLine;
		this.tokenStart = tokenStart;
		this.endErrLine = endErrLine;
		this.tokenEnd = tokenEnd;
		this.msgId = msgId;
		this.sevChar = sevChar;
		this.sevNum = sevNum;
		this.length = length;
		this.msg = msg;
		this.fileName = "";
	}

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	getRecordType(): string {
		return IQSYSEventsFileRecordType.ERROR_INFORMATION;
	}
	
	
	/**
	 * Get the version.
	 * @return the version
	 */
	public getVersion(): string {
		return this.version;
	}
	
	/**
	 * Set the file id.
	 * @param the file id
	 */
	public setFileId(fileId: string) {
		this.fileId = fileId;
	}
	
	/**
	 * Get the file id.
	 * @return the file id
	 */
	public getFileId(): string {
		return this.fileId;
	}
	/**
	 * Set the file name.
	 * @param the file id
	 */
	public setFileName(fileName: string) {
		this.fileName = fileName;
	}
	
	/**
	 * Get the file name.
	 * @return the file id
	 */
	public getFileName(): string {
		return this.fileName;
	}
	/**
	 * Set the annotation class.
	 * @param the annotation class
	 */
	public setAnnotClass(annotClass: string) {
		this.annotClass = annotClass;
	}
	
	/**
	 * Get the annotation class.
	 * @return the annotation class
	 */
	public getAnnotClass(): string {
		return this.annotClass;
	}
	
	/**
	 * Set the statement line.
	 * @param the statement line
	 */
	public setStmtLine(stmtLine: string) {
		this.stmtLine = stmtLine;
	}
	
	/**
	 * Get the statement line.
	 * @return the statement line
	 */
	public getStmtLine(): string {
		return this.stmtLine;
	}
	
	/**
	 * Set the starting error line.
	 * @param the starting error line
	 */
	public setStartErrLine(startErrLine: string) {
		this.startErrLine = startErrLine;
	}
	
	/**
	 * Get the starting error line.
	 * @return the starting error line
	 */
	public getStartErrLine(): string {
		return this.startErrLine;
	}
	
	/**
	 * Set the starting error column.
	 * @param the starting error column
	 */
	public setTokenStart(tokenStart: string) {
		this.tokenStart = tokenStart;
	}
	
	/**
	 * Get the starting error column.
	 * @return the starting error column
	 */
	public getTokenStart(): string {
		return this.tokenStart;
	}
	
	/**
	 * Set the ending error line.
	 * @param the ending error line
	 */
	public setEndErrLine(endErrLine: string) {
		this.endErrLine = endErrLine;
	}
	
	/**
	 * Get the ending error line.
	 * @return the ending error line
	 */
	public getEndErrLine(): string {
		return this.endErrLine;
	}
	
	/**
	 * Set the ending error column.
	 * @param the ending error column
	 */
	public setTokenEnd(tokenEnd: string) {
		this.tokenEnd = tokenEnd;
	}
	
	/**
	 * Get the ending error column.
	 * @return the ending error column
	 */
	public getTokenEnd(): string {
		return this.tokenEnd;
	}
	
	/**
	 * Get the message id.
	 * @return the message id
	 */
	public getMsgId(): string {
		return this.msgId;
	}
	
	/**
	 * Get the severity code.
	 * @return the severity code
	 */
	public getSevChar(): string {
		return this.sevChar;
	}
	
	/**
	 * Get the severity level number.
	 * @return the severity level number
	 */
	public getSevNum(): string {
		return this.sevNum;
	}
	
	/**
	 * Set the length of the message.
	 * @param the length of the message
	 */
	public setLength(length: string) {
		this.length = length;
	}
	
	/**
	 * Get the length of the message.
	 * @return the length of the message
	 */
	public getLength(): string {
		return this.length;
	}
	
	/**
	 * Get the message.
	 * @return the message
	 */
	public getMsg(): string {
		return this.msg;
	}

	/* (non-Javadoc)
	 * @see java.lang.Object#toString()
	 */
	public toString(): string
	{
		return JSON.stringify(this);
	}
}