import * as assert from 'assert';
import TempoWorklogCreator from '../core/tempo/worklog-creator';

suite('Tempo Worklog Creator Tests', () => {
  const mockAccountId = 'test-account-id';
  let creator: TempoWorklogCreator;

  setup(() => {
    creator = new TempoWorklogCreator(mockAccountId);
  });

  test('should get today date in correct format', () => {
    const today = creator.getTodayDate();
    assert.strictEqual(typeof today, 'string');
    assert.strictEqual(today.length, 10); // YYYY-MM-DD format
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('should get yesterday date in correct format', () => {
    const yesterday = creator.getYesterdayDate();
    assert.strictEqual(typeof yesterday, 'string');
    assert.strictEqual(yesterday.length, 10); // YYYY-MM-DD format
    assert.match(yesterday, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('should format results correctly', () => {
    const mockResults = [
      { success: true, ticketKey: 'B2B-1079', timeSpent: '2h', worklogId: 123 },
      { success: false, ticketKey: 'PROJECT-456', timeSpent: '1h', error: 'Ticket not found' }
    ];

    const formatted = creator.formatResults(mockResults);
    
    assert.strictEqual(formatted.includes('✅ **Successfully Created:**'), true);
    assert.strictEqual(formatted.includes('B2B-1079: 2h'), true);
    assert.strictEqual(formatted.includes('❌ **Failed to Create:**'), true);
    assert.strictEqual(formatted.includes('PROJECT-456: 1h - Ticket not found'), true);
    assert.strictEqual(formatted.includes('**Success Rate:** 1/2 (50%)'), true);
  });

  test('should handle empty results', () => {
    const mockResults: any[] = [];
    const formatted = creator.formatResults(mockResults);
    
    assert.strictEqual(formatted.includes('**Total Time:** 0m'), true);
    assert.strictEqual(formatted.includes('**Success Rate:** 0/0 (NaN%)'), true);
  });

  test('should handle all successful results', () => {
    const mockResults = [
      { success: true, ticketKey: 'B2B-1079', timeSpent: '2h', worklogId: 123 },
      { success: true, ticketKey: 'PROJECT-456', timeSpent: '1h', worklogId: 124 }
    ];

    const formatted = creator.formatResults(mockResults);
    
    assert.strictEqual(formatted.includes('✅ **Successfully Created:**'), true);
    assert.strictEqual(formatted.includes('❌ **Failed to Create:**'), false);
    assert.strictEqual(formatted.includes('**Success Rate:** 2/2 (100%)'), true);
  });

  test('should create TempoWorklogCreator instance with valid account ID', () => {
    assert.strictEqual(typeof creator, 'object');
    assert.strictEqual(creator.constructor.name, 'TempoWorklogCreator');
  });
});