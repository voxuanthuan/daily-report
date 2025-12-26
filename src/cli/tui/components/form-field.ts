import blessed from 'neo-blessed';
import { getTheme } from '../theme';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface FormFieldConfig {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  validator?: (value: string) => ValidationResult;
  hint?: string;
  top: number;
  left: number;
  width: number;
}

/**
 * Reusable form field component with validation support
 * Displays label, input box, validation indicator, and hint text
 */
export class FormField {
  private screen: blessed.Widgets.Screen;
  private container: blessed.Widgets.BoxElement;
  private label: blessed.Widgets.TextElement;
  private input: blessed.Widgets.TextboxElement;
  private validationIndicator: blessed.Widgets.TextElement;
  private hintText: blessed.Widgets.TextElement;
  private config: FormFieldConfig;

  constructor(screen: blessed.Widgets.Screen, config: FormFieldConfig) {
    this.screen = screen;
    this.config = config;

    const theme = getTheme();

    // Container for all field elements
    this.container = blessed.box({
      parent: screen,
      top: config.top,
      left: config.left,
      width: config.width,
      height: 4, // Label + input + hint
      tags: true,
    });

    // Label
    this.label = blessed.text({
      parent: this.container,
      top: 0,
      left: 0,
      content: `{${theme.primary}-fg}${config.label}:{/${theme.primary}-fg}`,
      tags: true,
    });

    // Input textbox
    this.input = blessed.textbox({
      parent: this.container,
      top: 1,
      left: 0,
      width: config.width - 4, // Leave space for validation indicator
      height: 1,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      style: {
        bg: 'black',
        fg: 'white',
        focus: {
          bg: 'black',
          fg: 'white',
        },
      },
      border: {
        type: 'line',
      },
    });

    if (config.defaultValue) {
      this.input.setValue(config.defaultValue);
    }

    if (config.placeholder) {
      (this.input as any).placeholder = config.placeholder;
    }

    // Validation indicator (✓ or ✗)
    this.validationIndicator = blessed.text({
      parent: this.container,
      top: 1,
      left: config.width - 3,
      width: 2,
      content: '',
      tags: true,
    });

    // Hint text (examples or error messages)
    this.hintText = blessed.text({
      parent: this.container,
      top: 3,
      left: 0,
      width: config.width,
      content: config.hint ? `{gray-fg}${config.hint}{/gray-fg}` : '',
      tags: true,
    });

    // Validate on input change
    this.input.on('keypress', () => {
      setTimeout(() => {
        const value = this.input.getValue();
        if (this.config.validator) {
          const result = this.config.validator(value);
          this.updateValidationIndicator(result);
        }
        this.screen.render();
      }, 0);
    });

    // Initial validation if default value
    if (config.defaultValue && config.validator) {
      const result = config.validator(config.defaultValue);
      this.updateValidationIndicator(result);
    }
  }

  /**
   * Update validation indicator and hint text based on validation result
   */
  private updateValidationIndicator(result: ValidationResult): void {
    if (result.valid) {
      this.validationIndicator.setContent('{green-fg}✓{/green-fg}');
      // Restore default hint if valid
      if (this.config.hint) {
        this.hintText.setContent(`{gray-fg}${this.config.hint}{/gray-fg}`);
      } else {
        this.hintText.setContent('');
      }
    } else {
      this.validationIndicator.setContent('{red-fg}✗{/red-fg}');
      // Show error message
      if (result.message) {
        this.hintText.setContent(`{red-fg}${result.message}{/red-fg}`);
      }
    }
  }

  /**
   * Manually validate current value
   */
  validate(value?: string): ValidationResult {
    const valueToValidate = value ?? this.input.getValue();
    if (this.config.validator) {
      return this.config.validator(valueToValidate);
    }
    return { valid: true };
  }

  /**
   * Get current input value
   */
  getValue(): string {
    return this.input.getValue();
  }

  /**
   * Set input value
   */
  setValue(value: string): void {
    this.input.setValue(value);
    if (this.config.validator) {
      const result = this.config.validator(value);
      this.updateValidationIndicator(result);
    }
    this.screen.render();
  }

  /**
   * Set focus to this field
   */
  setFocus(): void {
    this.input.focus();
    this.screen.render();
  }

  /**
   * Get the input widget for event handling
   */
  getInput(): blessed.Widgets.TextboxElement {
    return this.input;
  }

  /**
   * Show/hide the container
   */
  show(): void {
    this.container.show();
    this.screen.render();
  }

  hide(): void {
    this.container.hide();
    this.screen.render();
  }

  /**
   * Destroy the field and clean up
   */
  destroy(): void {
    this.container.destroy();
  }
}
