
/**
 * (c) Copyright IBM Corp 2004
 *  Iterates through a sequential file and provides one line at a time
 */
interface ISequentialFileReader 
{
	/**
	 * @return String the next line 
	 * @see ReaderLineScanner  
	 * @exception IOException if there is any problem reading 
	 **/
	readNextLine(): string;

} // ISequentialFileReader