/**
 * Firebase Admin SDK Configuration
 * Connects to Cloud Firestore & Firebase Auth.
 * Includes seamless fallback storage engine so the backend starts immediately.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let authInstance = null;
let dbInstance = null;
let isFirebaseInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    authInstance = admin.auth();
    dbInstance = admin.firestore();
    isFirebaseInitialized = true;
    console.log('✅ [SaveIQ Firebase] Connected to Cloud Firestore & Firebase Auth successfully.');
  } else {
    console.log('ℹ️ [SaveIQ Firebase] Live credentials not provided in .env. Initializing local embedded Firestore storage engine.');
  }
} catch (err) {
  console.warn('⚠️ [SaveIQ Firebase] Admin initialization warning:', err.message);
}

// Local Embedded Firestore Emulator for immediate out-of-the-box local operation
class LocalCollection {
  constructor(name, dataFile) {
    this.name = name;
    this.dataFile = dataFile;
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      }
    } catch (e) {}
    return [];
  }

  save() {
    try {
      const dir = path.dirname(this.dataFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving local collection:', e);
    }
  }

  doc(id) {
    const self = this;
    return {
      async get() {
        const item = self.data.find(d => (d.id || d.userId || d.goalId || d.notificationId) === id);
        return {
          exists: !!item,
          id,
          data: () => (item ? { ...item } : null)
        };
      },
      async set(data, options = {}) {
        const idx = self.data.findIndex(d => (d.id || d.userId || d.goalId || d.notificationId) === id);
        const record = { id, ...data };
        if (idx !== -1) {
          self.data[idx] = options.merge ? { ...self.data[idx], ...record } : record;
        } else {
          self.data.push(record);
        }
        self.save();
        return { id };
      },
      async update(data) {
        const idx = self.data.findIndex(d => (d.id || d.userId || d.goalId || d.notificationId) === id);
        if (idx !== -1) {
          self.data[idx] = { ...self.data[idx], ...data };
          self.save();
          return { id };
        }
        throw new Error('Document not found');
      },
      async delete() {
        self.data = self.data.filter(d => (d.id || d.userId || d.goalId || d.notificationId) !== id);
        self.save();
        return { success: true };
      }
    };
  }

  where(field, op, val) {
    let filtered = [...this.data];
    if (op === '==' || op === '===') {
      filtered = filtered.filter(d => d[field] === val);
    }
    return {
      where: (f2, op2, v2) => this.where(field, op, val),
      orderBy: () => ({
        get: async () => ({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({
            id: d.id || d.goalId || d.userId || d.notificationId,
            data: () => ({ ...d })
          }))
        })
      }),
      get: async () => ({
        empty: filtered.length === 0,
        docs: filtered.map(d => ({
          id: d.id || d.goalId || d.userId || d.notificationId,
          data: () => ({ ...d })
        }))
      })
    };
  }

  async get() {
    return {
      empty: this.data.length === 0,
      docs: this.data.map(d => ({
        id: d.id || d.goalId || d.userId || d.notificationId,
        data: () => ({ ...d })
      }))
    };
  }
}

class LocalFirestore {
  constructor() {
    this.storageDir = path.join(__dirname, '../../data');
    this.collections = {};
  }

  collection(name) {
    if (!this.collections[name]) {
      const file = path.join(this.storageDir, `${name}.json`);
      this.collections[name] = new LocalCollection(name, file);
    }
    return this.collections[name];
  }
}

const localDb = new LocalFirestore();

module.exports = {
  admin,
  auth: authInstance,
  db: dbInstance || localDb,
  isFirebaseInitialized,
  isLiveFirebase: () => isFirebaseInitialized
};
