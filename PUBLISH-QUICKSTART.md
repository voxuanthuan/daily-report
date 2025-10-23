# Quick Start: Publishing to NPM

## 🎯 Goal
Make your CLI globally available so anyone can install it with:
```bash
npm install -g jira-daily-report
```

## ⚡ Quick Method (5 Minutes)

### Option 1: Using the Automated Script

```bash
# Run the publish script
./publish.sh
```

The script will:
1. Check you're logged in to NPM
2. Run tests and build
3. Ask you to bump version
4. Confirm and publish

### Option 2: Manual Steps

```bash
# 1. Login to NPM (one-time setup)
npm login

# 2. Build production package
npm run package

# 3. Bump version
npm version patch   # 0.1.95 -> 0.1.96

# 4. Publish
npm publish

# 5. Push to git
git push && git push --tags
```

## 🎉 Done!

Users can now install with:
```bash
npm install -g jira-daily-report
jira-report --help
```

## 📝 First Time Setup

### 1. Create NPM Account
- Go to https://www.npmjs.com/signup
- Create your account
- Verify your email

### 2. Login from Terminal
```bash
npm login
```

Enter your credentials when prompted.

### 3. Enable 2FA (Recommended)
- Go to https://www.npmjs.com/settings/[username]/twofa
- Enable two-factor authentication
- Save backup codes

## 🔍 Verify Publication

After publishing:

```bash
# Check on NPM
open https://www.npmjs.com/package/jira-daily-report

# Test installation
npm install -g jira-daily-report

# Test CLI
jira-report --version
```

## 🚨 Troubleshooting

### "Package name taken"

The name `jira-daily-report` might be taken. Try:

**Option A: Use scoped package**
```bash
# Update package.json name to:
"name": "@yourusername/jira-daily-report"

# Publish:
npm publish --access public
```

**Option B: Choose different name**
```bash
# Change package.json name to something like:
"name": "jira-standup-cli"
"name": "jira-daily-cli"
"name": "daily-jira-report"

# Then publish:
npm publish
```

### "Not logged in"
```bash
npm login
npm whoami  # Verify login
```

### "Permission denied"
```bash
# Make sure you own the package name
# Or use a scoped package: @yourusername/jira-daily-report
```

## 📋 Pre-Publish Checklist

- [ ] Tests pass: `npm run check-types && npm run lint`
- [ ] Built successfully: `npm run package`
- [ ] Tested locally: `npm link` then test `jira-report`
- [ ] Version updated: `npm version patch/minor/major`
- [ ] Logged in to NPM: `npm whoami`
- [ ] Ready to publish: `npm publish`

## 🔄 Updating After First Publish

```bash
# 1. Make your changes
# ... code changes ...

# 2. Test
npm test
npm run package

# 3. Update version
npm version patch  # or minor/major

# 4. Publish update
npm publish

# 5. Push to git
git push && git push --tags
```

## 📚 Full Documentation

For detailed instructions, see [PUBLISHING.md](PUBLISHING.md)

## 🆘 Need Help?

- NPM Documentation: https://docs.npmjs.com/
- NPM Support: https://www.npmjs.com/support
- GitHub Issues: https://github.com/voxuanthuan/daily-report/issues

---

**Ready to publish? Run `./publish.sh` to get started!** 🚀
