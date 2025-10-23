import * as assert from 'assert';
import TimesheetParser from '../core/tempo/timesheet-parser';
import TempoFormatter from '../core/tempo/formatter';

suite('Timesheet Parser Tests', () => {
  test('should parse single ticket with hours', () => {
    const result = TimesheetParser.parseTimesheetLog('B2B-1079 2h');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.entries.length, 1);
    assert.strictEqual(result.entries[0].ticketKey, 'B2B-1079');
    assert.strictEqual(result.entries[0].timeSpentSeconds, 7200); // 2 hours = 7200 seconds
    assert.strictEqual(result.totalSeconds, 7200);
  });

  test('should parse multiple tickets', () => {
    const result = TimesheetParser.parseTimesheetLog('B2B-1079 2h, PROJECT-123 1.5h');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.entries.length, 2);
    assert.strictEqual(result.entries[0].ticketKey, 'B2B-1079');
    assert.strictEqual(result.entries[0].timeSpentSeconds, 7200);
    assert.strictEqual(result.entries[1].ticketKey, 'PROJECT-123');
    assert.strictEqual(result.entries[1].timeSpentSeconds, 5400); // 1.5 hours = 5400 seconds
    assert.strictEqual(result.totalSeconds, 12600);
  });

  test('should handle minutes format', () => {
    const result = TimesheetParser.parseTimesheetLog('TICKET-456 30m');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.entries.length, 1);
    assert.strictEqual(result.entries[0].timeSpentSeconds, 1800); // 30 minutes = 1800 seconds
  });

  test('should handle mixed hours and minutes', () => {
    const result = TimesheetParser.parseTimesheetLog('TICKET-789 1h 30m');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.entries.length, 1);
    assert.strictEqual(result.entries[0].timeSpentSeconds, 5400); // 1.5 hours = 5400 seconds
  });

  test('should handle invalid format', () => {
    const result = TimesheetParser.parseTimesheetLog('invalid format');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.entries.length, 0);
    assert.strictEqual(result.errors.length, 1);
  });

  test('should handle empty input', () => {
    const result = TimesheetParser.parseTimesheetLog('');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0], 'Empty timesheet log');
  });

  test('should format seconds back to time', () => {
    assert.strictEqual(TimesheetParser.formatSecondsToTime(7200), '2h');
    assert.strictEqual(TimesheetParser.formatSecondsToTime(5400), '1h 30m');
    assert.strictEqual(TimesheetParser.formatSecondsToTime(1800), '30m');
    assert.strictEqual(TimesheetParser.formatSecondsToTime(0), '0m');
  });

  test('should validate entry formats', () => {
    assert.strictEqual(TimesheetParser.validateEntry('B2B-1079 2h'), true);
    assert.strictEqual(TimesheetParser.validateEntry('PROJECT-123 1.5h'), true);
    assert.strictEqual(TimesheetParser.validateEntry('TICKET-456 30m'), true);
    assert.strictEqual(TimesheetParser.validateEntry('invalid format'), false);
  });
});

suite('Tempo Formatter Timesheet Tests', () => {
  test('should format timesheet log summary', () => {
    const formatter = new TempoFormatter();
    const result = formatter.formatTimesheetLog('B2B-1079 2h, PROJECT-123 1.5h');
    
    assert.strictEqual(result.includes('📋 **Timesheet Log Summary**'), true);
    assert.strictEqual(result.includes('B2B-1079: 2h'), true);
    assert.strictEqual(result.includes('PROJECT-123: 1h 30m'), true);
    assert.strictEqual(result.includes('**Total Time:** 3h 30m'), true);
  });

  test('should handle invalid timesheet format', () => {
    const formatter = new TempoFormatter();
    const result = formatter.formatTimesheetLog('invalid format');
    
    assert.strictEqual(result.includes('❌ Invalid timesheet format'), true);
    assert.strictEqual(result.includes('Expected format examples'), true);
  });

  test('should convert timesheet to worklogs', () => {
    const formatter = new TempoFormatter();
    const worklogs = formatter.convertTimesheetToWorklogs('B2B-1079 2h, PROJECT-123 1.5h', '2024-01-15');
    
    assert.strictEqual(worklogs.length, 2);
    assert.strictEqual(worklogs[0].issue.key, 'B2B-1079');
    assert.strictEqual(worklogs[0].timeSpentSeconds, 7200);
    assert.strictEqual(worklogs[0].startDate, '2024-01-15');
    assert.strictEqual(worklogs[1].issue.key, 'PROJECT-123');
    assert.strictEqual(worklogs[1].timeSpentSeconds, 5400);
  });
});