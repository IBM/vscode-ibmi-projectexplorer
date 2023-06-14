interface IMarkerCreator {

	createMarker(
			 record: QSYSEventsFileErrorInformationRecord, fileLocation: string,
			 isReadOnly: string) : void;

	/**
	 * If we encounter a connection name on the FILE
	 * Keeps track of whether this check has already been done in the field {@link #bDoneServerAliasCheck}
	 * @param location
	 * @param indexEndBracket
	 * 
	 * @return
	 */
	updateConnectionName(location: string,
			indexEndBracket: number): void;

}