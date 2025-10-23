# Publishing Guide - Jira Daily Report

This guide shows you how to publish the Jira Daily Report to NPM so others can install it globally.

## Prerequisites

1. **NPM Account**: Create one at https://www.npmjs.com/signup
2. **Login to NPM**: Run `npm login` and enter your credentials
3. **Built Package**: Ensure you've run `npm run package`

## Step-by-Step Publishing

### 1. Login to NPM

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

### 2. Verify Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

This shows all files that will be included in the package.

### 3. Test the Package Locally

Before publishing, test it locally:

```bash
# Build the production package
npm run package

# Test installation locally
npm link

# Test the CLI
jira-report --version
jira-report --help

# If everything works, unlink
npm unlink -g jira-daily-report
```

### 4. Update Version (if needed)

Follow semantic versioning:

```bash
# For bug fixes
npm version patch   # 0.1.95 -> 0.1.96

# For new features (backward compatible)
npm version minor   # 0.1.95 -> 0.2.0

# For breaking changes
npm version major   # 0.1.95 -> 1.0.0
```

Or manually edit `package.json` and update the version field.

### 5. Publish to NPM

```bash
# Dry run first (recommended)
npm publish --dry-run

# Actual publish
npm publish
```

If your package name is taken, you might need to:
- Use a scoped package: `@yourusername/jira-daily-report`
- Choose a different name

### 6. Publish as Scoped Package (Alternative)

If the name is taken, use a scoped package:

```bash
# Update package.json name to: @yourusername/jira-daily-report

# Publish as public scoped package
npm publish --access public
```

### 7. Verify Publication

After publishing, verify:

```bash
# Check on NPM
https://www.npmjs.com/package/jira-daily-report

# Test installation
npm install -g jira-daily-report

# Test CLI
jira-report --version
```

## Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run check-types`
- [ ] Linting passes: `npm run lint`
- [ ] Production build works: `npm run package`
- [ ] CLI works locally: `npm link` and test
- [ ] Version is updated appropriately
- [ ] README.md is up to date
- [ ] CLI.md documentation is complete
- [ ] CHANGELOG is updated (if you have one)
- [ ] All sensitive data removed (no API tokens, passwords, etc.)

## Post-Publishing

### Update README

Add installation badge to README.md:

```markdown
[![npm version](https://badge.fury.io/js/jira-daily-report.svg)](https://www.npmjs.com/package/jira-daily-report)
[![npm downloads](https://img.shields.io/npm/dm/jira-daily-report.svg)](https://www.npmjs.com/package/jira-daily-report)
```

### Announce

Share your package:
- GitHub README
- Social media
- Dev communities
- Team/company

### Monitor

- Check NPM downloads: https://npm-stat.com/charts.html?package=jira-daily-report
- Monitor GitHub issues
- Respond to user feedback

## Updating the Package

When you make changes:

```bash
# 1. Make your changes
# 2. Test thoroughly
npm test
npm run package

# 3. Update version
npm version patch  # or minor/major

# 4. Publish
npm publish

# 5. Push git tags
git push && git push --tags
```

## Unpublishing (Emergency Only)

⚠️ **Warning**: Unpublishing is discouraged and only available for 72 hours after publishing.

```bash
# Unpublish a specific version
npm unpublish jira-daily-report@0.1.95

# Unpublish entire package (within 72 hours)
npm unpublish jira-daily-report --force
```

## Alternative: Private Package

If you want to keep it private:

```bash
# Requires paid NPM account
npm publish --access restricted
```

## GitHub Package Registry (Alternative)

Publish to GitHub instead of NPM:

```bash
# Add to package.json:
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}

# Login to GitHub registry
npm login --registry=https://npm.pkg.github.com

# Publish
npm publish --registry=https://npm.pkg.github.com
```

## Troubleshooting

### "Package name already exists"

Options:
1. Use a scoped package: `@yourusername/jira-daily-report`
2. Choose a different name: `jira-standup-reporter`, `jira-daily-cli`, etc.
3. Contact the current owner if the package is abandoned

### "No permission to publish"

- Ensure you're logged in: `npm whoami`
- Check package name ownership
- Verify you have publish rights

### "Version already exists"

- Update version: `npm version patch`
- Or manually edit package.json

### Build errors

```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run package
```

## Security Best Practices

1. **Enable 2FA**: https://www.npmjs.com/settings/[username]/twofa
2. **Use npm token**: For CI/CD, use automation tokens
3. **Review .npmignore**: Ensure no sensitive files are included
4. **Scan for vulnerabilities**: `npm audit`
5. **Check dependencies**: Keep dependencies updated

## Quick Reference

```bash
# Complete publishing workflow
npm login
npm run package
npm version patch
npm publish

# Users can then install:
npm install -g jira-daily-report
jira-report --help
```

## Support

For publishing issues:
- NPM Support: https://www.npmjs.com/support
- NPM Docs: https://docs.npmjs.com/

For package issues:
- GitHub Issues: https://github.com/voxuanthuan/daily-report/issues
