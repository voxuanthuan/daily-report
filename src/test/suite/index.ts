import * as assert from 'assert';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Command Registration', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('jiraDailyReport.generate'));
  });
});
