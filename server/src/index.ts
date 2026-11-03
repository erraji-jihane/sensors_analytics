import express, { type Request, type Response } from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3001);
const PYTHON = process.env.PYTHON ?? "python3";
const SERVICE = path.resolve(__dirname, "..", "..", "python", "service.py");
const TIMEOUT_MS = 15_000;

type Reading = { temperature: number; vibration: number; pressure: number; rpm: number };

/** Runs one request through python/service.py (JSON in on stdin, JSON out on stdout). */
function runService(payload: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SERVICE], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("analytics service timed out"));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(stdout);
        result.error ? reject(new Error(result.error)) : resolve(result);
      } catch {
        reject(new Error(stderr.trim() || "analytics service returned invalid output"));
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

/** Accepts the dashboard's short keys and checks every value is a finite number. */
function parseReading(body: any): Reading {
  const source = {
    temperature: body?.temperature ?? body?.temp,
    vibration: body?.vibration ?? body?.vib,
    pressure: body?.pressure ?? body?.press,
    rpm: body?.rpm,
  };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`'${key}' must be a number`);
    }
  }
  return source as Reading;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/api/predict", async (req: Request, res: Response) => {
  let reading: Reading;
  try {
    reading = parseReading(req.body);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }
  try {
    const result = await runService({ action: "predict", reading });
    res.json({
      ...result,
      prediction: result.probability, // kept for older clients
      message: result.outOfRange.length ? "OUT OF RANGE" : result.isFault ? "⚠️ FAULT DETECTED" : "✅ MACHINE NORMAL",
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/similarity", async (req: Request, res: Response) => {
  let reading: Reading;
  try {
    reading = parseReading(req.body);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }
  try {
    res.json(await runService({ action: "similarity", reading }));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// The overview only depends on the fixed data and parameters, so compute it once.
let overviewCache: Promise<any> | null = null;
app.get("/api/overview", async (_req: Request, res: Response) => {
  overviewCache ??= runService({ action: "overview" }).catch((e) => {
    overviewCache = null;
    throw e;
  });
  try {
    res.json(await overviewCache);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
