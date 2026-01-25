import assert from 'assert';
import { buildHtmlReport } from './report-builder';

// Simple test runner since we don't have a full test suite setup
console.log('Running tests for ReportBuilder...');
try {
  const input = `Hi everyone,
Yesterday
  - PROJ-123: Fix login
    - Investigated issue
    - Fixed NPE
  - PROJ-456: Update docs

Today
  - PROJ-789: New feature

No blockers
`;

  const html = buildHtmlReport(input);

  if (!html.includes('<p>Hi everyone,</p>')) throw new Error('Missing greeting');
  if (!html.includes('<li>PROJ-123: Fix login</li>')) throw new Error('Missing list item');
  if (!html.includes('      <li>Investigated issue</li>')) throw new Error('Missing nested item');

  // Basic structure checks
  if (!html.includes('<p>Hi everyone,</p>')) throw new Error('Missing greeting');
  if (!html.includes('<p>Yesterday</p>')) throw new Error('Missing Yesterday');
  if (!html.includes('<p>No blockers</p>')) throw new Error('Missing No blockers');

  // List checks
  if (!html.includes('<ul>')) throw new Error('Missing ul');
  if (!html.includes('<li>PROJ-123: Fix login</li>')) throw new Error('Missing PROJ-123');
  if (!html.includes('<li>PROJ-456: Update docs</li>')) throw new Error('Missing PROJ-456');
  if (!html.includes('<li>PROJ-789: New feature</li>')) throw new Error('Missing PROJ-789');

  // Nested list checks
  if (!html.includes('    <ul>')) throw new Error('Missing nested ul');
  if (!html.includes('      <li>Investigated issue</li>')) throw new Error('Missing nested item 1');
  if (!html.includes('      <li>Fixed NPE</li>')) throw new Error('Missing nested item 2');

  console.log('✅ Basic structure test passed');

  const escapeInput = `Test & < > " '`;
  const escapeHtml = buildHtmlReport(escapeInput);
  if (!escapeHtml.includes('Test &amp; &lt; &gt; &quot; &#039;')) throw new Error('Escaping failed');

  console.log('✅ Escaping test passed');

} catch (e) {
  console.error('❌ Test failed:', e);
  process.exit(1);
}
