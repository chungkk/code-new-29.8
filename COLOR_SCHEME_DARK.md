# Bảng Màu Giao Diện Tối (Dark Mode) - Parroto 💜

## 🎨 Màu Chủ Đạo - Vibrant Purple Paradise

### 1. Màu Nền Tím Đậm Sang Trọng (Rich Purple Base)
- `--bg-primary`: #0f0520 (Nền chính - tím đậm sang trọng)
- `--bg-secondary`: #1a0b2e (Nền phụ - tím vừa)
- `--bg-card`: #251741 (Nền thẻ - tím nhạt hơn)
- `--bg-elevated`: #2f1f47 (Nền nổi bật)
- `--bg-hover`: rgba(147, 51, 234, 0.18) (Hover effect với tím rực rỡ)

### 2. Màu Accent Rực Rỡ & Tương Phản Cao

#### Tím Rực Rỡ (Vibrant Purple)
- `--accent-purple`: #9333ea (Tím chủ đạo - rực rỡ và nổi bật)
- RGB: rgba(147, 51, 234, x)
- Sử dụng cho: Buttons, Links, Borders, Glow effects chính

#### Xanh Cyan Tươi Mát (Cyan Fresh)
- `--accent-blue`: #22d3ee (Cyan - tươi mát hiện đại)
- `--accent-green`: #22d3ee (Alias)
- Sử dụng cho: Success states, Active elements, Positive feedback

#### Magenta & Rose Quyến Rũ (Magenta & Rose)
- `--accent-red`: #e11d48 (Rose đỏ - quyến rũ)
- Magenta: #d946ef (Hồng magenta - rực rỡ)
- Pink: #ec4899 (Hồng đậm)
- `--accent-gradient`: linear-gradient(135deg, #8b5cf6 0%, #d946ef 40%, #ec4899 70%, #e11d48 100%)
- Gradient 4 màu mượt mà: Tím sáng → Magenta → Pink → Rose

### 3. Màu Chữ - Siêu Tương Phản

- `--text-primary`: #faf9fe (Chữ chính - trắng tinh khiết)
- `--text-secondary`: #ddd6f3 (Chữ phụ - tím pastel sáng)
- `--text-muted`: #b4a5d6 (Chữ mờ - tím lavender)

## 🎭 Hiệu Ứng & Bóng Đổ

### Viền với Gam Tím
- `--border-color`: rgba(168, 85, 247, 0.25)
- `--border-light`: rgba(168, 85, 247, 0.12)

### Bóng Đổ với Purple/Pink Glow
- `--shadow-sm`: Bóng nhẹ + tím nhạt
- `--shadow-md`: Bóng vừa + tím vừa
- `--shadow-lg`: Bóng lớn + tím đậm
- `--shadow-xl`: Bóng rất lớn + tím rất đậm
- `--shadow-hover`: Bóng hover với glow tím & hồng

## 🎯 Ứng Dụng Cụ Thể

### Header & Navigation
- Background: rgba(26, 15, 46, 0.95) + blur effect
- Border: Tím nhạt rgba(168, 85, 247, 0.25)
- Shadow: Purple glow

### Cards & Components
- Background: rgba(168, 85, 247, 0.05) - tím rất nhạt
- Border: rgba(168, 85, 247, 0.25-0.3)
- Hover: Tăng độ sáng tím + purple/pink glow

### Buttons & Interactive Elements
- Primary: Gradient tím → hồng → đỏ mận
- Hover: Đảo gradient hoặc tăng glow
- Focus: Border tím đậm + outer glow

### Forms & Inputs
- Background: Gradient tím nhạt
- Border: Tím rgba(168, 85, 247, 0.3-0.6)
- Focus: Glow tím & hồng kết hợp

### Difficulty Colors (Enhanced)
- A1: #34d399 (Xanh lá tươi)
- A2: #4ade80 (Xanh lá sáng)
- B1: #fbbf24 (Vàng)
- B2: #fb923c (Cam)
- C1: #f87171 (Đỏ nhạt)
- C2: #dc2626 (Đỏ đậm)

## ✨ Đặc Điểm Thiết Kế Dark Mode

1. **Tương phản cao**: Text sáng (#f8f7fc) trên nền tím đậm (#1a0f2e)
2. **Tươi mới**: Xanh lá (#34d399) tạo cảm giác năng động
3. **Tím chủ đạo**: Purple (#a855f7) là màu nhấn chính
4. **Đỏ mận & bã trầu**: Pink/Magenta (#ec4899, #c2185b) tạo điểm nhấn ấm
5. **Glow effects**: Bóng đổ tím/hồng tạo chiều sâu và sự sống động
6. **Tương phản rõ giữa các khối**: Mỗi card/component có border và shadow riêng biệt

## 🔍 So Sánh với Light Mode

| Thuộc tính | Light Mode | Dark Mode |
|------------|------------|-----------|
| Nền chính | #fef9f3 (Trắng sữa) | #1a0f2e (Tím đậm) |
| Accent 1 | #d44638 (Đỏ paprika) | #a855f7 (Tím) |
| Accent 2 | #4a9b6f (Xanh dưa) | #34d399 (Xanh lá tươi) |
| Gradient | Đỏ → Xanh | Tím → Hồng → Đỏ mận |
| Bóng đổ | Warm red tones | Purple/pink glow |

## 📱 Responsive & Accessibility

- Tương phản text/background: > 12:1 (WCAG AAA compliant)
- Màu accent có độ sáng đủ trên nền tối
- Hover states rõ ràng với glow effects
- Touch targets đủ lớn cho mobile

---

**Lưu ý quan trọng**: 
- Tất cả thay đổi chỉ ảnh hưởng đến `[data-theme="dark"]`
- Light mode (`:root`) giữ nguyên không thay đổi
- Gradient effect tạo sự chuyển tiếp mượt mà giữa các màu
- Purple glow là đặc trưng của dark theme mới
