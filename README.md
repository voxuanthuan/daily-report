# Jira Daily Report Extension

The **Jira Daily Report** extension for Visual Studio Code helps you generate daily task reports from your Jira Server

## Requirements
- VS Code 1.80.0 or later.

## Installation
1. Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=thuanvo.jira-daily-report).
2. Or Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter.
- `ext install thuanvo.jira-daily-report`


### Configure Your Jira Settings
   - **Jira Server URL**: Your Jira instance’s address (e.g., `https://grapplefinance.atlassian.net/`).
   - **Jira Username**: Your Jira login user name (Email) (e.g., `thuanvo@gmail.com`).
   - **How to get Jira Account Access Token?**: [Docs Official Guide](https://confluence.atlassian.com/cloud/api-tokens-938839638.html)
   - **How to get Jira Tempo API Token?**: [Docs Official Guide](https://apidocs.tempo.io/#section/Authentication)
      - Simple access your jira eg:[https://grapplefinance.atlassian.net/jira/your-work](https://grapplefinance.atlassian.net/jira/your-work) > Select **Tempo** on Apps Menu
      - Select Settings on left sidebar -> scrolldown to **Data Access** and Select **API Integration**
      - Generate Your Tempo API Token

### Step 2: Generate Your First Report
Once configured, you’re ready to use the extension:
   1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   2. Type `Generate Jira Daily Report`

### Slack Formatting Guide
- ( **- → •** ) 
- [Slack Formatting Guide](https://slack.com/intl/en-gb/help/articles/360039953113-Set-your-message-formatting-preference)

## Contributing

File bugs and feature requests in [GitHub Issues](https://github.com/voxuanthuan/daily-report/issues).

Checkout the source code in the [GitHub Repository](https://github.com/voxuanthuan/daily-report).

## License
[MIT](./License.md)
