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
    
    const genModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: config?.systemInstruction,
    });

    const result = await genModel.generateContent({
      contents,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
      }
    });

    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text });
  } catch (error: any) {
    console.error("Vercel Gemini Error:", error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error",
      details: error.toString()
    });
  }
}
