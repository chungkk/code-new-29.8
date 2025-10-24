# 🎓 Mode Selection Popup - Guide

## 📋 Overview

The Mode Selection Popup appears after a user selects a lesson on the homepage. It allows users to choose between **Shadowing** or **Dictation** modes.

## 🏗️ Structure

### Component Files:

- **Component**: `components/ModeSelectionPopup.js`
- **Styles**: `styles/popup.css`
- **Import**: `pages/_app.js`

### Class Structure:

```
.mode-popup-overlay          # Full screen backdrop
├── .mode-popup-container    # Main popup box
│   ├── .mode-popup-header   # Header with title and close button
│   ├── .mode-popup-lesson-info  # Lesson information
│   └── .mode-popup-options  # Mode selection buttons
│       ├── .mode-popup-option.mode-option-dictation
│       └── .mode-popup-option.mode-option-shadowing
```

## 🎨 Design Features

### Colors:

- **Header Gradient**: `#FF6B9D` → `#FF9A76` (Pink to Orange)
- **Background**: White with light gradient
- **Text**: Dark gray (#2d3436)
- **Accents**:
  - Dictation: Pink (#FF6B9D)
  - Shadowing: Turquoise (#4ECDC4)

### Animations:

- **Overlay**: Fade in (0.3s)
- **Container**: Slide up scale (0.5s)
- **Icons**: Bounce animation (2s)
- **Hover**: Icon scale effect

## 🔧 Props

### ModeSelectionPopup Props:

```javascript
{
  lesson: {
    id: string,
    displayTitle: string,
    description: string,
    title: string,
    audio: string,
    json: string
  },
  onClose: () => void,
  onSelectMode: (lesson, mode: 'shadowing' | 'dictation') => void
}
```

## 🎯 Features

### 1. **Mode Selection**

- Click on either option to select
- Smooth hover effects
- Icon animations

### 2. **Close Button**

- Top right close button (×)
- Click outside to close
- Smooth rotation animation

### 3. **Responsive Design**

- Desktop: Side-by-side layout
- Mobile: Stacked layout
- Touches: Large clickable areas

## 💻 Usage Example

```javascript
import ModeSelectionPopup from "@/components/ModeSelectionPopup";

// In your component:
<ModeSelectionPopup
  lesson={selectedLesson}
  onClose={handleClosePopup}
  onSelectMode={handleModeSelect}
/>;
```

## 🎨 Customization

### Change Colors:

Edit `styles/popup.css`:

```css
.mode-popup-header {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Change Animation Speed:

```css
.mode-popup-container {
  animation: popupSlideIn 0.5s cubic-bezier(...); /* Change 0.5s */
}
```

### Change Size:

```css
.mode-popup-container {
  max-width: 500px; /* Change this value */
}
```

## 📱 Responsive Breakpoints

- **Desktop** (>600px): Horizontal layout, large icons
- **Mobile** (<600px): Vertical layout, optimized spacing

## 🚀 Performance

- **CSS-only animations**: No JavaScript animations
- **GPU acceleration**: Uses transform and opacity
- **Mobile optimized**: Minimal repaints
- **Accessibility**: Proper focus management

## 🐛 Troubleshooting

### Popup not showing?

- Check if `onSelectMode` and `onClose` props are passed
- Verify conditional rendering in parent component

### Styling issues?

- Make sure `popup.css` is imported in `_app.js`
- Check browser DevTools for CSS conflicts

### Animations not smooth?

- Clear browser cache
- Check CSS browser compatibility
- Ensure GPU acceleration is enabled

## 📚 Related Files

- `pages/index.js` - Homepage with lesson selection
- `components/ModeSelectionPopup.js` - Popup component
- `styles/popup.css` - All popup styling
- `styles/globals.css` - Global styles

## ✨ Future Enhancements

- [ ] Add animation preferences
- [ ] Add keyboard shortcuts (D for Dictation, S for Shadowing)
- [ ] Add sound effects on selection
- [ ] Add tooltips for each mode
- [ ] Add progress indicators
