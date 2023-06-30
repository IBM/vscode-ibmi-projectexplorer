/**
	 * Class used as a container of the file ID and the number of lines processed so far.
	 */
class FileIDLinesPair
{
    private _ID: string;
    private _lines: number;
    
    constructor(ID: string)
    {
        this._ID = ID;
        this._lines = 0;
    }
    
    public getID(): string
    {
        return this._ID;
    }
    
    public getLinesProcessed(): number
    {
        return this._lines;
    }
    
    public increaseLinesProcessed(amount: number)
    {
        this._lines += amount;
    }
}