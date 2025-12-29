import blessed from 'neo-blessed';

/**
 * Apply rounded corners to a widget by replacing corner characters after render
 * Neo-blessed hardcodes border characters, so we need to patch them post-render
 */
export function applyRoundedCorners(widget: blessed.Widgets.BlessedElement): void {
  const screen = widget.screen as any;
  if (!screen) {
    return;
  }

  const originalRender = widget.render.bind(widget);

  widget.render = function() {
    const result = originalRender();

    // Get widget absolute position
    const left = (widget.aleft as number) ?? 0;
    const top = (widget.atop as number) ?? 0;
    const width = widget.width as number;
    const height = widget.height as number;

    if (width < 2 || height < 2) {
      return result;
    }

    const lines = screen.lines;
    if (!lines) {
      return result;
    }

    const right = left + width - 1;
    const bottom = top + height - 1;

    // Replace corners with rounded characters
    // Top-left corner
    if (lines[top] && lines[top][left]) {
      lines[top][left][1] = '╭';
      lines[top].dirty = true;
    }

    // Top-right corner
    if (lines[top] && lines[top][right]) {
      lines[top][right][1] = '╮';
      lines[top].dirty = true;
    }

    // Bottom-left corner
    if (lines[bottom] && lines[bottom][left]) {
      lines[bottom][left][1] = '╰';
      lines[bottom].dirty = true;
    }

    // Bottom-right corner
    if (lines[bottom] && lines[bottom][right]) {
      lines[bottom][right][1] = '╯';
      lines[bottom].dirty = true;
    }

    return result;
  };
}

/**
 * Apply rounded corners to multiple widgets
 */
export function applyRoundedCornersToAll(widgets: blessed.Widgets.BlessedElement[]): void {
  widgets.forEach(widget => applyRoundedCorners(widget));
}
