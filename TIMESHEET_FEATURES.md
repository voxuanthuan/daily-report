# Timesheet Log Features

## Overview
The Jira Daily Report extension now supports timesheet log parsing with the format "TICKET-123 2h" **AND** direct time logging to Tempo via the Tempo API v4. This feature allows you to quickly parse, format, and log timesheet entries directly within VS Code.

## Supported Formats
- `B2B-1079 2h` (single ticket with hours)
- `PROJECT-123 1.5h` (decimal hours)
- `TICKET-456 30m` (minutes format)
- `TICKET-789 1h 30m` (mixed hours and minutes)
- `B2B-1079 2h, PROJECT-123 1.5h` (multiple tickets)

## Commands

### Parse Timesheet Log
- **Command**: `Parse Timesheet Log`
- **Usage**: `Ctrl+Shift+P` → "Parse Timesheet Log"
- **Function**: Parses timesheet entries and shows formatted breakdown
- **Output**: Shows ticket-by-ticket breakdown with total time

### Log Time to Tempo
- **Command**: `Log Time to Tempo`
- **Usage**: `Ctrl+Shift+P` → "Log Time to Tempo"
- **Function**: Logs multiple timesheet entries directly to Tempo API v4
- **Features**: 
  - Batch processing of multiple tickets
  - Date selection (today, yesterday, custom)
  - Optional description for all entries
  - Progress tracking and error handling
  - Detailed success/failure reporting

### Log Single Worklog to Tempo
- **Command**: `Log Single Worklog to Tempo`
- **Usage**: `Ctrl+Shift+P` → "Log Single Worklog to Tempo"
- **Function**: Log a single worklog entry to Tempo
- **Features**: 
  - Individual ticket and time entry
  - Optional work description
  - Immediate success/failure feedback

### Generate Jira Daily Report (Enhanced)
- **Command**: `Generate Jira Daily Report`
- **Enhancement**: Now prompts to include timesheet entries in daily report
- **Integration**: 
  - Timesheet entries are added as a separate section in the report
  - Option to log timesheet entries directly to Tempo after adding to report

## Configuration Settings

### `grappleDailyReport.enableTimesheetIntegration`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable timesheet log parsing and integration features

### `grappleDailyReport.timesheetDateFormat`
- **Type**: String
- **Default**: `"YYYY-MM-DD"`
- **Description**: Date format for timesheet entries

## Example Usage

### Input
```
B2B-1079 2h, PROJECT-123 1.5h, TICKET-456 30m
```

### Output
```
📋 **Timesheet Log Summary**

**Breakdown by Ticket:**
  • B2B-1079: 2h
  • PROJECT-123: 1h 30m
  • TICKET-456: 30m

**Total Time:** 4h
**Total Hours:** 4.00h
```

## Integration with Daily Reports

When generating a daily report, the extension will:
1. Ask if you want to include timesheet entries
2. Prompt for timesheet log input (optional)
3. Parse and validate the format
4. Include formatted timesheet section in the final report

## Error Handling

The extension provides helpful error messages for:
- Invalid ticket formats
- Invalid time formats
- Empty entries
- Malformed input

## Technical Details

- **Parser**: `TimesheetParser` class handles format validation and parsing
- **Formatter**: `TempoFormatter` integrates with existing tempo functionality
- **Handler**: `TimesheetHandler` manages VS Code integration and user interaction
- **Worklog Creator**: `TempoWorklogCreator` handles direct API integration with Tempo v4
- **API Integration**: Uses Tempo API v4 (`https://api.tempo.io/4/worklogs`) for time logging
- **Authentication**: Uses Bearer token authentication with Tempo API
- **Tests**: Comprehensive test suite ensures reliability

## Future Enhancements

- Export timesheet data to CSV/Excel
- Integration with time tracking APIs
- Custom ticket format patterns
- Batch processing of timesheet files