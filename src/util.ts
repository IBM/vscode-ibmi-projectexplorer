/*
 * (c) Copyright IBM Corp. 2024
 */
/**
 * The escQuoted function takes in a string as an argument and 
 * returns a new string with any leading and trailing 
 * double quotes escaped with a backslash.
 * 
 * @param input : string - The string to escape quotes in. 
 * 
 * @returnS A new string with any leading and trailing
 *         double quotes escaped with a backslash.
 * 
 * Exceptions and Edge Cases
 * If the input string contains unescaped double quotes, they will be escaped 
 * even if they are not at the beginning or end of the string. 
 * For example, the input string "hello" would be escaped to \\"hello\\".
 */
export function escapeQuoted(input: string): string
{
    if(isQuoted(input)) {
        return '\\'+input.substring(0,input.length-1)+'\\"';
    }
    return input;
}
/**
 * Checks if a string starts and ends with backslash-escaped double quotes.
 * 
 * @param value The string to check.
 * 
 * @returns Returns true if the string starts and ends with 
 *          backslash-escaped double quotes, false otherwise.
 *
 * Exceptions and Edge Cases
 * If the input string is not a valid string, the function may throw a TypeError or similar. 
   */
export function escapeArray(oldArray: string[]): string[] {
    var newArray = oldArray.map(function (e) {
      e = escapeQuoted(e);
      return e;
    });
    return newArray;
  }
  export function isEscapeQuoted(value: string): boolean {
    return  (value.startsWith('\\"') && value.endsWith('\\"') && value.length >= 4);
  }
  /**
   * Checks if a string starts and ends with double quotes.
   * 
   * @param value The string to check.
   * 
   * @returns Returns true if the string starts and ends with double quotes, false otherwise.
   *
   * Exceptions and Edge Cases
   * If the input string is not a valid string, the function may throw a TypeError or similar. 
   */
  export function isQuoted(value: string): boolean {
    return  (value.startsWith('\"') && value.endsWith('\"'));
  }
  export function stripEscapeFromQuotes(value: string): string {
    if(isEscapeQuoted(value)) {
        return  '"'+value.substring(2,value.length-2)+'"';
    } else {
        return value;
    }
  } 