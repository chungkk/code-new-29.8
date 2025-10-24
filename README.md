# 🎓 Deutsch Shadowing - Next.js Version

A modern German learning application built with Next.js, featuring Shadowing and Dictation exercises.

## 🚀 Features

- **Shadowing Mode**: Practice pronunciation by following audio
- **Dictation Mode**: Improve spelling and listening skills
- **Real-time Audio Sync**: Perfect synchronization with transcript
- **Keyboard Controls**: Full keyboard navigation support
- **Responsive Design**: Works on all devices
- **Dark Theme**: Modern, eye-friendly interface

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: JavaScript/TypeScript
- **Styling**: CSS3 with CSS Variables
- **Audio**: HTML5 Audio API
- **Routing**: Next.js Pages Router

## 📦 Installation

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

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

### Shadowing Mode

1. Select a lesson from the homepage
2. Choose "Shadowing" mode
3. Listen to the audio and follow along
4. Use keyboard controls:
   - `Space`: Play/Pause
   - `←/→`: Seek backward/forward
   - `↑/↓`: Previous/Next sentence

### Dictation Mode

1. Select a lesson from the homepage
2. Choose "Dictation" mode
3. Type what you hear in the input fields
4. Get real-time feedback on your spelling
5. Double-click for hints

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

1. Add audio file to `public/audio/`
2. Add transcript JSON to `public/text/`
3. Update lesson data in page components

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
