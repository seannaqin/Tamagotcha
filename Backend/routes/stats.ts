import { Router, Request, Response } from "express";
import admin, { adminDb } from "../services/firebaseAdmin";

const router = Router();

// POST /stats - upsert stats for user (timer events, health updates, etc.)
router.post("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  const payload = req.body;
  try {
    const dref = adminDb.collection("stats").doc(userId);
    await dref.set({ ...payload, ownerId: userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ message: "Stats successfully updated" });
  } catch (err:any) {
    console.error('POST /stats error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /stats - get stats for user
router.get("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const snap = await adminDb.collection("stats").doc(userId).get();
    if (!snap.exists) return res.json({ stats: {} });
    return res.json({ stats: snap.data() });
  } catch (err:any) {
    console.error('GET /stats error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
