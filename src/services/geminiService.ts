import { GoogleGenAI } from "@google/genai";

export async function getPCDiagnostics(
  imageContent: string | null,
  userDescription: string,
  history: { role: 'user' | 'model'; text: string }[],
  customKey?: string
) {
  try {
    const contents = [];
    
    // Add history while ensuring role alternation
    for (const msg of history) {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    }

    const currentParts: any[] = [
      { text: `Bạn là một bác sĩ máy tính siêu đẳng. Mô tả của người dùng: ${userDescription}. Hãy đưa ra chẩn đoán cụ thể và lời khuyên sửa chữa bằng tiếng Việt.` }
    ];

    if (imageContent) {
      currentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageContent.split(",")[1],
        },
      });
    }

    contents.push({ role: "user", parts: currentParts });

    const serverResponse = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        contents: contents,
        customKey,
        config: {
          systemInstruction: "Bạn là một kỹ thuật viên PC chuyên nghiệp. Ngôn ngữ: Tiếng Việt. Phân tích kỹ các dấu hiệu hư hỏng phần cứng.",
          temperature: 0.7,
        }
      }),
    });

    if (!serverResponse.ok) {
      const errorData = await serverResponse.json();
      throw new Error(errorData.error || "Lỗi từ server AI");
    }

    const data = await serverResponse.json();
    return data.text || "Tôi không nhận được phản hồi từ bộ não AI.";
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    const errorMessage = error.message || "";
    
    if (errorMessage.includes("API key not valid") || errorMessage.includes("key is missing") || errorMessage === "MISSING_API_KEY") {
      return "⚠️ **Lỗi kết nối bộ não AI.**\n\nCó vẻ như cấu hình 'AI Studio Free Tier' chưa được kích hoạt thành công. Bạn hãy thử:\n1. Tạo API Key riêng tại [aistudio.google.com](https://aistudio.google.com/app/apikey).\n2. Nhấn vào biểu tượng **Cài đặt (răng cưa)** ở góc trên bên phải ứng dụng này và dán mã vào đó.\n3. Hoặc dán mã đó vào mục **Secrets** với tên là `VITE_GEMINI_API_KEY` (đừng dùng tên GEMINI_API_KEY vì nó bị hệ thống khóa).";
    }
    
    return `Lỗi kết nối AI: ${errorMessage || "Vui lòng thử lại sau."}`;
  }
}
