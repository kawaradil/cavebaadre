import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';

export const appCheckContext = new AsyncLocalStorage<{ appCheckToken?: string }>();

export function getActiveAppCheckToken(): string | undefined {
  return appCheckContext.getStore()?.appCheckToken;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
  PROJECT_ID
)}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

/**
 * Local server-only security store for data that must be accessible to the backend
 * even when no client ID token is present (e.g., checking whether an email belongs to
 * a Super Admin or Admin before sending a password reset link, or verifying encrypted
 * recovery codes in admin_recovery_vault).
 */
const DATA_DIR = path.resolve(__dirname, '.data');
const STORE_FILE = path.join(DATA_DIR, 'security_store.json');

export interface LocalSecurityStore {
  users: Record<string, Record<string, any>>;
  citizens: Record<string, Record<string, any>>;
  admins: Record<string, Record<string, any>>;
  super_admins: Record<string, Record<string, any>>;
  admin_recovery_vault: Record<string, Record<string, any>>;
  system_config: Record<string, Record<string, any>>;
  audit_logs: Array<Record<string, any>>;
  notification_dispatch_locks: Record<string, Record<string, any>>;
  user_fcm_tokens: Record<string, Record<string, any>>;
  password_reset_limits?: Record<string, { count: number; windowStartMs: number; updatedAt: string }>;
  password_reset_wrong_attempts?: Record<
    string,
    { count: number; windowStartMs: number; lockedUntilMs?: number; updatedAt: string }
  >;
}

function getDefaultStore(): LocalSecurityStore {
  return {
    users: {},
    citizens: {},
    admins: {},
    super_admins: {},
    admin_recovery_vault: {},
    system_config: {},
    audit_logs: [],
    notification_dispatch_locks: {},
    user_fcm_tokens: {},
    password_reset_limits: {},
    password_reset_wrong_attempts: {},
  };
}

export function readLocalStore(): LocalSecurityStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const store: LocalSecurityStore = { ...getDefaultStore(), ...parsed };
      let modified = false;
      for (const [id, c] of Object.entries(store.citizens || {})) {
        const cleanEmail = String(c?.email || '').trim();
        if (/^[0-9]+$/.test(id) || id.startsWith('visitor_') || !cleanEmail.includes('@')) {
          delete store.citizens[id];
          modified = true;
        }
      }
      for (const [uid, u] of Object.entries(store.users || {})) {
        const cleanEmail = String(u?.email || '').trim();
        if (/^[0-9]+$/.test(uid) || uid.startsWith('visitor_') || !cleanEmail.includes('@')) {
          delete store.users[uid];
          modified = true;
        }
      }
      if (modified) {
        writeLocalStore(store);
      }
      return store;
    }
  } catch {}
  return getDefaultStore();
}

export function writeLocalStore(store: LocalSecurityStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {}
}

/**
 * Converts a JS value to Firestore REST API Value object
 */
export function toFirestoreValue(val: any): Record<string, any> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Converts a Firestore REST API Value object back to a plain JS value
 */
export function fromFirestoreValue(valObj: any): any {
  if (!valObj || typeof valObj !== 'object') return null;
  if ('nullValue' in valObj) return null;
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('timestampValue' in valObj) return String(valObj.timestampValue);
  if ('arrayValue' in valObj) {
    const vals = valObj.arrayValue?.values;
    return Array.isArray(vals) ? vals.map(fromFirestoreValue) : [];
  }
  if ('mapValue' in valObj) {
    const fields = valObj.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

export function fromFirestoreDocument(docObj: any): { id: string; data: Record<string, any> } | null {
  if (!docObj || !docObj.name) return null;
  const parts = String(docObj.name).split('/');
  const id = parts[parts.length - 1];
  const fields = docObj.fields || {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return { id, data };
}

let firestoreAppCheckEnforcedOnServer = false;

function buildAuthHeaders(idToken?: string): { headers: Record<string, string>; hasAppCheck: boolean } {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  const appCheckToken = getActiveAppCheckToken();
  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }
  return { headers, hasAppCheck: Boolean(appCheckToken) };
}

function shouldSkipUnverifiedRestRequest(hasAppCheck: boolean): boolean {
  return firestoreAppCheckEnforcedOnServer && !hasAppCheck;
}

function recordRestResponseStatus(status: number, hasAppCheck: boolean): void {
  if ((status === 401 || status === 403) && !hasAppCheck) {
    firestoreAppCheckEnforcedOnServer = true;
  }
}

/**
 * Fetches a single document via Firestore REST API (no gRPC connection)
 */
export async function restGetDoc(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<Record<string, any> | null> {
  try {
    const { headers, hasAppCheck } = buildAuthHeaders(idToken);
    if (shouldSkipUnverifiedRestRequest(hasAppCheck)) return null;

    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      recordRestResponseStatus(res.status, hasAppCheck);
      return null;
    }
    const json = await res.json();
    const parsed = fromFirestoreDocument(json);
    return parsed ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Lists documents in a collection via Firestore REST API (no gRPC connection)
 */
export async function restListDocs(
  collectionName: string,
  idToken?: string,
  pageSize = 50
): Promise<Array<{ id: string; data: Record<string, any> }>> {
  try {
    const { headers, hasAppCheck } = buildAuthHeaders(idToken);
    if (shouldSkipUnverifiedRestRequest(hasAppCheck)) return [];

    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}?pageSize=${pageSize}`;
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      recordRestResponseStatus(res.status, hasAppCheck);
      return [];
    }
    const json = await res.json();
    const docs = Array.isArray(json.documents) ? json.documents : [];
    return docs
      .map((d: any) => fromFirestoreDocument(d))
      .filter((d: any): d is { id: string; data: Record<string, any> } => d !== null);
  } catch {
    return [];
  }
}

/**
 * Creates or updates (patches) a document via Firestore REST API (no gRPC connection)
 */
export async function restSetDoc(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  idToken?: string,
  merge = true
): Promise<boolean> {
  try {
    const { headers, hasAppCheck } = buildAuthHeaders(idToken);
    if (shouldSkipUnverifiedRestRequest(hasAppCheck)) return false;

    const fields: Record<string, any> = {};
    const fieldPaths: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
        fieldPaths.push(`updateMask.fieldPaths=${encodeURIComponent(k)}`);
      }
    }

    const queryString = merge && fieldPaths.length > 0 ? `?${fieldPaths.join('&')}` : '';
    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${queryString}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      recordRestResponseStatus(res.status, hasAppCheck);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a document via Firestore REST API (no gRPC connection)
 */
export async function restDeleteDoc(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<boolean> {
  try {
    const { headers, hasAppCheck } = buildAuthHeaders(idToken);
    if (shouldSkipUnverifiedRestRequest(hasAppCheck)) return false;

    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      recordRestResponseStatus(res.status, hasAppCheck);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
