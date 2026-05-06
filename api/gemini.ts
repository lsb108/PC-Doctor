import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { contents, config, customKey, model } = req.body;
    
    // Priority: Client-side Key -> Vercel Environment Variable
    let apiKey = customKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "MISSING_API_KEY" });
    }

    const genAI = new GoogleGenAI({ apiKey });
    const modelName = model || "gemini-1.5-flash";
    
    // Ensure contents is an array and properly structured
    const finalContents = Array.isArray(contents) ? [...contents] : [];

    // Inject system instruction if provided, handling compatibility
    if (config?.systemInstruction) {
      finalContents.unshift({
        role: "user",
        parts: [{ text: `INSTRUCTION: ${config.systemInstruction}\n\nApply this to all following inputs.` }]
      });
      finalContents.splice(1, 0, {
        role: "model",
        parts: [{ text: "I understand and will perform the analysis based on those instructions." }]
      });
    }

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: finalContents,
      config: {
        temperature: config?.temperature ?? 0.7,
      }
    });

    if (!result || !result.text) {
      throw new Error("No response from AI core.");
    }

    res.status(200).json({ text: result.text });
  } catch (error: any) {
    console.error("Vercel AI Error:", error);
    
    // Check for specific model not found error and try fallback if needed
    const errorMessage = error.message || "";
    if (errorMessage.includes("not found") || errorMessage.includes("not supported")) {
      return res.status(404).json({ 
        error: "MODEL_NOT_FOUND", 
        details: "AI model not found. This might be a temporary regional issue." 
      });
    }

    res.status(500).json({ 
      error: errorMessage || "Internal Server Error"
    });
  }
}
