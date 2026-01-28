# Authentication Guide

## Overview

Jira Daily Report uses **OAuth 2.0 with PKCE** to authenticate with Atlassian Jira. This is the same secure method used by mobile apps - no API tokens needed!

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OAuth 2.0 + PKCE Flow                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐          ┌──────────────┐          ┌─────────────────┐
    │   CLI    │          │   Browser    │          │    Atlassian    │
    └────┬─────┘          └──────┬───────┘          └────────┬────────┘
         │                       │                           │
    1. jira-report auth login    │                           │
         │                       │                           │
    2. Start local server ───────│                           │
       (localhost:8080)          │                           │
         │                       │                           │
    3. Open browser ────────────►│                           │
         │                       │                           │
         │               4. User logs in ─────────────────────►
         │                       │                           │
         │                       │◄──────── 5. Authorization page
         │                       │                           │
         │◄─────── 6. Redirect with code ◄───────────────────│
         │         (localhost:8080/callback)                 │
         │                       │                           │
    7. Exchange code ──────────────────────────────────────────►
       with verifier             │                           │
         │                       │                           │
         │◄──────────────────────────────────── 8. Access token
         │                       │                           │
    9. Save to keyring           │                           │
         │                       │                           │
    ✓ Done!                      │                           │
```

---

## Quick Start

### 1. Setup (one time)
```bash
jira-report auth init
```
Enter your OAuth Client ID, Secret, and callback URL.

### 2. Login
```bash
jira-report auth login
```
Browser opens → Log in → Done!

### 3. Check Status
```bash
jira-report auth status
```

### 4. Logout
```bash
jira-report auth logout
```

---

## Security Features

| Feature | Description |
|---------|-------------|
| **PKCE** | Proof Key for Code Exchange prevents code interception |
| **Secure Storage** | Tokens stored in OS keyring (Keychain/GNOME Keyring) |
| **Device Binding** | Tokens only work on the device they were created |
| **Auto Refresh** | Tokens automatically refresh before expiry |
| **Short Timeout** | 3-minute auth window minimizes attack surface |

---

## Troubleshooting

### "Invalid callback URL"
Add `http://localhost:8080/callback` to your Atlassian OAuth app settings.

### "OAuth credentials not found"
Run `jira-report auth init` first.

### Need more help?
See [OAUTH_SETUP.md](docs/OAUTH_SETUP.md) for detailed setup instructions.
