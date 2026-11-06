# ACCOUNT COMMAND CENTER

**Account Command Center** is a private, zero-trust web console engineered for a single administrator to manage, monitor, synchronize, and analyze multiple personal Google accounts that the administrator personally owns and explicitly authorizes.

---

## 1. System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               CLIENT (React 19 + Vite)                 │
                    │   - Futuristic Dark Cyber Theme (#080D1B, #131E35)     │
                    │   - Global Account Selector & Context Management       │
                    │   - Real-Time Sanitized Gmail Viewer (DOMPurify)       │
                    │   - Takeout Ingestion Engine (ZIP, JSON, HTML)         │
                    └───────────────────────────┬────────────────────────────┘
                                                │ Bearer Token / Session
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               BACKEND (Node.js + Express)              │
                    │   - Strict Admin Verification (ADMIN_EMAIL)            │
                    │   - AES-256-GCM Cryptographic Token Vault              │
                    │   - Dedicated OAuth 2.0 Code Flow (PKCE + State)       │
                    │   - Safe ZIP Decompression & Bomb Prevention           │
                    └──────────────┬──────────────────────────┬──────────────┘
                                   │                          │
                 REST / Firebase   │                          │ Google API Client
                                   ▼                          ▼
            ┌─────────────────────────────┐        ┌────────────────────────────┐
            │   Cloud Firestore / Storage │        │     Google APIs Services   │
            │   - Account Metadata        │        │   - Gmail API (v1)         │
            │   - Takeout Subcollections  │        │   - Google OAuth2 Revoke   │
            │   - Application Audit Logs  │        │   - Google Takeout Exports │
            └─────────────────────────────┘        └────────────────────────────┘
```

---

## 2. Authentication & Authorization Model

### A. The Single Administrator Boundary
* **Identity Provider:** Firebase Authentication with Google Sign-In.
* **Administrator Email:** Normalized and strictly validated against the server-side environment variable `ADMIN_EMAIL` (`hillssinaitab20@gmail.com`).
* **Zero-Trust Access Control:** Unverified email addresses and any other Google accounts are immediately rejected with `403 Access Denied`.
* **No Public Sign-Up:** Invitations, self-registration, and non-admin roles are disabled by design.

### B. Separation of Administrator Login vs. Connected Accounts
* The administrator's primary login provides identity verification to access the Command Center.
* Additional personal Google accounts are connected via an independent, dedicated server-side **Google OAuth 2.0 Authorization Code Flow** with:
  * `prompt=consent select_account` (explicit account selection)
  * `access_type=offline` (secure refresh token retrieval)
  * HMAC-SHA256 CSRF state tokens with a 10-minute expiry window
  * Deterministic account subject (`sub`) duplicate prevention

---

## 3. Cryptographic Storage & Security

* **AES-256-GCM Token Encryption:** Refresh tokens are encrypted using AES-256-GCM with a 96-bit random initialization vector (IV) and a 128-bit authentication tag before storage.
* **Zero Raw Token Exposure:** Raw OAuth refresh tokens and client secrets are never sent in frontend bundles or responses.
* **On-Demand Gmail Fetching:** Message bodies and attachments are fetched in real-time from the official Gmail API and are never permanently stored on disk or in the database.
* **HTML Sanitization:** Email contents and Takeout HTML views are sanitized with `DOMPurify` (blocking scripts, frames, and tracking pixels).
* **Takeout Archive Safeguards:** ZIP extractions enforce path-traversal guards (`..` rejection) and a strict 50MB uncompressed ceiling to mitigate decompression bombs.

---

## 4. Google Cloud & OAuth Configuration Guide

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** &rarr; **New Project**. Name it `account-command-center`.

### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services &rarr; OAuth consent screen**.
2. Select **External** (or Internal if using a Google Workspace organization).
3. Set Application Name to `Account Command Center` and specify your administrator email.
4. If the publishing status is **Testing**, go to the **Test Users** tab and add every personal Google account you plan to connect.

### Step 3: Create OAuth 2.0 Web Credentials
1. Navigate to **APIs & Services &rarr; Credentials**.
2. Click **Create Credentials &rarr; OAuth client ID**.
3. Select **Web application**.
4. In **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   *(Or your production Cloud Run URL + `/api/auth/google/callback`)*.
5. Copy your **Client ID** and **Client Secret**.

### Step 4: Enable the Gmail API
1. Navigate to **APIs & Services &rarr; Enabled APIs & services &rarr; Enable APIs and Services**.
2. Search for **Gmail API** and click **Enable**.
3. Required Scopes:
   * `openid`
   * `email`
   * `profile`
   * `https://www.googleapis.com/auth/gmail.readonly`

> **Restricted Scope Verification Notice:** `gmail.readonly` is a Google Restricted Scope. For public commercial multi-tenant use, Google requires App Verification and a third-party CASA Tier 2 security assessment. For private personal administrator use within your own project, keep the publishing status in **Testing** with your authorized accounts listed as **Test Users**.

---

## 5. Environment Variables (`.env`)

Configure the following variables in your server environment:

```bash
# Administrator Authorization
ADMIN_EMAIL="hillssinaitab20@gmail.com"

# Google Cloud OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Cryptographic Token Encryption Key (AES-256-GCM)
TOKEN_ENCRYPTION_KEY="your_32_byte_hex_or_base64_encryption_secret_key"

# Session Security Secret
SESSION_SECRET="secure_random_session_signing_secret"
```

---

## 6. Takeout Import Engine Instructions

To import your personal YouTube or Google Search history:
1. Visit [takeout.google.com](https://takeout.google.com).
2. Click **Deselect all**, then check:
   * **YouTube and YouTube Music** &rarr; select **history** (JSON format recommended).
   * **My Activity** &rarr; select **Search** (JSON format recommended).
3. Download the generated archive (`.zip`, `.json`, or `.html`).
4. In **Account Command Center**, click **Import Takeout**.
5. Select the target connected account and upload the archive.
6. The engine parses the records, hashes deterministic fingerprints to eliminate duplicates, and maps them chronologically to the account.

---

## 7. Testing & Verification

Run the full automated test suite:
```bash
npm test
```

The automated test suite verifies:
* Administrator email normalization and rejection of unauthorized accounts
* AES-256-GCM encryption, decryption, and authentication tag tamper detection
* OAuth state generation, HMAC signing, CSRF protection, and expiration
* Account isolation and subcollection separation
* Takeout JSON and HTML parsing with duplicate fingerprinting
* Privacy purging and record deletion
* Immutable application activity logging

---

## 8. Deployment

To build and start for production:
```bash
npm run build
npm start
```
The server binds to port `3000` (or `process.env.PORT`) serving both the API backend and optimized static React bundle.
