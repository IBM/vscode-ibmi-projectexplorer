class SourceFile{
    private location: string;
    private browseMode: boolean;

    constructor(location: string, browseMode: boolean){
        this.location = location;
        this.browseMode = browseMode;
    }

    public getLocation(): string
		{
			return this.location;
		}
		
	public isReadOnly(): string
		{
			return this.browseMode.toString();
		}
		// a member should be opened in Browse Mode
		public setReadOnly(value: boolean)
		{
			this.browseMode = value;
		}
}