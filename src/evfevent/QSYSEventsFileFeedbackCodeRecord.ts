/* IBM Confidential
 * OCO Source Materials
 * 5900-AN9
 * (c) Copyright IBM Corp. 2003, 2023
 * The source code for this program is not published or otherwise divested of its trade secrets,
 * irrespective of what has been deposited with the U.S. Copyright Office.
 *
 */ 


/**
 * This class represents a Feedback Code record in an events file.
 */
class QSYSEventsFileFeedbackCodeRecord implements EvfeventRecord {

   public Copyright = "(C) Copyright IBM Corp. 2003  All Rights Reserved.";

	
	private returnCode: string;
	private reasonCode: string;

	constructor(returnCode: string, reasonCode: string){
		this.returnCode = returnCode;
		this.reasonCode = reasonCode;
	}

	/**
	 * @see com.ibm.etools.iseries.core.evfparser.IISeriesEventsFileRecordType#getRecordType()
	 */
	public getRecordType(): string {
		return IQSYSEventsFileRecordType.FEEDBACK_CODE;
	}
	
	/**
	 * Set the return code.
	 * @param the return code
	 */
	public setReturnCode(returnCode: string) {
		this.returnCode = returnCode;
	}
	
	/**
	 * Get the return code.
	 * @return the return code
	 */
	public getReturnCode(): string {
		return this.returnCode;
	}
	
	/**
	 * Set the reason code.
	 * @param the reason code
	 */
	public setReasonCode(reasonCode: string) {
		this.reasonCode = reasonCode;
	}
	
	/**
	 * Get the reason code.
	 * @return the reason code
	 */
	public getReasonCode(): string {
		return this.reasonCode;
	}
}