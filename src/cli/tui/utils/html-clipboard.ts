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
        // Linux: Try wl-copy (Wayland) then xclip (X11)
        const tryWlCopy = () => {
          const wlArgs = ['--type', 'text/html', '--type', 'text/plain'];
          const wlChild = spawn('wl-copy', wlArgs);

          wlChild.on('error', () => {
             // wl-copy not found or failed to spawn, try xclip
             tryXclip();
          });

          wlChild.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              // wl-copy failed (e.g. not Wayland), try xclip
              tryXclip();
            }
          });

          wlChild.stdin.write(input);
          wlChild.stdin.end();
        };

        const tryXclip = () => {
          const xcArgs = ['-selection', 'clipboard', '-t', 'text/html'];
          const xcChild = spawn('xclip', xcArgs);

          xcChild.on('error', (err) => {
             reject(new Error(`Failed to execute clipboard command. Please install wl-clipboard (Wayland) or xclip (X11). Error: ${err.message}`));
          });

          xcChild.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`xclip failed (code ${code}). Ensure xclip is installed.`));
            }
          });

          xcChild.stdin.write(input);
          xcChild.stdin.end();
        };

        tryWlCopy();
        return; // Return to avoid running the default spawn below
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
