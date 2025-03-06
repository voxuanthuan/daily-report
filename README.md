# Jira Daily Report Extension

![Jira Daily Report Icon](icon.png)

The **Jira Daily Report** extension for Visual Studio Code helps you generate daily task reports from your Jira Server, streamlining your workflow right in your editor. If you’re having trouble starting the extension—don’t worry! This guide is here to get you up and running quickly with clear steps and troubleshooting tips.

## Features
- Fetch and display daily task updates from your Jira Server.
- Easy-to-configure settings for seamless integration.
- Lightweight and tailored for developers and teams.

## Requirements
- VS Code 1.98.0 or later.
- A running Jira Server instance (8.14.0+ recommended for Personal Access Token support).
- A Jira Personal Access Token (PAT) for authentication.

## Installation
1. Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=thuanvo.jira-daily-report).
2. Reload VS Code: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS), type `Reload Window`, and select it.

## Getting Started: How to Fix “I Can’t Start Using This App”
If you’ve installed the extension but can’t figure out how to start using it, follow these steps to set it up and generate your first report.

### Step 1: Configure Your Jira Settings
The extension needs your Jira Server details to work. Here’s how to set them up:
1. Open VS Code.
2. Open the **Command Palette**:
   - Windows/Linux: `Ctrl+Shift+P`
   - macOS: `Cmd+Shift+P`
3. Type `Configure Jira Daily Report` and select it.
4. Enter these details when prompted:
   - **Jira Server URL**: Your Jira instance’s address (e.g., `http://localhost:8080` or `http://your-jira-server:8080`).
   - **Jira Username**: Your Jira login name (e.g., `admin`).
   - **Jira Personal Access Token**: Your PAT (see “Generating a PAT” below).
5. Press `Enter` after each input. You’ll see: *"Jira Daily Report settings saved!"*
   - **Tip:** If nothing happens, ensure VS Code is reloaded after installation.

#### Generating a Personal Access Token (PAT)
1. Log in to your Jira Server (e.g., `http://localhost:8080`).
2. Click your profile picture (top-right) > **Profile**.
3. Go to **Personal Access Tokens** (requires Jira 8.14.0+).
4. Click **Create Token**, name it (e.g., `Jira Report`), and click **Create**.
5. Copy the token immediately—it won’t be shown again.
6. Paste it during the configuration step.

### Step 2: Generate Your First Report
Once configured, you’re ready to use the extension:
1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Type `Generate Jira Daily Report` and select it.
3. The extension will:
   - Connect to your Jira Server using your settings.
   - Fetch tasks you’ve updated today.
   - Open a new tab with your daily report (e.g., task keys and summaries).
4. If no report appears, see “Troubleshooting” below.

### Alternative: Check Settings Manually
If the command doesn’t prompt you:
1. Go to **File > Preferences > Settings** (`Ctrl+,` or `Cmd+,`).
2. Search for `Jira Daily Report`.
3. Ensure these fields are filled:
   - `Jira Daily Report: Server Url` (e.g., `http://localhost:8080`)
   - `Jira Daily Report: Username` (e.g., `admin`)
   - `Jira Daily Report: Token` (your PAT)
4. Save and retry Step 2.

## How to Use This Extension
After setup, generating reports is simple:
- Run `Generate Jira Daily Report` from the Command Palette anytime.
- The report lists tasks updated today under your username, displayed as plain text in a new VS Code tab.
- Save or copy the report as needed for your daily updates.

## Troubleshooting “I Can’t Start Using This App”
If you’re stuck, try these fixes:
- **Extension Not Active?**
  - Reload VS Code after installation (`Reload Window` in Command Palette).
  - Check the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)—ensure “Jira Daily Report” is enabled (no disable icon).
- **Command Not Found?**
  - Verify installation: Uninstall and reinstall from the Marketplace.
  - Run `vsce package` and install locally if testing: `code --install-extension thuanvo.jira-daily-report-0.0.3.vsix`.
- **No Report Generated?**
  - Confirm your Jira Server is running (e.g., accessible in a browser).
  - Test your settings: In a terminal, run:
    ```bash
    curl -H "Authorization: Bearer YOUR_PAT" YOUR_URL/rest/api/2/myself
