# 🎨 Header & Footer Implementation Guide

## ✨ Tổng Quan

Đã thêm Header và Footer với phong cách colorful, playful cho ứng dụng German Shadowing.

---

## 📦 Files Mới

### 1. **Header Component**
📄 `/src/components/Header.js`

**Tính năng:**
- 🎓 Logo với animation bounce
- 🏠 Navigation menu (Trang Chủ, Bài Học, Tiến Độ, Cài Đặt)
- 👤 User profile button
- 🌈 Gradient background (Pink → Turquoise)
- ✨ Glassmorphism effects
- 📱 Responsive design

### 2. **Footer Component**
📄 `/src/components/Footer.js`

**Tính năng:**
- 📝 4 sections: About, Lessons, Links, Contact
- 🌐 Social media links (Facebook, YouTube, Instagram, Twitter)
- 💌 Contact information
- 💖 Animated heart in copyright
- 🌈 Animated rainbow top border
- 📱 Mobile responsive grid

---

## 🎨 Design Features

### **Header:**
```css
- Background: Pink → Turquoise gradient
- Fixed position at top
- Glassmorphism navigation buttons
- Bounce animation on logo
- Hover effects: translateY + scale + shadow
- Active state: white background with pink text
```

### **Footer:**
```css
- Background: Dark gradient (#2d3436 → #1e272e)
- Rainbow animated border on top
- 4-column grid (responsive → 2 columns → 1 column)
- Social icons: rotate + translateY on hover
- Heartbeat animation on heart emoji
- Semi-transparent sections
```

---

## 🔧 Integration Logic

### **App.js - Layout Component**
```javascript
function Layout({ children }) {
  const location = useLocation();
  const isLessonPage = location.pathname.includes('/shadowing/') || 
                       location.pathname.includes('/dictation/');

  return (
    <>
      {!isLessonPage && <Header />}  // Ẩn trên trang Lesson
      {children}
      {!isLessonPage && <Footer />}  // Ẩn trên trang Lesson
    </>
  );
}
```

**Logic:**
- ✅ **Trang chủ** (/) → Hiện Header + Footer
- ❌ **Trang Shadowing** (/shadowing/:id) → Ẩn Header + Footer
- ❌ **Trang Dictation** (/dictation/:id) → Ẩn Header + Footer

**Lý do:** Trang lesson đã có fixed audio bar riêng, không cần header/footer.

---

## 📱 Responsive Breakpoints

### **Desktop (> 1024px)**
```
Header:
- Full navigation menu
- Logo + Nav + User button

Footer:
- 4-column grid
- Full social section
```

### **Tablet (768px - 1024px)**
```
Header:
- Navigation hidden → Có thể thêm hamburger menu sau
- Logo + User button

Footer:
- 2-column grid
```

### **Mobile (< 768px)**
```
Header:
- Compact logo
- User avatar only (hide name)

Footer:
- 1-column grid
- Centered text
- Stacked links
```

---

## 🎯 CSS Classes Reference

### **Header Classes:**
```css
.app-header           // Main header container
.header-content       // Inner wrapper
.logo                 // Logo container
.logo-icon           // Logo emoji (🎓)
.logo-text           // "German Shadowing" text
.header-nav          // Navigation menu
.nav-link            // Navigation button
.nav-link.active     // Active nav button
.nav-icon            // Nav emoji icon
.nav-text            // Nav button text
.user-button         // User profile button
.user-avatar         // User emoji (👤)
.user-name           // User name text
```

### **Footer Classes:**
```css
.app-footer              // Main footer container
.footer-content          // 4-column grid
.footer-section          // Each column
.footer-title            // Main title with gradient
.footer-description      // Description text
.footer-social           // Social icons container
.social-link             // Individual social icon
.footer-heading          // Section headings
.footer-links            // Links list
.footer-contact          // Contact info list
.contact-icon            // Contact emoji icons
.footer-bottom           // Bottom copyright section
.footer-bottom-content   // Bottom inner wrapper
.copyright               // Copyright text
.heart                   // Animated heart ❤️
.footer-bottom-links     // Bottom links
.separator               // Dot separator (•)
```

---

## 🎨 Color Palette

```css
Header:
- Background: linear-gradient(135deg, #FF6B9D, #4ECDC4)
- Nav hover: rgba(255, 255, 255, 0.3)
- Active nav: white background
- Text: white

Footer:
- Background: linear-gradient(135deg, #2d3436, #1e272e)
- Top border: #FF6B9D → #4ECDC4 → #FFE66D → #6C5CE7
- Links: #b2bec3
- Hover: #4ECDC4
- Headings: #FFE66D
```

---

## ✨ Animations

### **1. Logo Bounce**
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
```

### **2. Rainbow Border**
```css
@keyframes rotateBorder {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
```

### **3. Heartbeat**
```css
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
```

### **4. Social Hover**
```css
.social-link:hover {
  transform: translateY(-5px) rotate(10deg);
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
}
```

---

## 🚀 Cách Sử Dụng

### **1. Thêm Navigation Link Mới**
```javascript
// In Header.js
<button className="nav-link">
  <span className="nav-icon">📝</span>
  <span className="nav-text">Từ Vựng</span>
</button>
```

### **2. Thêm Social Link Mới**
```javascript
// In Footer.js
<a href="https://tiktok.com" className="social-link" title="TikTok">
  <span>🎵</span>
</a>
```

### **3. Thêm Footer Section Mới**
```javascript
<div className="footer-section">
  <h4 className="footer-heading">🎁 Premium</h4>
  <ul className="footer-links">
    <li><a href="#">Nâng Cấp</a></li>
    <li><a href="#">Giá Cả</a></li>
  </ul>
</div>
```

---

## 📊 Layout Structure

```
<App>
  ├─ <Router>
  │   ├─ <Layout>
  │   │   ├─ <Header /> (conditional)
  │   │   ├─ <Routes>
  │   │   │   ├─ <HomePage />
  │   │   │   ├─ <ShadowingPage />
  │   │   │   └─ <DictationPage />
  │   │   └─ <Footer /> (conditional)
  │   └─ </Layout>
  └─ </Router>
</App>
```

---

## 🎯 Future Enhancements

### **Header:**
- [ ] Hamburger menu cho mobile
- [ ] Search bar
- [ ] Notification bell
- [ ] Language switcher (DE/EN/VI)
- [ ] Dark mode toggle

### **Footer:**
- [ ] Newsletter signup form
- [ ] Live chat widget
- [ ] Back to top button
- [ ] Cookie consent banner
- [ ] Site map

---

## 🐛 Known Issues

### **Issue 1: Header covers content**
**Fix:** Added `margin-top: 100px` to `.main-container`

### **Issue 2: Footer not sticky**
**Fix:** Used `margin-top: auto` and flexbox layout

### **Issue 3: Navigation hidden on lesson pages**
**Fix:** Conditional rendering based on pathname

---

## ✅ Testing Checklist

- [x] Header hiển thị đúng trên trang chủ
- [x] Header ẩn trên trang Shadowing
- [x] Header ẩn trên trang Dictation
- [x] Footer hiển thị đúng trên trang chủ
- [x] Footer ẩn trên trang lesson
- [x] Logo click → navigate về home
- [x] Navigation active state hoạt động
- [x] Social links có hover effect
- [x] Responsive trên mobile
- [x] Animations hoạt động mượt
- [x] No layout shift khi load

---

## 📝 Notes

- Header height: ~80px (fixed)
- Footer height: ~auto (depends on content)
- Z-index hierarchy:
  - Header: 2000
  - Fixed audio bar: 1000
  - Footer: default
- Safe areas: Support iOS notch with `env(safe-area-inset-*)`

---

Made with 💖 by Droid
