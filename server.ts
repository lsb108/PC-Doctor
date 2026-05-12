import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: '20mb' }));

  // API route - Gemini proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { contents, config, customKey, model } = req.body;
      
      // Priority: Custom key from client > Environment variables
      let apiKey = customKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ error: "MISSING_API_KEY" });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const modelName = model || "gemini-2.0-flash";
      
      // Build the request
      const requestConfig: any = {
        temperature: config?.temperature ?? 0.7,
      };

      // Handle system instruction properly
      if (config?.systemInstruction) {
        requestConfig.systemInstruction = config.systemInstruction;
      }

      const result = await genAI.models.generateContent({
        model: modelName,
        contents,
        config: requestConfig,
      });

      if (!result || !result.text) {
        return res.status(500).json({ error: "AI không trả về kết quả. Vui lòng thử lại." });
      }

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error.message || error);
      
      const errorMessage = error.message || "Internal Server Error";
      const statusCode = errorMessage.includes("API key") ? 401 : 500;
      
      res.status(statusCode).json({ 
        error: errorMessage,
      });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== "production") {
    // Development: use Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built files
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🩺 PC Doctor server running at http://localhost:${PORT}`);
  });
}

startServer();
