import blessed from 'neo-blessed';
import moment from 'moment-timezone';
import { FormField, ValidationResult } from './form-field';
import { getTheme } from '../theme';

export interface LogTimeFormData {
  time: string;
  description: string;
  date: string;
}

/**
 * Unified form for logging time with multiple fields
 * Replaces sequential prompts with single form allowing navigation
 */
export class LogTimeForm {
  private screen: blessed.Widgets.Screen;
  private container: blessed.Widgets.BoxElement;
  private timeField: FormField;
  private descriptionField: FormField;
  private dateField: FormField | null = null;
  private taskKey: string;
  private fields: FormField[] = [];
  private currentFieldIndex: number = 0;
  private resolve: ((value: LogTimeFormData | null) => void) | null = null;

  constructor(
    screen: blessed.Widgets.Screen,
    taskKey: string,
    defaultDescription?: string,
    showDateField: boolean = false
  ) {
    this.screen = screen;
    this.taskKey = taskKey;

    const theme = getTheme();

    // Main container
    this.container = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 70,
      height: showDateField ? 22 : 18,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: theme.primary,
        },
      },
      label: ` {bold}Log Time: ${taskKey}{/bold} `,
      keys: true,
      vi: true,
      mouse: true,
      shadow: true,
    });

    // Set rounded border characters
    (this.container as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    // Time field with validation
    this.timeField = new FormField(screen, {
      label: 'Time Spent',
      placeholder: 'e.g., 2h, 1.5h, 30m',
      defaultValue: '',
      validator: this.validateTime.bind(this),
      hint: 'Examples: 2h, 1.5h, 30m, 1h 30m',
      top: 2,
      left: 2,
      width: 66,
    });
    this.fields.push(this.timeField);

    // Description field (optional, auto-filled from git)
    this.descriptionField = new FormField(screen, {
      label: 'Description',
      placeholder: 'Optional description',
      defaultValue: defaultDescription || '',
      validator: () => ({ valid: true }), // Optional field
      hint: defaultDescription ? '(Auto-filled from last commit)' : '(Optional)',
      top: 7,
      left: 2,
      width: 66,
    });
    this.fields.push(this.descriptionField);

    // Date field (conditional)
    if (showDateField) {
      this.dateField = new FormField(screen, {
        label: 'Date',
        placeholder: 'today, yesterday, or YYYY-MM-DD',
        defaultValue: 'today',
        validator: this.validateDate.bind(this),
        hint: 'Use: today, yesterday, or YYYY-MM-DD',
        top: 12,
        left: 2,
        width: 66,
      });
      this.fields.push(this.dateField);
    }

    // Navigation hint
    const navHint = blessed.text({
      parent: this.container,
      top: showDateField ? 17 : 13,
      left: 2,
      width: 66,
      content: '{gray-fg}Navigation: Tab/↑↓ = Move  Enter = Submit  Esc = Cancel{/gray-fg}',
      tags: true,
    });

    // Submit and Cancel buttons
    const buttonTop = showDateField ? 19 : 15;
    const submitButton = blessed.button({
      parent: this.container,
      top: buttonTop,
      left: 20,
      width: 12,
      height: 1,
      content: ' Submit ',
      align: 'center',
      tags: true,
      style: {
        bg: theme.primary,
        fg: 'white',
        focus: {
          bg: theme.highlight,
          fg: 'white',
        },
      },
      mouse: true,
      keys: true,
    });

    const cancelButton = blessed.button({
      parent: this.container,
      top: buttonTop,
      left: 38,
      width: 12,
      height: 1,
      content: ' Cancel ',
      align: 'center',
      tags: true,
      style: {
        bg: 'gray',
        fg: 'white',
        focus: {
          bg: 'white',
          fg: 'black',
        },
      },
      mouse: true,
      keys: true,
    });

    // Button click handlers
    submitButton.on('press', () => this.submit());
    cancelButton.on('press', () => this.cancel());

    this.setupNavigation();
  }

  /**
   * Validate time format
   * Matches entire string to prevent partial matches (e.g., '2hours' should fail)
   */
  private validateTime(timeString: string): ValidationResult {
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
   * Validate date format
   */
  private validateDate(dateString: string): ValidationResult {
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

  /**
   * Setup keyboard navigation between fields
   */
  private setupNavigation(): void {
    // Tab to next field
    this.container.key(['tab'], () => {
      this.focusNextField();
    });

    // Shift+Tab to previous field
    this.container.key(['S-tab'], () => {
      this.focusPreviousField();
    });

    // Arrow down to next field
    this.container.key(['down'], () => {
      this.focusNextField();
    });

    // Arrow up to previous field
    this.container.key(['up'], () => {
      this.focusPreviousField();
    });

    // Enter to submit (from any field)
    this.container.key(['enter'], () => {
      this.submit();
    });

    // Escape to cancel
    this.container.key(['escape'], () => {
      this.cancel();
    });

    // Setup field-specific enter behavior
    this.fields.forEach((field) => {
      field.getInput().key(['enter'], () => {
        this.focusNextField();
      });
    });
  }

  /**
   * Focus next field in sequence
   */
  private focusNextField(): void {
    this.currentFieldIndex = (this.currentFieldIndex + 1) % this.fields.length;
    this.fields[this.currentFieldIndex].setFocus();
  }

  /**
   * Focus previous field in sequence
   */
  private focusPreviousField(): void {
    this.currentFieldIndex =
      (this.currentFieldIndex - 1 + this.fields.length) % this.fields.length;
    this.fields[this.currentFieldIndex].setFocus();
  }

  /**
   * Validate all fields
   */
  private validateAll(): boolean {
    let allValid = true;

    // Time is required
    const timeResult = this.timeField.validate();
    if (!timeResult.valid) {
      allValid = false;
    }

    // Date is required if field exists
    if (this.dateField) {
      const dateResult = this.dateField.validate();
      if (!dateResult.valid) {
        allValid = false;
      }
    }

    // Description is optional, always valid

    return allValid;
  }

  /**
   * Submit form if all validations pass
   */
  private submit(): void {
    if (!this.validateAll()) {
      // Focus first invalid field
      if (!this.timeField.validate().valid) {
        this.timeField.setFocus();
      } else if (this.dateField && !this.dateField.validate().valid) {
        this.dateField.setFocus();
      }
      return;
    }

    const data: LogTimeFormData = {
      time: this.timeField.getValue(),
      description: this.descriptionField.getValue(),
      date: this.dateField ? this.dateField.getValue() : 'today',
    };

    this.close(data);
  }

  /**
   * Cancel form
   */
  private cancel(): void {
    this.close(null);
  }

  /**
   * Close form and resolve promise
   */
  private close(data: LogTimeFormData | null): void {
    this.container.destroy();
    this.fields.forEach(field => field.destroy());
    this.screen.render();

    if (this.resolve) {
      this.resolve(data);
    }
  }

  /**
   * Show form and return promise with form data
   */
  show(): Promise<LogTimeFormData | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.container.show();
      this.container.focus();
      this.fields[0].setFocus(); // Focus first field (time)
      this.screen.render();
    });
  }
}
