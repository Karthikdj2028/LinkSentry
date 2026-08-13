import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test, { before, after, beforeEach } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from 'firebase/firestore';

const PROJECT_ID = 'linksentry-security-test';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');

let testEnv;

before(async () => {
  const rules = readFileSync(RULES_PATH, 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

// Helper sample scan payload
const sampleScan = (userId = 'user_a') => ({
  userId,
  type: 'url',
  input: 'https://example.com',
  url: 'https://example.com',
  domain: 'example.com',
  verdict: 'safe',
  riskScore: 0,
  confidence: 0.85,
  indicators: [],
  engine: 'LinkSentry V3.3 URL ML Engine',
  modelVersion: 'V3.3',
  source: 'web',
  createdAt: new Date(),
});

// ============================================================================
// 1. Unauthenticated Client Security
// ============================================================================
test('Unauthenticated: cannot read scan document in user subcollection', async () => {
  // Preload test data with admin context
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(unauthDb, 'users/user_a/scans/scan_1')));
});

test('Unauthenticated: cannot query or list scans in user subcollection', async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(unauthDb, 'users/user_a/scans')));
});

test('Unauthenticated: cannot create scan document in user subcollection', async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(unauthDb, 'users/user_a/scans/scan_new'), sampleScan('user_a')));
});

test('Unauthenticated: cannot update scan document in user subcollection', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(updateDoc(doc(unauthDb, 'users/user_a/scans/scan_1'), { verdict: 'suspicious' }));
});

test('Unauthenticated: cannot delete scan document in user subcollection', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(deleteDoc(doc(unauthDb, 'users/user_a/scans/scan_1')));
});

test('Unauthenticated: cannot read or write user profile document', async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(unauthDb, 'users/user_a')));
  await assertFails(setDoc(doc(unauthDb, 'users/user_a'), { email: 'user@example.com' }));
});

// ============================================================================
// 2. Owner Authorization (User A accessing User A's data)
// ============================================================================
test('Owner Access: User A can read their own scan document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(getDoc(doc(userADb, 'users/user_a/scans/scan_1')));
});

test('Owner Access: User A can list their own scan history collection', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(getDocs(collection(userADb, 'users/user_a/scans')));
});

test('Owner Access: User A can create a valid scan document in their own path', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(setDoc(doc(userADb, 'users/user_a/scans/scan_new'), sampleScan('user_a')));
});

test('Owner Access: User A can update their own scan document maintaining userId', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(updateDoc(doc(userADb, 'users/user_a/scans/scan_1'), {
    verdict: 'phishing',
    riskScore: 85,
    userId: 'user_a',
  }));
});

test('Owner Access: User A can delete their own scan document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(deleteDoc(doc(userADb, 'users/user_a/scans/scan_1')));
});

test('Owner Access: User A can read and write their own user profile document', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertSucceeds(setDoc(doc(userADb, 'users/user_a'), {
    email: 'user_a@linksentry.app',
    displayName: 'User A',
  }));
  await assertSucceeds(getDoc(doc(userADb, 'users/user_a')));
});

// ============================================================================
// 3. Cross-User Isolation (User A vs User B)
// ============================================================================
test('Cross-User Isolation: User A cannot read User B scan document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_b/scans/scan_b1'), sampleScan('user_b'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(getDoc(doc(userADb, 'users/user_b/scans/scan_b1')));
});

test('Cross-User Isolation: User A cannot list or query User B scan collection', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(getDocs(collection(userADb, 'users/user_b/scans')));
});

test('Cross-User Isolation: User A cannot create a scan in User B collection', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(setDoc(doc(userADb, 'users/user_b/scans/scan_fake'), sampleScan('user_b')));
  await assertFails(setDoc(doc(userADb, 'users/user_b/scans/scan_fake'), sampleScan('user_a')));
});

test('Cross-User Isolation: User A cannot update User B scan document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_b/scans/scan_b1'), sampleScan('user_b'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(updateDoc(doc(userADb, 'users/user_b/scans/scan_b1'), { verdict: 'safe', userId: 'user_b' }));
});

test('Cross-User Isolation: User A cannot delete User B scan document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_b/scans/scan_b1'), sampleScan('user_b'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(deleteDoc(doc(userADb, 'users/user_b/scans/scan_b1')));
});

test('Cross-User Isolation: User A cannot read or write User B profile document', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_b'), { email: 'user_b@linksentry.app' });
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(getDoc(doc(userADb, 'users/user_b')));
  await assertFails(setDoc(doc(userADb, 'users/user_b'), { email: 'tampered@evil.com' }));
});

// ============================================================================
// 4. Ownership Spoofing & UID Manipulation
// ============================================================================
test('UID Manipulation: User A cannot create scan in User A path with spoofed userId field', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  // Payload has userId: 'user_b' while path is /users/user_a/scans/scan_spoof
  await assertFails(setDoc(doc(userADb, 'users/user_a/scans/scan_spoof'), sampleScan('user_b')));
});

test('UID Manipulation: User A cannot create scan missing userId field', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  const invalidPayload = {
    type: 'url',
    url: 'https://example.com',
    verdict: 'safe',
  };
  await assertFails(setDoc(doc(userADb, 'users/user_a/scans/scan_missing_uid'), invalidPayload));
});

test('UID Manipulation: User A cannot update scan to transfer ownership to User B', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user_a/scans/scan_1'), sampleScan('user_a'));
  });

  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(updateDoc(doc(userADb, 'users/user_a/scans/scan_1'), {
    userId: 'user_b',
  }));
});

// ============================================================================
// 5. Default Deny-All on Unspecified Collections
// ============================================================================
test('Default Deny: Authenticated user cannot access top-level unmanaged collections', async () => {
  const userADb = testEnv.authenticatedContext('user_a').firestore();
  await assertFails(getDoc(doc(userADb, 'admin/config')));
  await assertFails(setDoc(doc(userADb, 'audit_logs/log_1'), { action: 'test' }));
  await assertFails(getDocs(collection(userADb, 'system')));
  await assertFails(getDoc(doc(userADb, 'scans/root_scan')));
});
