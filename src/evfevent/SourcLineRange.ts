/**
	 * Class used as a container of line numbers and file IDs for each range
	 * of lines in the map.
	 */
class SourceLineRange
	{
		// Input File Info
		private _inputStartLine = 0;
		private _inputEndLine = -1;
		private _inputFileID: string | undefined;
		
		// Output File Info
		private _outputStartLine = 0;
		private _outputEndLine = -1;

        constructor(copy?: SourceLineRange){
            if(typeof copy !== 'undefined'){
                this._inputStartLine = copy.getInputStartLine();
                this._inputEndLine = copy.getInputEndLine();
                this._inputFileID = copy.getInputFileID();
                this._outputStartLine = copy.getOutputStartLine();
                this._outputEndLine = copy.getOutputEndLine();
            }
        }
		
		public getInputEndLine(): number
		{
			return this._inputEndLine;
		}

		public setInputEndLine(endLine: number)
		{
			this._inputEndLine = endLine;
		}

		public getInputFileID(): string | undefined
		{
			return this._inputFileID;
		}

		public setInputFileID(fileID: string)
		{
			this._inputFileID = fileID;
		}

		public getInputStartLine(): number
		{
			return this._inputStartLine;
		}

		public setInputStartLine(startLine: number)
		{
			this._inputStartLine = startLine;
		}

		public getOutputEndLine(): number
		{
			return this._outputEndLine;
		}

		public setOutputEndLine(endLine: number)
		{
			this._outputEndLine = endLine;
		}
		
		public getOutputStartLine(): number
		{
			return this._outputStartLine;
		}
		
		public setOutputStartLine(startLine: number)
		{
			this._outputStartLine = startLine;
		}
		
		/**
		 * Shifts the output file start and end lines by a certain amount.
		 * If the end line is -1, no need to change it.
		 * @param amount by which the line numbers need to be shifted
		 */
		public shiftOutputLines(amount: number)
		{
			this._outputStartLine += amount;
			if(this._outputEndLine > 0){
                this._outputEndLine += amount;
            }
		}
		
		/**
		 * Checks if the output file line number is present in this container.
		 * @param line the line number to be checked
		 * @return <code>true</code>, if the line is present in the range. <code>false</code> otherwise.
		 */
		public containsOutputLine(line: number): boolean
		{
			if(this._outputEndLine === -1){
                return line >= this._outputStartLine;
            }
			
			return line >= this._outputStartLine && line <= this._outputEndLine;
		}
		
		/**
		 * Checks if the input file line number is present in this container.
		 * @param line the line number to be checked
		 * @param ID of the input file that contains the line
		 * @return <code>true</code>, if the line is present in the range. <code>false</code> otherwise.
		 */
		public containsInputLine(line: number, ID: string): boolean
		{
			if(this._inputEndLine === -1){
                return line >= this._inputStartLine && ID === (this._inputFileID);
            }
			
			return line >= this._inputStartLine && line <= this._inputEndLine && ID === (this._inputFileID);
		}
		
		/**
		 * A helper method to compute the input file end line number based on the other line numbers.
		 */
		public fixInputRangeBasedOnOutputRange()
		{
			this._inputEndLine = this._outputEndLine - this._outputStartLine + this._inputStartLine;
		}
		
		/**
		 * A helper method to compute the output file end line number based on the other line numbers.
		 */
		public fixOutputRangeBasedOnInputRange()
		{
			this._outputEndLine = this._inputEndLine - this._inputStartLine + this._outputStartLine;
		}
		
		// @Override
		// public toString() {
		// 	return "SourceLineRange: "+this._inputFileID+" in:"+this._inputStartLine+"->"+this._inputEndLine+" out:"+this._outputStartLine+"->"+this._outputEndLine;
		// }
	}