import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../services/firebaseAdmin";

export async function verifyToken(req: Request & { uid?: string }, res: Response, next: NextFunction) {
  const authHeader = (req.header("authorization") || req.header("Authorization") || "").toString();
  if (authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.split(" ")[1];
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      (req as any).uid = decoded.uid;
      return next();
    } catch (err) {
      console.warn("Failed to verify token:", err);
      return res.status(401).json({ error: "Invalid token" });
    }
  }
  const devUid = req.header("x-user-id");
  if (devUid) { (req as any).uid = devUid; return next(); }
  return res.status(401).json({ error: "Missing auth token" });
}
