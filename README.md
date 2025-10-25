# 🎓 Deutsch Shadowing - Next.js Version

A modern German learning application built with Next.js, featuring Shadowing and Dictation exercises.

## 🚀 Features

### For Learners
- **Shadowing Mode**: Practice pronunciation by following audio
- **Dictation Mode**: Improve spelling and listening skills
- **Real-time Audio Sync**: Perfect synchronization with transcript
- **Keyboard Controls**: Full keyboard navigation support
- **Progress Tracking**: Save and track your learning progress
- **Responsive Design**: Works on all devices
- **Dark Theme**: Modern, eye-friendly interface

### For Administrators
- **Content Management**: Add, edit, delete lessons
- **File Upload**: Upload audio and text files directly
- **User Management**: Admin and Member roles
- **Secure Authentication**: NextAuth with JWT
- **Easy-to-use Dashboard**: Intuitive admin interface

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: JavaScript/TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: CSS3 with CSS Variables
- **Audio**: HTML5 Audio API
- **File Upload**: Formidable
- **Routing**: Next.js Pages Router

## 📦 Installation

1. **Clone repository:**

   ```bash
   git clone <repository-url>
   cd deutsch-shadowing-nextjs
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Setup environment variables:**

   Create `.env.local` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_key
   ```

4. **Create admin user:**

   ```bash
   node scripts/createAdmin.js
   ```

5. **Run development server:**

   ```bash
   npm run dev
   ```

6. **Open browser:**
   - **Homepage**: [http://localhost:3000](http://localhost:3000)
   - **Admin Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)

## 🏗️ Project Structure

```
├── pages/
│   ├── _app.js              # App wrapper
│   ├── index.js             # Homepage
│   ├── shadowing/
│   │   └── [lessonId].js    # Shadowing page
│   └── dictation/
│       └── [lessonId].js    # Dictation page
├── components/
│   ├── Header.js            # Navigation header
│   ├── Footer.js            # Footer
│   ├── AudioControls.js     # Audio controls
│   ├── FooterControls.js    # Footer controls
│   ├── LessonCard.js        # Lesson card
│   ├── ModeSelectionPopup.js # Mode selection
│   └── Transcript.js        # Transcript display
├── styles/
│   └── globals.css          # Global styles
├── public/
│   ├── audio/               # Audio files
│   └── text/                # JSON transcript files
└── next.config.js           # Next.js configuration
```

## 🎯 Usage

### For Learners

#### Shadowing Mode
1. Register/Login at `/auth/login`
2. Select a lesson from the homepage
3. Choose "Shadowing" mode
4. Listen to the audio and follow along
5. Use keyboard controls:
   - `Space`: Play/Pause
   - `←/→`: Seek backward/forward
   - `↑/↓`: Previous/Next sentence

#### Dictation Mode
1. Select a lesson from the homepage
2. Choose "Dictation" mode
3. Type what you hear in the input fields
4. Get real-time feedback on your spelling
5. Double-click for hints

### For Administrators

#### Admin Dashboard
1. Login with admin credentials at `/auth/login`
2. Navigate to `/admin/dashboard`
3. View all lessons in the system

#### Add New Lesson
1. Click **"Thêm Bài Học Mới"** button
2. Fill in lesson information:
   - ID, Title, Display Title, Description, Order
3. Choose upload method:
   - **Upload File**: Select audio + JSON files from computer
   - **Enter URL**: Provide paths to existing files
4. Click **"Thêm Bài Học"**

#### Edit/Delete Lessons
- **Edit**: Click "Sửa" button → Modify → "Cập Nhật"
- **Delete**: Click "Xóa" button → Confirm

📚 **Detailed Guide**: See [QUICK_START_ADMIN.md](QUICK_START_ADMIN.md) and [ADMIN_SYSTEM_GUIDE.md](ADMIN_SYSTEM_GUIDE.md)

## ⌨️ Keyboard Shortcuts

| Key     | Action            |
| ------- | ----------------- |
| `Space` | Play/Pause audio  |
| `←`     | Seek backward 3s  |
| `→`     | Seek forward 3s   |
| `↑`     | Previous sentence |
| `↓`     | Next sentence     |

## 🎨 Customization

### Colors

Edit CSS variables in `styles/globals.css`:

```css
:root {
  --primary-color: #ff6b9d;
  --secondary-color: #4ecdc4;
  --accent-color: #ffe66d;
  /* ... more colors */
}
```

### Adding New Lessons

**Option 1: Via Admin Dashboard (Recommended)**
1. Login as admin
2. Go to `/admin/dashboard`
3. Click "Thêm Bài Học Mới"
4. Upload audio and JSON files
5. Fill in lesson details and submit

**Option 2: Manual Upload**
1. Add audio file to `public/audio/`
2. Add transcript JSON to `public/text/`
3. Use admin dashboard to create lesson entry

**JSON Format**: See `public/text/example_lesson.json` for reference

## 🚀 Deployment

### Static Export

```bash
npm run build
npm run export
```

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

### Other Platforms

- Netlify
- AWS Amplify
- GitHub Pages

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run export` - Export static site

### Code Structure

- **Pages**: Next.js pages with routing
- **Components**: Reusable React components
- **Styles**: Global CSS with CSS variables
- **Public**: Static assets (audio, images)

## 🐛 Troubleshooting

### Common Issues

1. **Audio not playing**: Check browser autoplay policies
2. **Styling issues**: Clear browser cache
3. **Build errors**: Check Node.js version (14+)

### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For support, email: support@deutschshadowing.com

---

**Made with ❤️ for German learners worldwide**
