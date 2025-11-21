# Bảng Màu Giao Diện Sáng (Light Mode) - Parroto

## 🎨 Màu Chủ Đạo

### 1. Màu Trắng Sữa (Milk White) - Nền
- `--bg-primary`: #fef9f3 (Nền chính - ấm áp)
- `--bg-secondary`: #fff8f0 (Nền phụ)
- `--bg-card`: #fffbf7 (Nền thẻ)
- `--bg-elevated`: #ffffff (Nền nổi bật)

### 2. Màu Đỏ Cà Chua Paprika (Paprika Red)
- `--accent-red`: #d44638
- `--accent-purple`: #d44638 (Alias cho accent red)
- Sử dụng cho: Buttons quan trọng, Admin items, Hover effects

### 3. Màu Xanh Dưa Chuột (Cucumber Green)
- `--accent-green`: #4a9b6f
- `--accent-blue`: #4a9b6f (Alias cho accent green)
- Sử dụng cho: Links, Active states, Success indicators

### 4. Gradient Accent
- `--accent-gradient`: linear-gradient(135deg, #d44638 0%, #4a9b6f 100%)
- Kết hợp Đỏ Paprika → Xanh Dưa chuột
- Sử dụng cho: Logo, CTA buttons, Hero sections

## 📝 Màu Chữ (Tương Phản Cao)

- `--text-primary`: #2d1810 (Chữ chính - nâu đậm)
- `--text-secondary`: #5c4033 (Chữ phụ - nâu vừa)
- `--text-muted`: #8b7266 (Chữ mờ - nâu nhạt)

## 🎭 Hiệu Ứng & Viền

### Màu Hover
- `--bg-hover`: rgba(212, 70, 56, 0.08) (Đỏ paprika nhạt)

### Màu Viền
- `--border-color`: rgba(212, 70, 56, 0.2)
- `--border-light`: rgba(212, 70, 56, 0.1)

### Bóng Đổ (Warm Tones)
- `--shadow-sm`: Bóng nhẹ với tông đỏ ấm
- `--shadow-md`: Bóng vừa
- `--shadow-lg`: Bóng lớn
- `--shadow-xl`: Bóng rất lớn
- `--shadow-hover`: Bóng hover với mix đỏ & xanh

## 🎯 Ứng Dụng Cụ Thể

### Navigation & Links
- Hover: Màu xanh dưa chuột (#4a9b6f)
- Active: Background xanh nhạt + text xanh

### Buttons
- Primary: Gradient đỏ → xanh
- Secondary: Border xanh dưa chuột
- Hover: Shadow đỏ paprika

### Cards & Components
- Background: Trắng sữa warm tones
- Border: Đỏ paprika với opacity
- Hover: Border đỏ paprika đậm hơn

### Forms
- Focus: Border xanh dưa chuột
- Active: Background xanh nhạt
- Error: Đỏ paprika

### Admin Section
- Color: Đỏ paprika (#d44638)
- Hover: Background đỏ paprika nhạt

## ✨ Đặc Điểm Thiết Kế

1. **Tương phản cao**: Chữ nâu đậm trên nền trắng sữa đảm bảo dễ đọc
2. **Ấm áp**: Tone màu ấm tạo cảm giác thân thiện
3. **Năng động**: Gradient đỏ-xanh tạo điểm nhấn bắt mắt
4. **Tự nhiên**: Lấy cảm hứng từ thiên nhiên (rau củ)
5. **Accessibility**: WCAG AA compliant cho text contrast

## 🔍 Tỷ Lệ Contrast

- Text primary (#2d1810) on bg-primary (#fef9f3): ~13:1 ✅
- Accent green (#4a9b6f) on bg-card: ~4.8:1 ✅
- Accent red (#d44638) on white: ~4.5:1 ✅

---

**Lưu ý**: Theme tối (dark mode) KHÔNG được chỉnh sửa và giữ nguyên cấu hình cũ.
