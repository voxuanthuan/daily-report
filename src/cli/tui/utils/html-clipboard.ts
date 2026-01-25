import { spawn } from 'child_process';
import { platform } from 'os';

export class HtmlClipboard {
  /**
   * Copy HTML content to system clipboard with correct MIME type
   * This allows pasting as Rich Text in apps like Slack, Jira, Gmail, etc.
   */
  static write(html: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const os = platform();
      let command: string;
      let args: string[] = [];
      let input = html;
      let useStdin = true;

      if (os === 'darwin') {
        // macOS: Use textutil to convert HTML to RTF and pipe to pbcopy
        // This is the most reliable way to get "Rich Text" into macOS clipboard from CLI
        command = 'sh';
        args = ['-c', 'textutil -stdin -format html -convert rtf -stdout | pbcopy'];
      } else if (os === 'win32') {
        // Windows: Use PowerShell
        command = 'powershell';
        // Note: This relies on PowerShell 5.0+
        // We pass the HTML as an argument, so no stdin pipe
        const escapedHtml = html.replace(/"/g, '`"');
        args = ['-NoProfile', '-Command', `Set-Clipboard -AsHtml "${escapedHtml}"`];
        useStdin = false;
      } else {
        // Linux: Default to xclip
        // We could add logic to detect Wayland (wl-copy) vs X11
        // For now, try xclip which is common
        command = 'xclip';
        args = ['-selection', 'clipboard', '-t', 'text/html'];
      }

      const child = spawn(command, args);

      child.on('error', (err) => {
        if (os === 'linux') {
           reject(new Error(`Failed to execute ${command}. Please install xclip: sudo apt install xclip`));
        } else {
           reject(err);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // If xclip fails, it might be missing or display not set
          const msg = os === 'linux'
            ? `Clipboard command failed (code ${code}). Ensure 'xclip' is installed.`
            : `Clipboard command failed (code ${code})`;
          reject(new Error(msg));
        }
      });

      if (useStdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }
}
