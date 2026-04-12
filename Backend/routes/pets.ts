import { Router, Request, Response } from "express";
import admin, { adminDb } from "../services/firebaseAdmin";

const router = Router();

router.get("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const snap = await adminDb.collection("pets").where("ownerId", "==", userId).get();
    const pets: any[] = [];
    snap.forEach((d: any) => pets.push({ id: d.id, ...d.data() }));
    return res.json({ pets });
  } catch (err:any) {
    console.error('GET /pets error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  const { name, age = 0, health = 100 } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  if (!name) return res.status(400).json({ error: "Missing pet name" });
  try {
    const docRef = await adminDb.collection("pets").add({
      ownerId: userId,
      name,
      age,
      health,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ id: docRef.id });
  } catch (err:any) {
    console.error('POST /pets error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:petId", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  const petIdRaw = req.params.petId;
  const petId = Array.isArray(petIdRaw) ? petIdRaw[0] : String(petIdRaw);
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const snap = await adminDb.collection("pets").doc(petId).get();
    if (!snap.exists) return res.status(404).json({ error: "Pet not found" });
    const data: any = snap.data();
    if (data.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    return res.json({ id: snap.id, ...data });
  } catch (err:any) {
    console.error('GET /pets/:petId error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:petId", async (req: Request & { uid?: string }, res: Response) => {
  const userId = req.uid || req.header("x-user-id") || req.body.ownerId;
  const petIdRaw = req.params.petId;
  const petId = Array.isArray(petIdRaw) ? petIdRaw[0] : String(petIdRaw);
  const { name, age, health } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing user id" });
  try {
    const petRef = adminDb.collection("pets").doc(petId);
    const snap = await petRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Pet not found" });
    const data: any = snap.data();
    if (data.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    const updates: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) updates.name = name;
    if (age !== undefined) updates.age = age;
    if (health !== undefined) updates.health = health;
    await petRef.update(updates);
    return res.json({ message: "Pet updated" });
  } catch (err:any) {
    console.error('PATCH /pets/:petId error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || String(err) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
