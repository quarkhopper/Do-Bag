/**
 * Utility function to mark a variable as intentionally unused
 * without triggering TypeScript unused variable warnings.
 * 
 * @example
 * // Instead of: 
 * function example(requiredParam, unusedParam) { 
 *   // unusedParam is never used but required in the signature
 * }
 * 
 * // Do this:
 * function example(requiredParam, unusedParam) {
 *   markAsUsed(unusedParam);
 *   // function implementation
 * }
 */
export function markAsUsed(variable: any): void {
  // Do nothing with the variable, just mark it as "used"
  if (false) {
    console.log(variable);
  }
}

/**
 * This symbol can be used to annotate intentionally unused parameters
 * when you only want to extract some properties from an object
 * 
 * @example
 * const { name, age, ..._unused } = person;
 */
export const _unused = Symbol('unused'); 