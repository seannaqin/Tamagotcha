import { Router, Request, Response } from "express";
import admin, { adminDb } from "../services/firebaseAdmin";

const router = Router();

// GET /sites
router.get("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const snap = await adminDb.collection("sites").where("ownerId", "==", userId).get();
    const sites: any[] = [];
    snap.forEach((d: any) => sites.push({ id: d.id, ...d.data() }));
    return res.json({ sites });
  } catch (err:any) {
    console.error('GET /sites error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /sites
router.post("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  const { name, address, usetime = 0 } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  if (!name || !address) return res.status(400).json({ error: "Missing name or address" });
  try {
    const docRef = await adminDb.collection("sites").add({ ownerId: userId, name, address, usetime, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(201).json({ id: docRef.id });
  } catch (err:any) {
    console.error('POST /sites error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /sites/:siteId
router.delete("/:siteId", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  const siteIdRaw = req.params.siteId;
  const siteId = Array.isArray(siteIdRaw) ? siteIdRaw[0] : String(siteIdRaw);
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const snap = await adminDb.collection("sites").doc(siteId).get();
    if (!snap.exists) return res.status(404).json({ error: "Site not found" });
    const data: any = snap.data();
    if (data.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    await adminDb.collection("sites").doc(siteId).delete();
    return res.json({ message: "Site deleted" });
  } catch (err:any) {
    console.error('DELETE /sites/:siteId error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
