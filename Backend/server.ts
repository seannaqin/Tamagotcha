import express from "express";
import petsRouter from "./routes/pets";
import sitesRouter from "./routes/sites";
import statsRouter from "./routes/stats";
import { verifyToken } from "./middleware/auth";

const app = express();
app.use(express.json());

// Authenticate requests (accepts x-user-id as fallback for dev)
app.use("/api/v1", verifyToken);

app.use("/api/v1/pets", petsRouter);
app.use("/api/v1/sites", sitesRouter);
app.use("/api/v1/stats", statsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server listening on ${PORT}`);
});

export default app;
