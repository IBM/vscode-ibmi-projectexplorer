/*
 * (c) Copyright IBM Corp. 2024
 */

/**
 * Project explorer utilities.
 */
export namespace util {
  /**
   * The escapeQuoted function takes in a string as an argument and returns a
   * new string with any leading and trailing double quotes escaped with a backslash.
   * 
   * @param input The string to escape quotes in. 
   * @returns A new string with any leading and trailing double quotes escaped
   * with a backslash.
   * 
   * Exceptions and Edge Cases:
   * If the input string contains unescaped double quotes, they will be escaped even
   * if they are not at the beginning or end of the string. For example, the input
   * string "hello" would be escaped to \\"hello\\".
   */
  export function escapeQuoted(input: string): string {
    if (isQuoted(input)) {
      return '\\' + input.substring(0, input.length - 1) + '\\"';
    }

    return input;
  }

  /**
   * Calls the `escapeQuoted` function on each string in an array and returns
   * a new array with strings with any leading and trailing double quotes escaped
   * with a backslash.
   * 
   * @param oldArray The array of strings to escape.
   * @returns An array of new strings with any leading and trailing double quotes
   * escaped with a backslash.
   */
  export function escapeArray(oldArray: string[]): string[] {
    return oldArray.map(function (e) {
      return escapeQuoted(e);
    });
  }

  /**
   * Checks if a string starts and ends with backslash-escaped double quotes.
   * 
   * @param value The string to check.
   * @returns Returns true if the string starts and ends with backslash-escaped
   * double quotes, false otherwise.
   *
   * Exceptions and Edge Cases:
   * If the input string is not a valid string, the function may throw a TypeError or similar. 
   */
  export function isEscapeQuoted(value: string): boolean {
    return (value.startsWith('\\"') && value.endsWith('\\"') && value.length >= 4);
  }

  /**
   * Checks if a string starts and ends with double quotes.
   * 
   * @param value The string to check.
   * @returns Returns true if the string starts and ends with double quotes, false otherwise.
   *
   * Exceptions and Edge Cases:
   * If the input string is not a valid string, the function may throw a TypeError or similar. 
   */
  export function isQuoted(value: string): boolean {
    return (value.startsWith('\"') && value.endsWith('\"'));
  }

  /**
   * Strips any leading and trailing double quotes escaped with a backslash.
   * 
   * @param value The string to strip.
   * @returns A new string with any leading and trailing double quotes escaped with a backslash removed.
   * 
   * Exceptions and Edge Cases:
   * If the input string is not a valid string, the function may throw a TypeError or similar. 
   */
  export function stripEscapeFromQuotes(value: string): string {
    if (isEscapeQuoted(value)) {
      return '"' + value.substring(2, value.length - 2) + '"';
    } else {
      return value;
    }
  }
}