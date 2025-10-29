/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Characters allowed in short link codes
 * Includes digits (0-9) and letters (a-z, A-Z)
 * Total: 62 possible characters
 */
const ALLOWED_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Length of the generated short code
 */
const CODE_LENGTH = 7;

/**
 * Generate a random short code for public dispute resolution links
 * 
 * The code is composed of 7 random characters from:
 * - Digits: 0-9
 * - Lowercase letters: a-z
 * - Uppercase letters: A-Z
 * 
 * This provides approximately 62^7 = 3.5 trillion possible combinations,
 * making collisions extremely unlikely.
 * 
 * @returns A 7-character random code
 * 
 * @example
 * ```typescript
 * const code = generateShortCode();
 * console.log(code); // e.g., "aBc1234"
 * ```
 */
export function generateShortCode(): string {
    let code = '';

    // Use crypto.getRandomValues for secure random generation if available
    // Otherwise fall back to Math.random()
    try {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const randomValues = new Uint8Array(CODE_LENGTH);
            crypto.getRandomValues(randomValues);

            for (let i = 0; i < CODE_LENGTH; i++) {
                // Use modulo to ensure index is within the allowed characters range
                const index = randomValues[i] % ALLOWED_CHARS.length;
                code += ALLOWED_CHARS[index];
            }
        } else {
            // Fallback for environments without crypto API
            for (let i = 0; i < CODE_LENGTH; i++) {
                const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
                code += ALLOWED_CHARS[randomIndex];
            }
        }
    } catch {
        // If crypto fails, use Math.random()
        for (let i = 0; i < CODE_LENGTH; i++) {
            const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
            code += ALLOWED_CHARS[randomIndex];
        }
    }

    return code;
}

/**
 * Validate that a code matches the expected format for short links
 * 
 * A valid code must:
 * - Be exactly 7 characters long
 * - Contain only allowed characters (0-9, a-z, A-Z)
 * 
 * @param code The code to validate
 * @returns true if the code is valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateShortCode('aBc1234');  // true
 * validateShortCode('invalid');  // false
 * validateShortCode('ab');       // false
 * ```
 */
export function validateShortCode(code: string): boolean {
    // Check if code is exactly 7 characters long
    if (code.length !== CODE_LENGTH) {
        return false;
    }

    // Check if all characters are in the allowed set
    for (const char of code) {
        if (!ALLOWED_CHARS.includes(char)) {
            return false;
        }
    }

    return true;
}
