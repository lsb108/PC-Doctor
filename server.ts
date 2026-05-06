import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Load environment variables from .env file (if exists) and system
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API route for Gemini proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { contents, config, customKey } = req.body;
      
      // Priority: Custom key passed from client -> System Reserved Key -> Fallback
      let apiKey = customKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      
      if (apiKey === "MY_GEMINI_API_KEY" || !apiKey) {
        apiKey = "";
      }

      console.log(`[Gemini Proxy] Using key: ${apiKey ? (apiKey.substring(0, 8) + "...") : "MISSING"}`);

      if (!apiKey) {
        return res.status(400).json({ error: "MISSING_API_KEY" });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const modelName = req.body.model || "gemini-1.5-flash";
      
      const result = await genAI.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: config?.systemInstruction,
          temperature: config?.temperature ?? 0.7,
        }
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Server-side Gemini Error:", error);
      res.status(500).json({ 
        error: error.message || "Internal Server Error",
        details: error.toString()
      });
    }
  });

  // Add a health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
