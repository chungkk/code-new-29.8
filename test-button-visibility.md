# Kiểm tra nút tắt bật Full-Sentence Mode

## Vị trí nút:
Nút toggle nằm trong **cột Diktat** (cột giữa), ở header, ngay bên cạnh dropdown chọn level (A1, A2, B1, B2, C1, C2).

## Desktop (màn hình > 768px):
- Kích thước: 40px × 36px
- Màu nền: Gradient tím (fill-blanks mode) hoặc xanh lá (full-sentence mode)
- Border: 2px solid, nổi bật
- Icon: 
  - ✏️ Bút chì = fill-blanks mode (click để chuyển sang full-sentence)
  - 📝 Danh sách = full-sentence mode (click để chuyển về fill-blanks)

## Mobile (màn hình ≤ 768px):
- Kích thước nhỏ hơn: 36px × 20px
- Cùng icons và màu sắc

## Cách kiểm tra:
1. Mở trình duyệt và truy cập: http://localhost:3000
2. Vào một bài dictation bất kỳ
3. Nhìn vào header của cột Diktat (cột giữa)
4. Bạn sẽ thấy: [Diktat title] [Level dropdown] **[Nút toggle này]** [Sentence counter]

## Troubleshooting:
Nếu vẫn không thấy nút:
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) hoặc Cmd+Shift+R (Mac)
2. Xóa cache trình duyệt
3. Thử trình duyệt khác
4. Kiểm tra console có lỗi JavaScript không

## CSS Classes được sử dụng:
- `.modeToggle` - Button chính
- `[data-mode="fill-blanks"]` - Trạng thái fill-blanks
- `[data-mode="full-sentence"]` - Trạng thái full-sentence
