/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2021
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 

/**
 * This class represents a Error Information record in an events file.
 */
public class QSYSEventsFileErrorInformationRecord implements EvfeventRecord {

	
	private String version;
	private String fileId;
	private String annotClass;
	private String stmtLine;
	private String startErrLine;
	private String tokenStart;
	private String endErrLine;
	private String tokenEnd;
	private String msgId;
	private String sevChar;
	private String sevNum;
	private String length;
	private String msg;

	// source file name corresponding to file id - is computed later
	private String fileName;

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	getRecordType(): string {
		return IQSYSEventsFileRecordType.ERROR_INFORMATION;
	}
	
	/**
	 * Set the version.
	 * @param the version
	 */
	public void setVersion(String version) {
		this.version = version;
	}
	
	/**
	 * Get the version.
	 * @return the version
	 */
	public String getVersion() {
		return version;
	}
	
	/**
	 * Set the file id.
	 * @param the file id
	 */
	public void setFileId(String fileId) {
		this.fileId = fileId;
	}
	
	/**
	 * Get the file id.
	 * @return the file id
	 */
	public String getFileId() {
		return fileId;
	}
	/**
	 * Set the file name.
	 * @param the file id
	 */
	public void setFileName(String fileName) {
		this.fileName = fileName;
	}
	
	/**
	 * Get the file name.
	 * @return the file id
	 */
	public String getFileName() {
		return fileName;
	}
	/**
	 * Set the annotation class.
	 * @param the annotation class
	 */
	public void setAnnotClass(String annotClass) {
		this.annotClass = annotClass;
	}
	
	/**
	 * Get the annotation class.
	 * @return the annotation class
	 */
	public String getAnnotClass() {
		return annotClass;
	}
	
	/**
	 * Set the statement line.
	 * @param the statement line
	 */
	public void setStmtLine(String stmtLine) {
		this.stmtLine = stmtLine;
	}
	
	/**
	 * Get the statement line.
	 * @return the statement line
	 */
	public String getStmtLine() {
		return stmtLine;
	}
	
	/**
	 * Set the starting error line.
	 * @param the starting error line
	 */
	public void setStartErrLine(String startErrLine) {
		this.startErrLine = startErrLine;
	}
	
	/**
	 * Get the starting error line.
	 * @return the starting error line
	 */
	public String getStartErrLine() {
		return startErrLine;
	}
	
	/**
	 * Set the starting error column.
	 * @param the starting error column
	 */
	public void setTokenStart(String tokenStart) {
		this.tokenStart = tokenStart;
	}
	
	/**
	 * Get the starting error column.
	 * @return the starting error column
	 */
	public String getTokenStart() {
		return tokenStart;
	}
	
	/**
	 * Set the ending error line.
	 * @param the ending error line
	 */
	public void setEndErrLine(String endErrLine) {
		this.endErrLine = endErrLine;
	}
	
	/**
	 * Get the ending error line.
	 * @return the ending error line
	 */
	public String getEndErrLine() {
		return endErrLine;
	}
	
	/**
	 * Set the ending error column.
	 * @param the ending error column
	 */
	public void setTokenEnd(String tokenEnd) {
		this.tokenEnd = tokenEnd;
	}
	
	/**
	 * Get the ending error column.
	 * @return the ending error column
	 */
	public String getTokenEnd() {
		return tokenEnd;
	}
	
	/**
	 * Set the message id.
	 * @param the message id
	 */
	public void setMsgId(String msgId) {
		this.msgId = msgId;
	}
	
	/**
	 * Get the message id.
	 * @return the message id
	 */
	public String getMsgId() {
		return msgId;
	}
	
	/**
	 * Set the severity code.
	 * @param the severity code
	 */
	public void setSevChar(String sevChar) {
		this.sevChar = sevChar;
	}
	
	/**
	 * Get the severity code.
	 * @return the severity code
	 */
	public String getSevChar() {
		return sevChar;
	}
	
	/**
	 * Set the severity level number.
	 * @param the severity level number
	 */
	public void setSevNum(String sevNum) {
		this.sevNum = sevNum;
	}
	
	/**
	 * Get the severity level number.
	 * @return the severity level number
	 */
	public String getSevNum() {
		return sevNum;
	}
	
	/**
	 * Set the length of the message.
	 * @param the length of the message
	 */
	public void setLength(String length) {
		this.length = length;
	}
	
	/**
	 * Get the length of the message.
	 * @return the length of the message
	 */
	public String getLength() {
		return length;
	}
	
	/**
	 * Set the message.
	 * @param the message
	 */
	public void setMsg(String msg) {
		this.msg = msg;
	}
	
	/**
	 * Get the message.
	 * @return the message
	 */
	public String getMsg() {
		return msg;
	}

	/* (non-Javadoc)
	 * @see java.lang.Object#toString()
	 */
	public String toString()
	{
		StringBuffer buffer = new StringBuffer();
		buffer.append(ERROR_INFORMATION);
		buffer.append("      ");
		buffer.append(version);
		buffer.append(" ");
		buffer.append(fileId);
		buffer.append(" ");
		buffer.append(annotClass);
		buffer.append(" ");
		buffer.append(stmtLine);
		buffer.append(" ");
		buffer.append(startErrLine);
		buffer.append(" ");
		buffer.append(tokenStart);
		buffer.append(" ");
		buffer.append(endErrLine);
		buffer.append(" ");
		buffer.append(tokenEnd);
		buffer.append(" ");
		buffer.append(msgId);
		buffer.append(" ");
		buffer.append(sevChar);
		buffer.append(" ");
		buffer.append(sevNum);
		buffer.append(" ");
		buffer.append(length);
		buffer.append(" ");
		buffer.append(msg);
		return buffer.toString();
	}
	/* (non-Javadoc)
	 * @see java.lang.Object#toString()
	 */
	public String toJUnitString()
	{
		StringBuffer buffer = new StringBuffer();
		buffer.append(ERROR_INFORMATION);
		buffer.append("      ");
		buffer.append(version);
		buffer.append(" ");
		buffer.append(fileName);
		buffer.append(" ");
		buffer.append(annotClass);
		buffer.append(" ");
		buffer.append(stmtLine);
		buffer.append(" ");
		buffer.append(startErrLine);
		buffer.append(" ");
		buffer.append(tokenStart);
		buffer.append(" ");
		buffer.append(endErrLine);
		buffer.append(" ");
		buffer.append(tokenEnd);
		buffer.append(" ");
		buffer.append(msgId);
		buffer.append(" ");
		buffer.append(sevChar);
		buffer.append(" ");
		buffer.append(sevNum);
		buffer.append(" ");
		buffer.append(length);
		buffer.append(" ");
		buffer.append(msg);
		return buffer.toString();
	}
}