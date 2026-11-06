/**
 * Comprehensive Automated Test Suite for Account Command Center
 */

import {
  encryptToken,
  decryptToken,
  createOAuthState,
  verifyOAuthState,
  generateRecordFingerprint,
  hashPassword,
  verifyPassword,
  signAdminToken,
  verifyAdminToken,
} from '../server/crypto.ts';
import { Storage } from '../server/storage.ts';
import { parseTakeoutJsonString, parseTakeoutHtmlString } from '../server/takeoutParser.ts';
import {
  ADMIN_EMAIL,
  ADMIN_USERNAME,
  authenticateAdminCredentials,
} from '../server/authMiddleware.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('ACCOUNT COMMAND CENTER - AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // Test 1: Administrator Username & Password Authentication
  console.log('[Test Category: Username & Password Authentication (admin / Zetta@admin)]');
  assert(ADMIN_USERNAME === 'admin', 'Configured administrator username is admin');

  const validLogin = authenticateAdminCredentials('admin', 'Zetta@admin');
  assert(validLogin.success === true, 'Admin login succeeds with username admin and password Zetta@admin');

  const caseInsensitiveLogin = authenticateAdminCredentials('ADMIN', 'Zetta@admin');
  assert(caseInsensitiveLogin.success === true, 'Admin login handles case-insensitive username');

  const emailLogin = authenticateAdminCredentials('hillssinaitab20@gmail.com', 'Zetta@admin');
  assert(emailLogin.success === true, 'Admin login allows contact email as identifier with correct password');

  const wrongPasswordLogin = authenticateAdminCredentials('admin', 'WrongPass123!');
  assert(wrongPasswordLogin.success === false, 'Admin login strictly rejects incorrect password');

  const wrongUserLogin = authenticateAdminCredentials('unauthorized_user', 'Zetta@admin');
  assert(wrongUserLogin.success === false, 'Admin login strictly rejects unauthorized username');

  // Test 2: Password Hashing & Scrypt Verification
  console.log('\n[Test Category: Password Hashing (scrypt) & Constant-Time Verification]');
  const hashed = hashPassword('Zetta@admin');
  assert(hashed.hash.length === 128, 'Password hash is 64 bytes (128 hex chars)');
  assert(verifyPassword('Zetta@admin', hashed.hash, hashed.salt), 'Valid password verified by scrypt');
  assert(!verifyPassword('BadPassword', hashed.hash, hashed.salt), 'Invalid password rejected by scrypt');

  // Test 3: Signed Administrator Session Token (HMAC-SHA256)
  console.log('\n[Test Category: Administrator Session Tokens]');
  const token = signAdminToken({
    uid: 'admin-1',
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
  });
  assert(typeof token === 'string' && token.split('.').length === 3, 'Signed session token generated in compact format');

  const verified = verifyAdminToken(token);
  assert(verified.valid === true && verified.payload.username === 'admin', 'Valid session token verified and payload extracted');

  const tamperedToken = token.slice(0, -6) + 'ABCDEF';
  const tamperedVerified = verifyAdminToken(tamperedToken);
  assert(!tamperedVerified.valid, 'Tampered session token signature rejected');

  // Test 4: Cryptographic Token Encryption & Decryption (AES-256-GCM)
  console.log('\n[Test Category: AES-256-GCM Cryptographic Token Storage]');
  const sampleRefreshToken = '1//0gExampleRefreshTokenSecured1234567890';
  const encrypted = encryptToken(sampleRefreshToken);
  assert(encrypted.encryptedData !== sampleRefreshToken, 'Ciphertext is transformed and not plaintext');
  assert(!!encrypted.iv && !!encrypted.authTag, 'Initialization vector and GCM authentication tag generated');

  const decrypted = decryptToken(encrypted.encryptedData, encrypted.iv, encrypted.authTag);
  assert(decrypted === sampleRefreshToken, 'Decrypted token exactly matches original secret');

  // Tamper detection in GCM
  let tamperedCaught = false;
  try {
    const corruptedCipher = 'ff' + encrypted.encryptedData.slice(2);
    decryptToken(corruptedCipher, encrypted.iv, encrypted.authTag);
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered ciphertext rejected by GCM authentication tag validation');

  // Test 5: OAuth State Validation & CSRF Protection
  console.log('\n[Test Category: OAuth State CSRF & Expiry Validation]');
  const state = createOAuthState('/accounts');
  const validCheck = verifyOAuthState(state);
  assert(validCheck.valid && validCheck.redirectPath === '/accounts', 'Valid state token decoded and signature verified');

  const tamperedState = state.slice(0, -4) + 'AAAA';
  const invalidCheck = verifyOAuthState(tamperedState);
  assert(!invalidCheck.valid, 'Tampered state token rejected');

  // Test 6: Account Separation & Storage
  console.log('\n[Test Category: Account Separation & Data Isolation]');
  const testAccountA = {
    accountId: 'test-acc-A-1001',
    email: 'acc.a@gmail.com',
    name: 'Account A',
    status: 'connected' as const,
    scope: 'openid email profile',
    connectedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    services: ['gmail'],
  };
  const testAccountB = {
    accountId: 'test-acc-B-2002',
    email: 'acc.b@gmail.com',
    name: 'Account B',
    status: 'connected' as const,
    scope: 'openid email profile',
    connectedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    services: ['gmail'],
  };

  Storage.saveAccount(testAccountA);
  Storage.saveAccount(testAccountB);

  const fetchedA = Storage.getAccount('test-acc-A-1001');
  const fetchedB = Storage.getAccount('test-acc-B-2002');
  assert(fetchedA?.email === 'acc.a@gmail.com', 'Account A fetched strictly by unique accountId');
  assert(fetchedB?.email === 'acc.b@gmail.com', 'Account B fetched strictly by unique accountId');
  assert(fetchedA?.accountId !== fetchedB?.accountId, 'Accounts remain strictly isolated');

  // Test 7: Takeout Parsing, Normalization & Duplicate Prevention
  console.log('\n[Test Category: Takeout Parser, Normalization & Fingerprinting]');
  const sampleJsonTakeout = JSON.stringify([
    {
      header: 'YouTube',
      title: 'Watched Space Exploration & Falcon Heavy Launch',
      titleUrl: 'https://www.youtube.com/watch?v=launch123',
      subtitles: [{ name: 'SpaceX', url: 'https://youtube.com/@spacex' }],
      time: '2026-04-10T15:00:00.000Z',
    },
    {
      header: 'Search',
      title: 'Searched for kubernetes zero trust security policies',
      titleUrl: 'https://www.google.com/search?q=kubernetes+security',
      time: '2026-04-10T16:00:00.000Z',
    },
  ]);

  const parsedJson = parseTakeoutJsonString(sampleJsonTakeout, 'test-takeout.json', 'test-acc-A-1001');
  assert(parsedJson.youtubeRecords.length === 1, 'YouTube record extracted from JSON');
  assert(parsedJson.youtubeRecords[0].title === 'Space Exploration & Falcon Heavy Launch', 'YouTube title cleaned');
  assert(parsedJson.searchRecords.length === 1, 'Google Search record extracted from JSON');
  assert(parsedJson.searchRecords[0].query === 'kubernetes zero trust security policies', 'Search query cleaned');

  // Duplicate Fingerprint Detection
  const addRes1 = Storage.addYouTubeRecords('test-acc-A-1001', parsedJson.youtubeRecords);
  assert(addRes1.added === 1 && addRes1.duplicates === 0, 'First import of YouTube records adds 1 item');

  const addRes2 = Storage.addYouTubeRecords('test-acc-A-1001', parsedJson.youtubeRecords);
  assert(addRes2.added === 0 && addRes2.duplicates === 1, 'Duplicate YouTube import safely skipped');

  // Test 8: Deletion & Cleanup
  console.log('\n[Test Category: Data Deletion & Privacy Controls]');
  const deletedCount = Storage.deleteYouTubeRecords('test-acc-A-1001');
  assert(deletedCount === 1, 'All YouTube records for account deleted successfully');
  
  Storage.deleteAccount('test-acc-A-1001');
  Storage.deleteAccount('test-acc-B-2002');
  assert(!Storage.getAccount('test-acc-A-1001'), 'Account record cleaned up from storage');

  // Test 9: Activity Log Integrity
  console.log('\n[Test Category: Application Audit Activity Logging]');
  const log = Storage.logActivity({
    type: 'login',
    accountEmail: 'admin',
    status: 'success',
    summary: 'Automated test suite audit verification executed for admin login',
  });
  assert(!!log.id && log.type === 'login', 'Activity log written with unique identifier');

  console.log('\n======================================================');
  console.log(`TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
