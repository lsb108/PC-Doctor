import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { contents, config, customKey, model } = req.body;
    
    // Priority: Custom key passed from client -> Environment Variable
    let apiKey = customKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (apiKey === "MY_GEMINI_API_KEY" || !apiKey) {
      apiKey = "";
    }

    if (!apiKey) {
      return res.status(400).json({ error: "MISSING_API_KEY" });
    }

    const genAI = new GoogleGenAI({ apiKey });
    const modelName = model || "gemini-1.5-flash";
    
    // Merge system instruction into the first message for better compatibility
    const finalContents = [...contents];
    if (config?.systemInstruction) {
      finalContents.unshift({
        role: "user",
        parts: [{ text: `SYSTEM INSTRUCTION: ${config.systemInstruction}\n\nPlease follow this instruction for the entire conversation.` }]
      });
      // Add a dummy model response to keep the user/model alternation if needed
      finalContents.splice(1, 0, {
        role: "model",
        parts: [{ text: "Understood. I will follow those instructions." }]
      });
    }

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: finalContents,
      config: {
        temperature: config?.temperature ?? 0.7,
      }
    });

    res.status(200).json({ text: result.text });
  } catch (error: any) {
    console.error("Vercel Gemini Error:", error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error",
      details: error.toString()
    });
  }
}
