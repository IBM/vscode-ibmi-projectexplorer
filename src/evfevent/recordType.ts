/**
 * (C) Copyright IBM Corp. 2003  All Rights Reserved.
 * This interface should be implemented by all classes that represent
 * records in an events file.
 */
enum IQSYSEventsFileRecordType {
 TIMESTAMP = "TIMESTAMP",
 PROCESSOR = "PROCESSOR",
 FILE_ID = "FILEID",
 FILE_CONT = "FILEIDCONT",
 FILE_END = "FILEEND",
 ERROR_INFORMATION = "ERROR",
 PROGRAM = "PROGRAM",
 MAP_DEFINE = "MAPDEFINE",
 MAP_START = "MAPSTART",
 MAP_END = "MAPEND",
 FEEDBACK_CODE = "FEEDBACK",
 EXPANSION = "EXPANSION"
}