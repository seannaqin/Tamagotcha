import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT ||
  "";
const envKeyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "";
const defaultKeyPath = path.resolve(process.cwd(), "config/service-account.json");
const normalizedEnvKeyPath = envKeyPath.trim();
const isPlaceholderPath =
  normalizedEnvKeyPath === "/path/to/service-account.json" ||
  normalizedEnvKeyPath.includes("REPLACE_ME");
const keyPath = !normalizedEnvKeyPath || isPlaceholderPath ? defaultKeyPath : normalizedEnvKeyPath;

if (normalizedEnvKeyPath && !fs.existsSync(normalizedEnvKeyPath)) {
  console.warn(
    "Configured GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_SERVICE_ACCOUNT_PATH does not exist:",
    normalizedEnvKeyPath,
    "- falling back to",
    defaultKeyPath
  );
}

if (fs.existsSync(keyPath)) {
  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId || serviceAccount.project_id || undefined,
  });
  console.log("Initialized firebase-admin with service account", keyPath);
} else {
  // If running in a dev environment (emulator) this will still work; admin will pick up emulator env vars
  try {
    admin.initializeApp({ projectId: projectId || undefined });
    console.log("Initialized firebase-admin (applicationDefault or emulator)");
  } catch (e) {
    // If already initialized elsewhere, ignore
    try { admin.app(); } catch (err) { /* ignore */ }
  }
}

try {
  const currentApp = admin.app();
  console.log("firebase-admin app name=", currentApp.name);
} catch (e) {
  console.warn("Unable to read admin app info:", e);
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
