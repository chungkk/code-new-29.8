# ✨ Tính Năng Hover & Click Từ Vựng (Toàn Bộ Ứng Dụng)

## 🎯 Mô Tả
Tính năng cho phép người dùng hover và click vào từ vựng ở **MỌI NƠI** trong ứng dụng:
- ✅ **Danh sách câu bên phải** (Sentence List)
- ✅ **Transcript** (Phần hiển thị câu hiện tại)
- ✅ **Dictation** (Phần từ đã hoàn thành)

### Chức năng:
- **Hover**: Xem nghĩa tiếng Việt nhanh qua tooltip
- **Click**: 🔊 Nghe phát âm + Mở popup gọn để lưu từ vựng

---

## 📁 Files Đã Thay Đổi

### 1. **Components Mới**
- `components/HoverableWord.js` - Component từ có thể hover/click
  - Hover → Fetch translation → Hiện tooltip
  - Click → Text-to-speech + Mở popup

### 2. **Components Cập Nhật**
- `components/SentenceListItem.js` - Render từng câu với HoverableWord
- `components/VocabularyPopup.js` - Nhận `preTranslation` từ hover

### 3. **Components Cập Nhật v2.0** (Áp dụng toàn bộ)
- `components/Transcript.js` - Dùng HoverableWord thay ClickableWord
- `components/DictationText.js` - Dùng HoverableWord cho từ completed

### 4. **Pages Cập Nhật**
- `pages/shadowing/[lessonId].js` - Sử dụng SentenceListItem
- `pages/dictation/[lessonId].js` - Sử dụng SentenceListItem

### 5. **Styles Cập Nhật**
- `styles/globals.css` - CSS cho hoverable-word, tooltip và popup nhỏ gọn

---

## 🎨 CSS Classes - ULTRA COMPACT (v3.0)

### Popup Size - Giảm Tối Đa:
```css
.vocabulary-popup {
    min-width: 240px;        /* v1: 320px → v2: 280px → v3: 240px ✨ */
    max-width: 280px;        /* v1: 400px → v2: 350px → v3: 280px */
    padding: 12px;           /* v1: 20px → v2: 16px → v3: 12px */
    border-radius: 8px;      /* v1: 12px → v2: 10px → v3: 8px */
    box-shadow: 0 6px 24px;  /* Giảm shadow */
    animation: 0.2s ease;    /* Nhanh hơn: 0.3s → 0.2s */
}

.vocabulary-popup-header {
    margin-bottom: 8px;      /* v2: 12px → v3: 8px */
    padding-bottom: 6px;     /* v2: 8px → v3: 6px */
}

.vocabulary-popup-header h3 {
    font-size: 1em;          /* v1: 1.3em → v2: 1.1em → v3: 1em ✨ */
}

.close-btn {
    font-size: 22px;         /* v1: 28px → v3: 22px */
    width: 26px;             /* v1: 32px → v3: 26px */
    height: 26px;
}

.vocab-field {
    margin-bottom: 8px;      /* v2: 10px → v3: 8px */
}

.vocab-field label {
    font-size: 0.75em;       /* v2: 0.85em → v3: 0.75em */
    margin-bottom: 3px;      /* v2: 4px → v3: 3px */
}

.vocab-word {
    font-size: 1.05em;       /* v1: 1.4em → v2: 1.2em → v3: 1.05em ✨ */
    padding: 5px 8px;        /* v2: 6px 10px → v3: 5px 8px */
    border-radius: 5px;      /* v2: 6px → v3: 5px */
}

.vocab-context {
    font-size: 0.75em;       /* v2: 0.85em → v3: 0.75em */
    padding: 4px 6px;        /* v2: 6px 8px → v3: 4px 6px */
    border-radius: 4px;      /* v2: 5px → v3: 4px */
    border-left: 2px;        /* v2: 3px → v3: 2px */
    max-height: 50px;        /* v2: 60px → v3: 50px */
    overflow-y: auto;
}

.vocab-field input {
    padding: 6px 8px;        /* v2: 10px 12px → v3: 6px 8px */
    border: 1.5px;           /* v2: 2px → v3: 1.5px */
    border-radius: 5px;      /* v2: 8px → v3: 5px */
    font-size: 0.9em;        /* v2: 1em → v3: 0.9em */
}

.vocabulary-popup-footer {
    margin-top: 8px;         /* v2: 12px → v3: 8px */
    padding-top: 8px;        /* v2: 10px → v3: 8px */
    gap: 6px;                /* v2: 8px → v3: 6px */
}

.vocabulary-popup-footer button {
    padding: 6px 12px;       /* v1: 10px 20px → v2: 8px 16px → v3: 6px 12px ✨ */
    font-size: 0.85em;       /* v1: 0.95em → v2: 0.9em → v3: 0.85em */
    border-radius: 5px;      /* v2: 6px → v3: 5px */
}

.auto-translation-hint {
    margin-top: 6px;         /* v2: 8px → v3: 6px */
    padding: 5px 8px;        /* v2: 8px 12px → v3: 5px 8px */
    font-size: 0.8em;        /* v2: 0.9em → v3: 0.8em */
    border-radius: 4px;      /* v2: 6px → v3: 4px */
    border-left: 2px;        /* v2: 3px → v3: 2px */
}
```

### CSS Classes Chi Tiết

```css
/* Hoverable Word */
.hoverable-word {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: inline-block;
    position: relative;
}

.hoverable-word:hover {
    background: linear-gradient(135deg, #FFE66D, #FFB199) !important;
    color: #2d3436 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(255, 230, 109, 0.4);
    font-weight: 600;
}

.hoverable-word.speaking {
    background: linear-gradient(135deg, #4ECDC4, #6C5CE7) !important;
    color: white !important;
    animation: pulse-speak 0.5s ease-in-out;
}

/* Tooltip */
.word-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-5px);
    background: linear-gradient(135deg, #6C5CE7, #764ba2);
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.5);
    animation: tooltipFadeIn 0.2s ease;
}

/* Popup */
.vocabulary-popup {
    position: fixed; /* Changed from absolute */
    z-index: 10000;
    transform: translate(-50%, 0);
    /* ... */
}

.vocabulary-popup-overlay {
    z-index: 9999;
    backdrop-filter: blur(2px);
    /* ... */
}
```

---

## 🔧 Các Sửa Đổi Kỹ Thuật

### 1. **Smart Positioning cho Popup (v2.0 - Không Che Từ)**
```javascript
// Popup hiện bên cạnh từ, không che từ gốc
const popupWidth = 280;
const popupHeight = 260;

// Ưu tiên hiện bên phải từ
let top = rect.top;
let left = rect.right + 15;  // Bên phải với khoảng cách 15px

// Nếu không đủ chỗ bên phải → hiện bên trái
if (left + popupWidth / 2 > window.innerWidth - 20) {
    left = rect.left - popupWidth / 2 - 15;
}

// Điều chỉnh vị trí dọc để không vượt màn hình
if (top + popupHeight > window.innerHeight - 20) {
    top = window.innerHeight - popupHeight - 20;
}
```

### 2. **Tránh Xung Đột CSS**
- Dùng `!important` cho hover styles của `.hoverable-word`
- Tăng `line-height` của `.sentence-text` từ 1.4 → 1.6
- Đảm bảo z-index hierarchy: tooltip (9999) < popup-overlay (9999) < popup (10000)

### 3. **Tối Ưu Translation Fetching**
```javascript
// VocabularyPopup nhận preTranslation từ HoverableWord
const VocabularyPopup = ({ 
    word, 
    context, 
    lessonId, 
    onClose, 
    position, 
    preTranslation = '' // <-- New prop
}) => {
    const [translation, setTranslation] = useState(preTranslation);
    
    // Only fetch if we don't have a preTranslation
    if (word && !preTranslation) {
        fetchTranslation();
    }
}
```

---

## 🎮 Cách Sử Dụng

### User Flow v2.0 (Áp dụng toàn bộ):
```
📍 Danh Sách Câu (Bên Phải):
   - Hover vào từ → Tooltip nghĩa
   - Click vào từ → 🔊 Đọc + Popup nhỏ gọn

📍 Transcript (Câu Hiện Tại - Shadowing):
   - Hover vào từ → Tooltip nghĩa
   - Click vào từ → 🔊 Đọc + Popup nhỏ gọn

📍 Dictation (Từ Đã Hoàn Thành):
   - Hover vào từ → Tooltip nghĩa
   - Click vào từ → 🔊 Đọc + Popup nhỏ gọn
```

**Lưu ý**: Popup hiện **BÊN CẠNH** từ, không che mất từ gốc!

### Developer Usage:
```jsx
import HoverableWord from './HoverableWord';

// Render từ có thể hover/click
<HoverableWord 
    word="Erde" 
    onWordClick={(word, position, translation) => {
        // Handle click: show popup, play audio, etc.
    }}
/>
```

---

## ✅ Tính Năng

### Hover
- ✅ Delay 300ms để tránh fetch khi hover nhanh
- ✅ Auto-fetch translation từ API `/api/translate`
- ✅ Hiện tooltip gradient tím-xanh
- ✅ Animation fade-in mượt mà
- ✅ Cleanup timeout khi unmount

### Click
- ✅ Text-to-speech (German pronunciation)
- ✅ Visual feedback (pulse animation)
- ✅ Mở popup với preTranslation (không fetch lại)
- ✅ Popup position tự động điều chỉnh (không ra ngoài màn hình)
- ✅ Backdrop blur effect

### Dictation Mode
- ✅ Chỉ hiện hoverable words cho câu đã hoàn thành
- ✅ Câu chưa xong vẫn mask text (*****)

### Shadowing Mode
- ✅ Tất cả từ trong danh sách đều có thể hover/click

---

## 🐛 Các Lỗi Đã Sửa

### v1.0:
1. **Popup Position Lỗi**
   - ❌ `position: absolute` bị ảnh hưởng scroll
   - ✅ Đổi sang `position: fixed`

2. **CSS Xung Đột**
   - ❌ `.hoverable-word` và `.clickable-word` xung đột
   - ✅ Dùng `!important` + z-index hierarchy

3. **React Hook Error**
   - ❌ `useEffect` gọi sau early return
   - ✅ Di chuyển `useEffect` lên đầu

### v2.0 (Cập nhật mới):
4. **Popup Quá To**
   - ❌ min-width: 320px, padding: 20px → Popup cồng kềnh
   - ✅ Giảm xuống 280px, padding: 16px → Gọn gàng hơn

5. **Popup Che Mất Từ**
   - ❌ Popup hiện phía dưới, che mất từ gốc
   - ✅ Popup hiện **bên phải** hoặc **bên trái** từ

6. **Transcript Không Có Hover**
   - ❌ Chỉ Sentence List mới có hover
   - ✅ Áp dụng HoverableWord cho Transcript + DictationText

---

## 📝 TODO Future Improvements

- [ ] Cache translations trong localStorage
- [ ] Thêm keyboard shortcuts (Alt+Click để save)
- [ ] Support multi-word phrases
- [ ] Dark mode cho tooltip và popup
- [ ] Animation transitions giữa tooltip và popup

---

## 🔍 Testing

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Shadowing or Dictation page
http://localhost:3000/shadowing/bai_1

# 3. Test hover on words in sentence list (right side)
# 4. Test click on words
# 5. Verify popup appears correctly
# 6. Verify text-to-speech works
# 7. Test on different screen sizes
```

---

## 📊 Performance

- **Hover delay**: 300ms (tránh fetch không cần thiết)
- **Translation API**: Groq AI (fast) + MyMemory (fallback)
- **Bundle size**: +2KB (HoverableWord component)
- **Z-index layers**: 3 layers (tooltip, overlay, popup)

---

**Ngày tạo**: 2025-10-25  
**Phiên bản**: 3.0 ULTRA COMPACT (Popup siêu nhỏ gọn)  
**Cập nhật lần cuối**: 2025-10-25  
**Tác giả**: AI Assistant + chungkk

### Version History:
- **v1.0** (2025-10-25): Initial release - Sentence List only
- **v2.0** (2025-10-25): Smaller popup + Apply to all (Transcript + Dictation)
- **v3.0** (2025-10-25): ULTRA COMPACT - 25% smaller, optimized spacing

---

## 📊 So Sánh Các Phiên Bản

| Tính năng | v1.0 | v2.0 | v3.0 ✨ ULTRA COMPACT |
|-----------|------|------|---------------------|
| **Popup Width** | 320px | 280px | **240px** |
| **Padding** | 20px | 16px | **12px** |
| **Header Font** | 1.3em | 1.1em | **1em** |
| **Word Font** | 1.4em | 1.2em | **1.05em** |
| **Context Font** | 0.9em | 0.85em | **0.75em** |
| **Button Padding** | 10px 20px | 8px 16px | **6px 12px** |
| **Context Height** | Unlimited | 60px | **50px** |
| **Animation** | 0.3s | 0.3s | **0.2s** |
| **Popup Position** | Dưới từ (che) | Bên cạnh | Bên cạnh |
| **Áp dụng** | Sentence List | Toàn bộ | Toàn bộ |

**So sánh kích thước**:
- v1.0: **320px** (baseline)
- v2.0: **280px** (giảm 12.5%)
- v3.0: **240px** (giảm 25% so với v1.0, giảm 14% so với v2.0) ✨

**Kết luận**: 
- ✅ v3.0 nhỏ gọn hơn v1.0 tới **25%**
- ✅ Không che lấp từ gốc
- ✅ Mọi spacing/font đều được tối ưu
- ✅ Animation nhanh hơn (0.2s thay vì 0.3s)
- ✅ Áp dụng toàn bộ ứng dụng
