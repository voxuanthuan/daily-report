import * as assert from 'assert';
import JiraCommandParser from '../components/jira-command-parser';

suite('Jira Command Parser Tests', () => {
  test('should parse time and status command', () => {
    const result = JiraCommandParser.parseCommand('B2B-1079 #time 2h #under-review');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.ticketKey, 'B2B-1079');
    assert.strictEqual(result.timeEntry?.timeSpentSeconds, 7200); // 2 hours
    assert.strictEqual(result.timeEntry?.timeString, '2h');
    assert.strictEqual(result.statusChange?.newStatus, 'Under Review');
  });

  test('should parse time only command', () => {
    const result = JiraCommandParser.parseCommand('PROJECT-123 #time 1.5h');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.ticketKey, 'PROJECT-123');
    assert.strictEqual(result.timeEntry?.timeSpentSeconds, 5400); // 1.5 hours
    assert.strictEqual(result.statusChange, undefined);
  });

  test('should parse status only command', () => {
    const result = JiraCommandParser.parseCommand('TASK-456 #in-progress');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.ticketKey, 'TASK-456');
    assert.strictEqual(result.timeEntry, undefined);
    assert.strictEqual(result.statusChange?.newStatus, 'In Progress');
  });

  test('should handle status aliases', () => {
    const result = JiraCommandParser.parseCommand('B2B-1079 #dev');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.statusChange?.newStatus, 'Selected for Development');
  });

  test('should handle order independence', () => {
    const result = JiraCommandParser.parseCommand('#time 2h B2B-1079 #review');
    
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.ticketKey, 'B2B-1079');
    assert.strictEqual(result.timeEntry?.timeSpentSeconds, 7200);
    assert.strictEqual(result.statusChange?.newStatus, 'Under Review');
  });

  test('should handle invalid ticket format', () => {
    const result = JiraCommandParser.parseCommand('invalid-ticket #time 2h');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].includes('No valid ticket key found'), true);
  });

  test('should handle invalid time format', () => {
    const result = JiraCommandParser.parseCommand('B2B-1079 #time invalid');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.some(e => e.includes('Invalid time format')), true);
  });

  test('should handle unknown status', () => {
    const result = JiraCommandParser.parseCommand('B2B-1079 #unknown-status');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.some(e => e.includes('Unknown status')), true);
  });

  test('should handle empty command', () => {
    const result = JiraCommandParser.parseCommand('');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors[0], 'Command cannot be empty');
  });

  test('should handle command without hashtags', () => {
    const result = JiraCommandParser.parseCommand('B2B-1079 do something');
    
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.some(e => e.includes('No hashtags found')), true);
  });

  test('should get available statuses', () => {
    const statuses = JiraCommandParser.getAvailableStatuses();
    
    assert.strictEqual(Array.isArray(statuses), true);
    assert.strictEqual(statuses.includes('open'), true);
    assert.strictEqual(statuses.includes('in-progress'), true);
    assert.strictEqual(statuses.includes('under-review'), true);
  });

  test('should get example commands', () => {
    const examples = JiraCommandParser.getExampleCommands();
    
    assert.strictEqual(Array.isArray(examples), true);
    assert.strictEqual(examples.length > 0, true);
    assert.strictEqual(examples.some(ex => ex.includes('#time')), true);
  });

  test('should generate help text', () => {
    const help = JiraCommandParser.getHelpText();
    
    assert.strictEqual(typeof help, 'string');
    assert.strictEqual(help.includes('Jira Command Syntax'), true);
    assert.strictEqual(help.includes('Examples:'), true);
    assert.strictEqual(help.includes('Available statuses:'), true);
  });
});