import * as assert from 'assert';
import moment from 'moment';
import { getYesterday } from '../extension';

suite('Date Utility Tests', () => {
    test('Normal day: should return yesterday (subtract 1 day)', () => {
        // Example: use a reference date that is not Monday.
        // Let's use Wednesday, 2021-09-15.
        const reference = moment('2021-09-15');
        // Expected yesterday is Tuesday, 2021-09-14.
        const result = getYesterday(reference);
        assert.strictEqual(result, '2021-09-14');
    });

    test('Monday: should return previous Friday (subtract 3 days)', () => {
        // Example: use a reference date that is Monday.
        // Let's use Monday, 2021-09-13.
        const reference = moment('2021-09-13');
        // Expected previous Friday is 2021-09-10.
        const result = getYesterday(reference);
        assert.strictEqual(result, '2021-09-10');
    });
});
