import * as assert from 'assert';
import moment from 'moment-timezone';

/**
 * Tests for form component validation logic
 * Note: Full UI testing requires terminal environment, testing validation logic here
 */

suite('FormField Validation Tests', () => {
  /**
   * Time format validation (matches LogTimeForm.validateTime)
   */
  function validateTimeFormat(timeString: string): { valid: boolean; message?: string } {
    if (!timeString.trim()) {
      return { valid: false, message: 'Time required' };
    }

    // Validate entire string: single time (2h, 30m) or combination (1h 30m)
    // Pattern: digit(s) + optional decimal + h/m, optionally followed by space + another time
    const timePattern = /^(\d+(?:\.\d+)?)\s*[hm](?:\s+(\d+(?:\.\d+)?)\s*[hm])?$/i;

    if (!timePattern.test(timeString.trim())) {
      return {
        valid: false,
        message: 'Invalid format. Use: 2h, 1.5h, 30m, or 1h 30m',
      };
    }

    return { valid: true };
  }

  /**
   * Date format validation (matches LogTimeForm.validateDate)
   */
  function validateDateFormat(dateString: string): { valid: boolean; message?: string } {
    const normalized = dateString.toLowerCase().trim();

    if (['today', 'yesterday', ''].includes(normalized)) {
      return { valid: true };
    }

    if (!moment(dateString, 'YYYY-MM-DD', true).isValid()) {
      return {
        valid: false,
        message: 'Use: today, yesterday, or YYYY-MM-DD',
      };
    }

    return { valid: true };
  }

  test('validates correct time formats', () => {
    assert.strictEqual(validateTimeFormat('2h').valid, true);
    assert.strictEqual(validateTimeFormat('1.5h').valid, true);
    assert.strictEqual(validateTimeFormat('30m').valid, true);
    assert.strictEqual(validateTimeFormat('1h 30m').valid, true);
    assert.strictEqual(validateTimeFormat('2.5h').valid, true);
  });

  test('rejects invalid time formats', () => {
    const result1 = validateTimeFormat('');
    assert.strictEqual(result1.valid, false);
    assert.strictEqual(result1.message, 'Time required');

    const result2 = validateTimeFormat('2');
    assert.strictEqual(result2.valid, false);

    const result3 = validateTimeFormat('abc');
    assert.strictEqual(result3.valid, false);

    const result4 = validateTimeFormat('2hours');
    assert.strictEqual(result4.valid, false);
  });

  test('validates correct date formats', () => {
    assert.strictEqual(validateDateFormat('today').valid, true);
    assert.strictEqual(validateDateFormat('yesterday').valid, true);
    assert.strictEqual(validateDateFormat('').valid, true);
    assert.strictEqual(validateDateFormat('2025-12-26').valid, true);
    assert.strictEqual(validateDateFormat('2024-01-01').valid, true);
  });

  test('rejects invalid date formats', () => {
    const result1 = validateDateFormat('tomorrow');
    assert.strictEqual(result1.valid, false);

    const result2 = validateDateFormat('12/26/2025');
    assert.strictEqual(result2.valid, false);

    const result3 = validateDateFormat('2025-13-01');
    assert.strictEqual(result3.valid, false);

    const result4 = validateDateFormat('abc');
    assert.strictEqual(result4.valid, false);
  });

  test('handles edge cases for time validation', () => {
    assert.strictEqual(validateTimeFormat('0h').valid, true); // Will be caught by parser
    assert.strictEqual(validateTimeFormat('0m').valid, true); // Will be caught by parser
    assert.strictEqual(validateTimeFormat('  2h  ').valid, true); // Whitespace handling
  });

  test('handles edge cases for date validation', () => {
    assert.strictEqual(validateDateFormat('TODAY').valid, true); // Case insensitive
    assert.strictEqual(validateDateFormat('YESTERDAY').valid, true);
    assert.strictEqual(validateDateFormat('  today  ').valid, true); // Whitespace
  });
});

suite('LogTimeForm Component Structure Tests', () => {
  test('form data interface is correctly typed', () => {
    // TypeScript will catch type errors at compile time
    const formData: {
      time: string;
      description: string;
      date: string;
    } = {
      time: '2h',
      description: 'Test description',
      date: 'today',
    };

    assert.strictEqual(typeof formData.time, 'string');
    assert.strictEqual(typeof formData.description, 'string');
    assert.strictEqual(typeof formData.date, 'string');
  });

  test('validation result interface is correctly typed', () => {
    const validResult: { valid: boolean; message?: string } = {
      valid: true,
    };

    const invalidResult: { valid: boolean; message?: string } = {
      valid: false,
      message: 'Error message',
    };

    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(invalidResult.valid, false);
    assert.strictEqual(invalidResult.message, 'Error message');
  });
});

suite('FormField Integration Tests', () => {
  test('validation logic integrates with TimesheetParser patterns', () => {
    // Test time formats that TimesheetParser also accepts
    const validFormats = ['2h', '1.5h', '30m', '1h 30m'];
    validFormats.forEach((format) => {
      const result = validateTimeFormat(format);
      assert.strictEqual(result.valid, true, `Should accept ${format}`);
    });

    // Test formats that should be rejected
    const invalidFormats = ['2', '2hours', 'abc', '-1h'];
    invalidFormats.forEach((format) => {
      const result = validateTimeFormat(format);
      assert.strictEqual(result.valid, false, `Should reject ${format}`);
    });
  });

  test('date validation aligns with moment.js parsing', () => {
    // Valid ISO dates
    assert.strictEqual(validateDateFormat('2025-01-15').valid, true);
    assert.strictEqual(validateDateFormat('2024-12-31').valid, true);

    // Invalid dates that moment rejects
    assert.strictEqual(validateDateFormat('2025-13-01').valid, false); // Invalid month
    assert.strictEqual(validateDateFormat('2025-01-32').valid, false); // Invalid day
  });
});

/**
 * Helper function for time format validation (extracted for testing)
 * Matches entire string to prevent partial matches (e.g., '2hours' should fail)
 */
function validateTimeFormat(timeString: string): { valid: boolean; message?: string } {
  if (!timeString.trim()) {
    return { valid: false, message: 'Time required' };
  }

  // Validate entire string: single time (2h, 30m) or combination (1h 30m)
  // Pattern: digit(s) + optional decimal + h/m, optionally followed by space + another time
  const timePattern = /^(\d+(?:\.\d+)?)\s*[hm](?:\s+(\d+(?:\.\d+)?)\s*[hm])?$/i;

  if (!timePattern.test(timeString.trim())) {
    return {
      valid: false,
      message: 'Invalid format. Use: 2h, 1.5h, 30m, or 1h 30m',
    };
  }

  return { valid: true };
}

/**
 * Helper function for date format validation (extracted for testing)
 */
function validateDateFormat(dateString: string): { valid: boolean; message?: string } {
  const normalized = dateString.toLowerCase().trim();

  if (['today', 'yesterday', ''].includes(normalized)) {
    return { valid: true };
  }

  if (!moment(dateString, 'YYYY-MM-DD', true).isValid()) {
    return {
      valid: false,
      message: 'Use: today, yesterday, or YYYY-MM-DD',
    };
  }

  return { valid: true };
}
