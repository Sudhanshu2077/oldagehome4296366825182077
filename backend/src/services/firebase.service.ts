import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config/env.js';
import { getLogger } from '../config/logger.js';

export interface DecodedFirebaseToken {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  name: string | undefined;
  picture: string | undefined;
  issuer: string;
  audience: string;
  authTime: number;
  iat: number;
  exp: number;
  signInProvider: string | undefined;
  firebase: Record<string, unknown>;
}

let initializedApp: admin.app.App | null = null;
let initializationFailure: Error | null = null;

export function initFirebaseAdmin(): admin.app.App | null {
  if (initializedApp) return initializedApp;
  if (initializationFailure) return null;

  const cfg = loadConfig();
  const logger = getLogger();
  const saPath = resolve(process.cwd(), cfg.firebaseServiceAccountPath);

  if (!existsSync(saPath)) {
    logger.warn({ path: cfg.firebaseServiceAccountPath }, 'firebase service account not found; token verification disabled until present');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8')) as admin.ServiceAccount;
    initializedApp = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
      },
      'old-age-home-backend',
    );
    logger.info({ projectId: serviceAccount.projectId }, 'firebase admin initialized');
    return initializedApp;
  } catch (err) {
    initializationFailure = err as Error;
    logger.error({ err }, 'firebase admin initialization failed; verification disabled');
    return null;
  }
}

export function getFirebaseApp(): admin.app.App | null {
  return initializedApp;
}

export function isFirebaseEnabled(): boolean {
  return initializedApp !== null;
}

export function resetFirebaseForTests(): void {
  if (initializedApp) {
    void initializedApp.delete();
  }
  initializedApp = null;
  initializationFailure = null;
}

export async function verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
  const app = initFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized; cannot verify ID token');
  }

  const decoded = await app.auth().verifyIdToken(idToken, true);
  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified ?? false,
    name: decoded.name,
    picture: decoded.picture,
    issuer: decoded.iss,
    audience: decoded.aud,
    authTime: decoded.auth_time,
    iat: decoded.iat,
    exp: decoded.exp,
    signInProvider: decoded.firebase?.sign_in_provider,
    firebase: (decoded.firebase as Record<string, unknown> | undefined) ?? {},
  };
}

export async function verifyIdTokenSafe(
  idToken: string,
): Promise<{ ok: true; token: DecodedFirebaseToken } | { ok: false; reason: 'disabled' | 'invalid' }> {
  const app = initFirebaseAdmin();
  if (!app) return { ok: false, reason: 'disabled' };
  try {
    const token = await verifyIdToken(idToken);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

