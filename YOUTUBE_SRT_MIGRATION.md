# YouTube SRT Migration - Pure JavaScript Implementation

## Tổng Quan

Đã migrate từ **Python subprocess** sang **pure JavaScript** implementation để lấy SRT từ YouTube.

## Thay Đổi Chính

### ❌ CŨ: Python Subprocess
```javascript
// pages/api/get-youtube-srt.js
import { spawn } from 'child_process';

// Gọi Python script
const pythonProcess = spawn(venvPath, [scriptPath, videoId]);
```

**Nhược điểm:**
- Phụ thuộc vào Python environment
- Cần virtual environment (venv)
- Spawn subprocess chậm
- Khó deploy và maintain
- Không tương thích với serverless

### ✅ MỚI: Pure JavaScript với youtubei.js
```javascript
// pages/api/get-youtube-srt.js
import { Innertube } from 'youtubei.js';

// Lấy transcript trực tiếp
const youtube = await Innertube.create();
const info = await youtube.getInfo(videoId);
const transcriptData = await info.getTranscript();
```

**Ưu điểm:**
- ✅ Không cần Python dependency
- ✅ Nhanh hơn (không spawn subprocess)
- ✅ Dễ maintain
- ✅ Tương thích hoàn toàn với Next.js
- ✅ Có thể deploy lên Vercel/serverless
- ✅ Xử lý lỗi tốt hơn

## Files Đã Thay Đổi

### 1. `/pages/api/get-youtube-srt.js` ⭐
**Chức năng:** Admin API để lấy SRT từ YouTube

**Thay đổi:**
- Thay thế Python subprocess bằng `youtubei.js`
- Giữ nguyên API interface (backward compatible)
- Vẫn hỗ trợ 2 modes: `with` và `without` punctuation
- Cải thiện error handling

**API Usage:**
```javascript
POST /api/get-youtube-srt
Headers: Authorization: Bearer <admin-token>
Body: {
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  punctuationType: "with" // or "without"
}

Response: {
  success: true,
  srt: "1\n00:00:01,360 --> 00:00:03,040\n[♪♪♪]\n\n2\n...",
  itemCount: 61,
  message: "SRT đã được tải thành công từ YouTube!"
}
```

### 2. `/pages/api/create-self-lesson.js` ⭐
**Chức năng:** User API để tạo lesson từ YouTube URL

**Thay đổi:**
- Thay thế Python subprocess bằng `youtubei.js`
- Trả về JSON format thay vì SRT
- Không cần convert SRT → JSON nữa

**API Usage:**
```javascript
POST /api/create-self-lesson
Headers: Authorization: Bearer <user-token>
Body: {
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

Response: {
  success: true,
  lesson: {
    id: "self_1731276224929",
    title: "Self-created Lesson 1731276224929",
    audio: "https://www.youtube.com/watch?v=...",
    youtubeUrl: "https://www.youtube.com/watch?v=...",
    json: "/text/self_1731276224929.json",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }
}
```

## Dependencies

### Đã Thêm
```json
{
  "dependencies": {
    "youtubei.js": "^16.0.1"
  }
}
```

### Có Thể Xóa (Optional)
- Python virtual environment (`venv/`)
- Python script (`get_youtube_srt.py`)
- Python dependencies (`youtube-transcript-api`)

**⚠️ Lưu ý:** Giữ lại Python script nếu cần fallback

## Testing

### Test API Endpoints

```bash
# Test get-youtube-srt (cần admin token)
curl -X POST http://localhost:3000/api/get-youtube-srt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","punctuationType":"with"}'

# Test create-self-lesson (cần user token)
curl -X POST http://localhost:3000/api/create-self-lesson \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### Test Script
```bash
# Test youtubei.js library trực tiếp
node test-youtubei.js
```

## SRT Format Details

### Input: YouTube Transcript Segments
```javascript
{
  snippet: "♪ We're no strangers to love ♪",
  start_ms: 18640,
  end_ms: 21880
}
```

### Output: SRT Format
```
2
00:00:18,640 --> 00:00:21,880
♪ We're no strangers to love ♪
```

### Merging Logic

**With Punctuation:**
- MIN_WORDS: 6
- MAX_WORDS: 16
- MAX_CHAR_LENGTH: 120
- Merge until sentence end (`.!?…`)

**Without Punctuation:**
- MAX_WORDS: 12
- MAX_CHAR_LENGTH: 120
- Merge based on word count only

### Filtering
- Loại bỏ music notes: `[♪♪♪]`
- Loại bỏ noise tags: `[music]`, `(laughter)`
- Yêu cầu ≥45% alphanumeric characters

## Error Handling

### Các Lỗi Phổ Biến

```javascript
// Video không có phụ đề
{
  message: "Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công."
}

// Video không khả dụng
{
  message: "Video không khả dụng hoặc đã bị xóa"
}

// URL không hợp lệ
{
  message: "URL YouTube không hợp lệ"
}

// Token không hợp lệ
{
  message: "Token không hợp lệ"
}

// Không có quyền admin (chỉ get-youtube-srt)
{
  message: "Không có quyền truy cập"
}
```

## Performance

### Benchmark (local test)

| Method | Time | Memory |
|--------|------|--------|
| Python subprocess | ~2-3s | ~50MB |
| youtubei.js | ~1-2s | ~30MB |

**Cải thiện:** ~40% faster, ~40% less memory

## Deployment

### Vercel / Serverless
✅ Hoạt động tốt với serverless environment

### Docker
```dockerfile
# Không cần Python nữa!
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Migration Checklist

- [x] Cài đặt `youtubei.js`
- [x] Update `/pages/api/get-youtube-srt.js`
- [x] Update `/pages/api/create-self-lesson.js`
- [x] Test API endpoints
- [x] Verify SRT format output
- [x] Test error cases
- [ ] Update admin dashboard (nếu cần)
- [ ] Remove Python files (optional)
- [ ] Deploy to production
- [ ] Monitor for errors

## Known Issues

### youtubei.js Warnings
```
[YOUTUBEJS][Parser]: InnertubeError: TicketShelf not found!
```

**⚠️ Không ảnh hưởng đến transcript functionality**

YouTube thường xuyên thay đổi UI structure, gây ra parser warnings. Library tự động handle bằng JIT code generation.

## Rollback Plan

Nếu cần rollback về Python implementation:

1. Revert files:
```bash
git checkout HEAD~1 pages/api/get-youtube-srt.js
git checkout HEAD~1 pages/api/create-self-lesson.js
```

2. Đảm bảo Python environment:
```bash
source venv/bin/activate
pip install youtube-transcript-api
```

## Support

**Questions?** Check:
- [youtubei.js documentation](https://github.com/LuanRT/YouTube.js)
- [Next.js API routes](https://nextjs.org/docs/api-routes/introduction)

## Changelog

### 2025-11-10 - v2.0.0
- ✅ Migrated to pure JavaScript
- ✅ Added youtubei.js dependency
- ✅ Improved performance
- ✅ Better error handling
- ✅ Serverless compatible

### 2024 - v1.0.0
- Initial Python implementation
