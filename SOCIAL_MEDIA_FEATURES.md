# Social Media Features Documentation

## Tổng quan
Hệ thống quản lý social media và page content đã được thêm vào để:
1. Quản lý links mạng xã hội trong Footer
2. Cho phép chia sẻ trang web lên mạng xã hội
3. Quản lý nội dung các trang Privacy, About, Terms, Contact

---

## 🌐 Social Media Links Management

### Admin Dashboard
Truy cập: **Admin Dashboard → Settings → Social Media tab**

Admin có thể cấu hình links cho các mạng xã hội:
- 📘 Facebook
- 🐦 Twitter/X
- 📷 Instagram
- ▶️ YouTube
- 🎵 TikTok
- 💼 LinkedIn
- 💻 GitHub

**Lưu ý:** Chỉ hiển thị các link được điền. Nếu để trống, nút social media đó sẽ không hiện ở footer.

### Footer Component
Footer tự động fetch social media links từ API `/api/settings/public` và hiển thị các icon tương ứng với links đã cấu hình.

Tính năng:
- Tự động ẩn/hiện nút social media dựa trên có link hay không
- Links mở trong tab mới (`target="_blank"`)
- Có `rel="noopener noreferrer"` để bảo mật

---

## 🔗 Share Buttons Component

Component `ShareButtons` được thêm vào tất cả các trang static (Privacy, About, Terms, Contact).

### Tính năng chia sẻ:
1. **Facebook** - Chia sẻ lên Facebook
2. **Twitter** - Tweet với link và title
3. **LinkedIn** - Chia sẻ lên LinkedIn
4. **WhatsApp** - Gửi qua WhatsApp
5. **Telegram** - Chia sẻ qua Telegram
6. **Email** - Gửi qua email
7. **Copy Link** - Copy link trang hiện tại (có tooltip "Link kopiert!")
8. **Native Share** (Mobile) - Sử dụng native share dialog của mobile

### Cách sử dụng:
```jsx
import ShareButtons from '../components/ShareButtons';

<ShareButtons 
  title="Tiêu đề trang"
  description="Mô tả ngắn"
  url="https://example.com" // optional, mặc định là URL hiện tại
/>
```

---

## 📄 Page Content Management

### Các trang đã được tạo:
- `/privacy` - Datenschutzerklärung (Privacy Policy)
- `/about` - Über uns (About Us)
- `/terms` - Nutzungsbedingungen (Terms of Service)
- `/contact` - Kontakt (Contact)

### Admin Dashboard
Truy cập: **Admin Dashboard → Seiteninhalte (Pages icon 📄)**

Admin có thể chỉnh sửa:
1. **Seitentitel** - Page title (hiển thị trong `<title>` tag)
2. **Meta-Beschreibung** - SEO meta description
3. **Seiteninhalt** - Page content (hỗ trợ Markdown format)
4. **Veröffentlichen** - Publish/unpublish page

### Markdown Format Support:
- `# Heading` - H1
- `## Subheading` - H2
- `### Sub-subheading` - H3
- `- List item` - Bullet list
- Các dòng trống tạo paragraph breaks

### API Endpoints:
- `GET /api/page-content/[pageId]` - Lấy nội dung trang (public)
- `PUT /api/page-content/[pageId]` - Cập nhật nội dung (admin only)
- `GET /api/page-content` - Lấy danh sách tất cả trang (admin only)

---

## 🗄️ Database Models

### SystemSettings
Đã thêm các fields mới:
```javascript
{
  facebookUrl: String,
  twitterUrl: String,
  instagramUrl: String,
  youtubeUrl: String,    // NEW
  tiktokUrl: String,     // NEW
  linkedinUrl: String,   // NEW
  githubUrl: String      // NEW
}
```

### PageContent (New Model)
```javascript
{
  pageId: String,        // 'privacy', 'about', 'terms', 'contact'
  title: String,
  content: String,       // Markdown content
  metaDescription: String,
  isPublished: Boolean,
  updatedAt: Date,
  updatedBy: ObjectId
}
```

---

## 📁 Files Created/Modified

### New Files:
- `/models/PageContent.js` - Model cho page content
- `/pages/api/page-content/[pageId].js` - API endpoint cho single page
- `/pages/api/page-content/index.js` - API endpoint cho list pages
- `/pages/api/settings/public.js` - Public API cho settings
- `/pages/privacy.js` - Privacy page
- `/pages/about.js` - About page
- `/pages/terms.js` - Terms page
- `/pages/contact.js` - Contact page
- `/pages/admin/dashboard/pages.js` - Admin page management
- `/components/ShareButtons.js` - Share buttons component
- `/styles/ShareButtons.module.css` - Styles cho share buttons
- `/styles/StaticPage.module.css` - Styles cho static pages

### Modified Files:
- `/models/SystemSettings.js` - Thêm social media fields
- `/pages/admin/settings.js` - Thêm UI cho social media management
- `/components/Footer.js` - Dynamic social media links
- `/components/AdminDashboardLayout.js` - Thêm link "Seiteninhalte"
- `/styles/adminDashboard.module.css` - Thêm styles cho social media grid

---

## 🚀 Cách sử dụng

### Để cấu hình Social Media Links:
1. Đăng nhập vào Admin Dashboard
2. Vào **Settings** → **Social Media** tab
3. Nhập URLs cho các mạng xã hội bạn muốn hiển thị
4. Click **Speichern** để lưu
5. Links sẽ tự động hiện trong Footer của trang web

### Để chỉnh sửa nội dung trang:
1. Đăng nhập vào Admin Dashboard
2. Vào **Seiteninhalte** (Pages)
3. Chọn trang muốn chỉnh sửa từ sidebar trái
4. Chỉnh sửa Title, Content (Markdown), Meta Description
5. Bật/tắt "Veröffentlichen" để publish/unpublish
6. Click **Speichern** để lưu
7. Click **Vorschau** để xem trang

---

## ✨ Features Highlights

### Security:
- Admin-only endpoints được protect bởi JWT authentication
- Public API chỉ trả về non-sensitive data
- Social media links mở trong tab mới với `noopener noreferrer`

### SEO:
- Meta descriptions cho từng trang
- Proper heading structure (H1, H2, H3)
- Clean URLs (/privacy, /about, etc.)

### UX:
- Share buttons với icons trực quan
- Tooltip khi copy link thành công
- Responsive design cho mobile
- Native share API support cho mobile devices

### Admin Experience:
- Visual editor với live settings
- Grid layout cho easy form filling
- Icons cho mỗi social media platform
- Info box với helpful tips

---

## 🔧 Troubleshooting

### Social media links không hiện trong footer:
- Kiểm tra xem đã nhập URLs trong Admin Settings chưa
- URLs phải có format đúng (https://...)
- Thử clear cache và reload page

### Page content không load:
- Kiểm tra MongoDB connection
- Xem console logs trong browser dev tools
- Đảm bảo page được publish (isPublished = true)

### Share buttons không hoạt động:
- Kiểm tra browser console để xem lỗi
- Đối với native share: chỉ hoạt động trên mobile browsers hỗ trợ
- Đối với copy link: cần HTTPS hoặc localhost

---

## 📝 Next Steps (Optional Improvements)

1. **Rich Text Editor** - Thay markdown bằng WYSIWYG editor (TinyMCE, Quill)
2. **Multi-language Support** - Hỗ trợ nhiều ngôn ngữ cho page content
3. **Analytics Integration** - Track share button clicks
4. **Preview Mode** - Preview page trước khi publish
5. **Version History** - Lưu lịch sử thay đổi content
6. **Image Upload** - Cho phép upload ảnh trong content
7. **Share Count** - Hiển thị số lượng shares

---

Enjoy your new Social Media & Page Management features! 🎉
