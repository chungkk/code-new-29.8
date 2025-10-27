# 🌍 Translation API Setup Guide

## Vấn Đề Hiện Tại

- ❌ Groq AI (LLaMA): Chất lượng dịch Đức→Việt **KHÔNG TỐT**
- ❌ MyMemory: Miễn phí nhưng **RẤT TỆ** cho tiếng Việt

## 🎯 Giải Pháp Đề Xuất

Hệ thống mới hỗ trợ **5 dịch vụ** với thứ tự ưu tiên thông minh:

| Thứ tự | Dịch vụ              | Chất lượng                | Giá              | Free Tier     | Đề xuất             |
| ------ | -------------------- | ------------------------- | ---------------- | ------------- | ------------------- |
| **1**  | **Google Translate** | ⭐⭐⭐⭐⭐ Xuất sắc       | $20/1M chars     | $300 credit   | ✅ **KHUYÊN DÙNG**  |
| 2      | DeepL                | ⭐⭐⭐⭐⭐ Tốt nhất (Đức) | $5.49/tháng      | 500k chars    | ⚠️ Chưa hỗ trợ Việt |
| 3      | OpenAI GPT-4         | ⭐⭐⭐⭐ Rất tốt          | ~$0.15/1M tokens | -             | ✅ Nếu có budget    |
| 4      | Groq (cải tiến)      | ⭐⭐⭐ Trung bình         | FREE             | Unlimited     | ⚠️ Backup           |
| 5      | MyMemory             | ⭐ Kém                    | FREE             | 100 calls/day | ❌ Cuối cùng        |

---

## 🚀 Cách Setup

### Option 1: Google Translate (KHUYÊN DÙNG) ✅

**Tại sao chọn Google:**

- ✅ Chất lượng dịch Việt **XUẤT SẮC**
- ✅ Giá rẻ: $20/1 triệu ký tự (≈ 200,000 từ)
- ✅ Free $300 credit cho account mới (dùng ~15 triệu từ miễn phí)
- ✅ Setup dễ, không cần verify thẻ

**Các bước:**

#### 1. Tạo Google Cloud Account

```bash
# Truy cập: https://console.cloud.google.com/
# Sign in với Gmail
# Nhận $300 free credit (không cần thẻ tín dụng ngay)
```

#### 2. Enable Translation API

```bash
# Vào: https://console.cloud.google.com/apis/library/translate.googleapis.com
# Click "Enable API"
```

#### 3. Tạo API Key

```bash
# Vào: https://console.cloud.google.com/apis/credentials
# Click "Create Credentials" → "API Key"
# Copy API key
```

#### 4. Thêm vào `.env.local`

```bash
GOOGLE_TRANSLATE_API_KEY=AIzaSyB...your_key_here
```

**Chi phí ước tính:**

- 1 từ ≈ 5 chars → $20 cho ~200,000 từ
- Với $300 credit → **15 triệu từ miễn phí** (đủ dùng >1 năm)

---

### Option 2: OpenAI GPT-4 mini (Chất lượng cao)

**Ưu điểm:**

- ✅ Hiểu ngữ cảnh rất tốt
- ✅ Bản dịch tự nhiên
- ⚠️ Chi phí cao hơn Google ($0.15/1M tokens ≈ $0.20/1M chars)

**Setup:**

1. Tạo account: https://platform.openai.com/
2. Thêm credit card (minimum $5)
3. Generate API key: https://platform.openai.com/api-keys
4. Thêm vào `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-...your_key_here
```

---

### Option 3: Cải Thiện Groq (FREE - Đã có key)

**Đã cải thiện:**

- ✅ Đổi model: `llama-3.1-8b-instant` → **`llama-3.3-70b-versatile`** (mạnh hơn)
- ✅ Prompt tiếng Việt rõ ràng hơn
- ✅ Lower temperature (0.3 → 0.2) cho nhất quán
- ⚠️ Vẫn chỉ ở mức trung bình

Không cần làm gì, key đã có trong `.env.local`

---

## 📊 So Sánh Chi Phí

**Giả sử: 10,000 từ/tháng (200 hover/day)**

| Dịch vụ           | Chi phí/tháng | Chi phí/năm | Free tier             |
| ----------------- | ------------- | ----------- | --------------------- |
| Google Translate  | **$1.00**     | $12         | $300 credit (~25 năm) |
| OpenAI GPT-4 mini | $1.50         | $18         | -                     |
| Groq              | **FREE**      | **FREE**    | Unlimited             |
| MyMemory          | FREE          | FREE        | 100 calls/day         |

**Kết luận:** Google Translate là **tốt nhất** với $300 credit → dùng miễn phí nhiều năm!

---

## 🔧 Fallback Chain (Tự động)

Hệ thống sẽ tự động thử theo thứ tự:

```
1. Google Translate (nếu có key)
   ↓ (nếu fail)
2. OpenAI GPT-4 mini (nếu có key)
   ↓ (nếu fail)
3. Groq AI cải tiến (có key rồi)
   ↓ (nếu fail)
4. MyMemory (luôn có, nhưng tệ)
```

**Bạn chỉ cần thêm 1 key** → Tất cả những key khác là backup!

---

## ✅ Kiểm Tra Sau Khi Setup

### 1. Test Translation API

```bash
# Restart server
npm run dev

# Hover vào bất kỳ từ nào trong Sentence List
# Kiểm tra console để xem dịch vụ nào được dùng:

# ✅ "Google Translate: Erde → trái đất"  (Tốt nhất!)
# ⚠️ "Groq AI: Erde → đất"              (Tạm được)
# ❌ "MyMemory: Erde → earth"            (Tệ!)
```

### 2. Check Console Logs

```bash
# Server console sẽ hiển thị:
✅ Google Translate: welt → thế giới
✅ OpenAI: schön → đẹp
⚠️ Groq AI: haus → nhà
⚠️ MyMemory (low quality): auto → car (sai!)
❌ All translation services failed
```

---

## 🎁 Khuyến Nghị Cuối Cùng

### Cho người mới bắt đầu (FREE):

1. Giữ nguyên **Groq** (đã cải thiện prompt)
2. Chấp nhận chất lượng trung bình

### Cho production (Chất lượng cao):

1. ✅ **Setup Google Translate** (FREE với $300 credit)
2. Thêm OpenAI làm backup (optional)
3. Groq làm emergency fallback

### Setup ngay lập tức (5 phút):

```bash
# 1. Tạo Google Cloud account
# 2. Enable Translation API
# 3. Tạo API key
# 4. Paste vào .env.local:
GOOGLE_TRANSLATE_API_KEY=yAIzaSyD7TToqUhB_e9oTZGEssjHb_rvU5uSD94Y

# 5. Restart server
npm run dev

# 6. Test hover → Thấy "Google Translate" trong console = THÀNH CÔNG! 🎉
```

---

## 📞 Support Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **Google Translation API Docs**: https://cloud.google.com/translate/docs
- **OpenAI Platform**: https://platform.openai.com/
- **Groq Console**: https://console.groq.com/
- **DeepL API** (future): https://www.deepl.com/pro-api

---

**Cập nhật**: 2025-10-25  
**Phiên bản**: 2.0 Multi-Provider  
**Tác giả**: AI Assistant + chungkk
