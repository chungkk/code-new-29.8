# Vocabulary Dropdown - Smart Positioning Guide

## ✨ Tính năng mới: Dropdown thông minh

Dropdown tự động chọn vị trí tối ưu (trên hoặc dưới từ) để đảm bảo người dùng luôn xem được đầy đủ thông tin.

## 🎯 Logic hoạt động

```
┌─────────────────────────────────────────────┐
│          Viewport (Màn hình)                │
│                                             │
│  ┌──────────┐                               │
│  │  dream   │  ← Từ ở trên cùng            │
│  └──────────┘                               │
│       ↓                                     │
│  ┌─────────────────────┐                    │
│  │ 🔽 Arrow            │                    │
│  │ dream               │                    │
│  │ ─────────────────   │                    │
│  │ 🔊 US /driːm/       │                    │
│  │ Translation: ...    │                    │
│  │ Definition: ...     │                    │
│  └─────────────────────┘                    │
│                                             │
│                                             │
│                    ┌──────────────────────┐ │
│                    │ Definition: ...      │ │
│                    │ Translation: ...     │ │
│                    │ 🔊 UK /driːm/        │ │
│                    │ ─────────────────    │ │
│                    │ recognise       🔼   │ │
│                    └──────────────────────┘ │
│                           ↑                 │
│                    ┌──────────┐             │
│                    │recognise │ ← Từ ở dưới│
│                    └──────────┘             │
└─────────────────────────────────────────────┘
```

## 🧮 Công thức tính toán

### 1. Kiểm tra không gian
```javascript
const viewportHeight = window.innerHeight;
const spaceBelow = viewportHeight - rect.bottom;
const spaceAbove = rect.top;
```

### 2. Quyết định vị trí
```javascript
if (spaceBelow < 400px && spaceAbove > spaceBelow) {
  // Hiển thị phía trên
  placement = 'top';
} else {
  // Hiển thị phía dưới (mặc định)
  placement = 'bottom';
}
```

### 3. Căn giữa dropdown với từ
```javascript
// Dropdown được căn giữa so với từ
left = wordCenter - (dropdownWidth / 2);

// Nhưng vẫn giữ trong viewport
if (left < 10) left = 10;
if (left + dropdownWidth > viewportWidth) {
  left = viewportWidth - dropdownWidth - 10;
}
```

## 🎨 Arrow Indicator

### Bottom Placement (Arrow ở trên)
```css
.dropdown--bottom .dropdownArrow {
  top: -8px;
  border-bottom: none;
  border-right: none;
  /* Tạo hình tam giác chỉ xuống */
}
```

### Top Placement (Arrow ở dưới)
```css
.dropdown--top .dropdownArrow {
  bottom: -8px;
  border-top: none;
  border-left: none;
  /* Tạo hình tam giác chỉ lên */
}
```

## 📱 Responsive Behavior

### Desktop (> 768px)
- Dropdown width: 400-500px
- Arrow indicator hiển thị
- Center-aligned với từ
- Smart positioning (top/bottom)

### Mobile (≤ 768px)
- Dropdown width: 90vw
- Position: center màn hình (left: 5vw)
- Arrow bị ẩn (đơn giản hóa)
- Smart positioning vẫn hoạt động

## 🔧 Customization

### Điều chỉnh chiều cao ước tính
```javascript
const estimatedDropdownHeight = 400; // Thay đổi số này
```

Nếu dropdown của bạn thường:
- **Ngắn hơn**: Giảm xuống 300px
- **Dài hơn**: Tăng lên 500px

### Điều chỉnh khoảng cách
```javascript
// Khoảng cách từ dropdown đến từ
top = rect.bottom + window.scrollY + 8; // +8px (bottom)
top = rect.top + window.scrollY - 8;   // -8px (top)
```

### Điều chỉnh padding viewport
```javascript
// Khoảng cách từ cạnh màn hình
if (left < 10) left = 10;              // 10px trái
if (left + width > viewport - 10)      // 10px phải
```

## ✅ Testing Checklist

- [ ] Từ ở đầu trang → Dropdown xuất hiện phía dưới
- [ ] Từ ở cuối trang → Dropdown xuất hiện phía trên
- [ ] Từ ở giữa trang → Dropdown xuất hiện phía dưới (default)
- [ ] Từ ở cạnh trái → Dropdown không tràn ra ngoài màn hình
- [ ] Từ ở cạnh phải → Dropdown không tràn ra ngoài màn hình
- [ ] Arrow chỉ đúng vị trí từ
- [ ] Mobile: Dropdown center và không có arrow
- [ ] Click outside → Dropdown đóng
- [ ] ESC key → (chưa implement)

## 🎥 Demo Scenarios

### Scenario 1: Từ ở TOP
```
User clicks: "dream" (row 1)
Result: Dropdown appears BELOW with arrow pointing UP to word
```

### Scenario 2: Từ ở BOTTOM
```
User clicks: "music" (last row)
Result: Dropdown appears ABOVE with arrow pointing DOWN to word
```

### Scenario 3: Từ ở MIDDLE
```
User clicks: "recognise" (row 5/10)
Result: Dropdown appears BELOW (default) with arrow pointing UP
```

## 🐛 Known Issues & Solutions

### Issue: Dropdown flickers when scrolling
**Solution**: Use `position: fixed` instead of `absolute`

### Issue: Arrow not aligned with word
**Solution**: Calculate wordCenterX and pass to arrow style

### Issue: Dropdown cut off on small screens
**Solution**: Use max-height: 70vh and overflow-y: auto

## 📊 Performance

- **Calculation time**: ~1ms
- **Animation duration**: 200ms
- **Re-render**: Only on word click
- **Memory**: Minimal (2 state objects)

## 🎓 Best Practices

1. **Always calculate viewport size on click** (not on mount)
2. **Store placement in state** for CSS class application
3. **Use transform for animations** (better performance)
4. **Provide fallback placement** if calculation fails
5. **Test on different screen sizes**

---

**Version**: 1.0  
**Last Updated**: 2025-11-18  
**Author**: Droid AI
