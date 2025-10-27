# Groq AI Translation Setup

Để cải thiện chất lượng dịch, ứng dụng sử dụng Groq AI (miễn phí, nhanh, chính xác).

## Bước 1: Lấy API Key miễn phí

1. Truy cập: https://console.groq.com/keys
2. Đăng ký tài khoản (free)
3. Tạo API key mới
4. Copy API key

## Bước 2: Thêm vào .env.local

Mở file `.env.local` và thêm dòng:

```bash
GROQ_API_KEY=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
```

## Bước 3: Restart server

```bash
# Stop server (Ctrl+C)
# Start lại
npm run dev
```

## Lợi ích của Groq AI:

✅ **Chất lượng cao hơn Google Translate**

- Hiểu context (ngữ cảnh)
- Dịch tự nhiên hơn
- AI-powered translation

✅ **Miễn phí**

- Free tier generous
- Không cần credit card

✅ **Rất nhanh**

- ~200-500ms response time
- Nhanh hơn Google Translate

## Fallback

Nếu không config Groq API key, hệ thống tự động dùng MyMemory (chất lượng thấp hơn).

## Giới hạn

- Free tier: 14,400 requests/day
- ~6,000 requests/hour
- Đủ cho mọi use case

## Example Translations:

**With Groq AI:**

- Haus → nhà
- verstehen → hiểu
- arbeiten → làm việc
- Freundschaft → tình bạn
- mit dem Top Thema → với chủ đề hàng đầu

**Context-aware:**

- Word: "Bank" in "Ich sitze auf der Bank" → băng ghế (NOT ngân hàng)
- Word: "Bank" in "Ich gehe zur Bank" → ngân hàng

## Support

Model sử dụng: `llama-3.1-8b-instant`

- Fast inference
- High accuracy
- Multi-language support
