<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d6b05cb0-5104-4e6c-850e-bc011b00962b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
## Triển khai lên Vercel

Ứng dụng này đã được cấu hình sẵn để chạy trên Vercel bằng Serverless Functions.

1. **Đưa code lên GitHub:** Đảm bảo bạn đã đẩy toàn bộ mã nguồn này lên một kho lưu trữ GitHub.
2. **Kết nối với Vercel:**
   - Truy cập [vercel.com](https://vercel.com) và tạo một Project mới.
   - Chọn kho lưu trữ GitHub của bạn.
3. **Cấu hình Environment Variables:**
   - Trong phần cài đặt của Project trên Vercel, hãy thêm biến môi trường sau:
     - `VITE_GEMINI_API_KEY`: Mã khóa API của bạn từ [Google AI Studio](https://aistudio.google.com/app/apikey).
4. **Deploy:** Nhấn nút **Deploy**. Vercel sẽ tự động build và cung cấp đường dẫn truy cập công khai cho bạn.

Lưu ý: File `api/gemini.ts` sẽ thay thế `server.ts` khi chạy trên môi trường Vercel.
