# 🎨 Lesson Card Flicker Fix - Technical Guide

## 🐛 Problem Description

When hovering over lesson cards on the homepage, the cards were flickering/blinking continuously. This happened especially when the mouse cursor was on the edge/border of the card.

## 🔍 Root Causes

### Issue 1: Continuous Animation on ::before Element

```css
/* BEFORE (WRONG) */
.lesson-card::before {
  animation: rotateBorder 3s linear infinite; /* ❌ Always running */
}
```

**Problem**: The gradient border animation was continuously rotating, causing visual flicker.

### Issue 2: Wiggle Animation on Hover

```css
/* BEFORE (WRONG) */
.lesson-card:hover {
  animation: wiggle 0.5s ease-in-out; /* ❌ Conflicts with hover */
}

@keyframes wiggle {
  0%,
  100% {
    transform: translateY(-10px) scale(1.02) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) scale(1.02) rotate(-2deg);
  }
  75% {
    transform: translateY(-10px) scale(1.02) rotate(2deg);
  }
}
```

**Problem**:

- When mouse is on card edge, hover state rapidly toggles on/off
- Each toggle triggers the wiggle animation
- Results in continuous flicker

### Issue 3: Complex Border Implementation

```css
/* BEFORE (WRONG) */
.lesson-card {
  border: 4px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
}

.lesson-card::before {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(...);
  z-index: -1;
  animation: rotateBorder 3s linear infinite; /* Continuous animation */
}
```

**Problem**: Complex pseudo-element border logic with continuous animation

## ✅ Solutions Applied

### Fix 1: Remove Continuous Animation

```css
/* AFTER (CORRECT) */
.lesson-card::before {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lesson-card:hover::before {
  opacity: 1;
}
```

**Benefits**:

- Border gradient appears on hover (smooth fade)
- No continuous animation
- No flickering

### Fix 2: Simplify Hover Effect

```css
/* AFTER (CORRECT) */
.lesson-card {
  flex: 1 1 calc(50% - 20px);
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  padding: 25px;
  border-radius: 25px;
  box-shadow: var(--box-shadow);
  border: 2px solid #ff6b9d; /* Simplified border */
  cursor: pointer;
  transition: all 0.3s ease; /* Smooth transition */
  text-decoration: none;
  color: var(--text-color);
  position: relative;
  overflow: hidden;
}

.lesson-card:hover {
  transform: translateY(-8px); /* Simple lift effect */
  box-shadow: 0 12px 30px rgba(108, 92, 231, 0.4);
  border-color: #4ecdc4; /* Color change */
  background: linear-gradient(135deg, #fff0e0 0%, #ffe0cc 100%); /* Brighten */
}

.lesson-card:active {
  transform: translateY(-4px); /* Press effect */
}
```

**Benefits**:

- Simple, clean CSS
- No conflicting animations
- Smooth transitions
- No flicker on edge hover

### Fix 3: Optimize Transitions

- Changed from `cubic-bezier(0.68, -0.55, 0.265, 1.55)` to `ease`
- Removed animation keywords
- Only use `transition` for smooth effects

## 📊 CSS Changes Summary

| Aspect           | Before                       | After                     |
| ---------------- | ---------------------------- | ------------------------- |
| **Border**       | 4px transparent + ::before   | 2px solid color           |
| **Animation**    | Continuous rotation          | Opacity fade on hover     |
| **Hover Effect** | Wiggle animation (conflicts) | Simple translate + shadow |
| **Transition**   | Cubic-bezier complex         | Smooth ease               |
| **Flicker**      | ❌ Yes                       | ✅ No                     |

## 🎯 Result

✅ **No more flickering**

- Smooth hover effects
- Clean appearance
- Better performance
- No animation conflicts

## 🔧 How to Customize

### Change Hover Color:

```css
.lesson-card:hover {
  border-color: #YOUR_COLOR;
  background: linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%);
}
```

### Adjust Lift Distance:

```css
.lesson-card:hover {
  transform: translateY(-12px); /* Change -8px to -12px, etc */
}
```

### Change Transition Speed:

```css
.lesson-card {
  transition: all 0.5s ease; /* Change 0.3s to 0.5s, etc */
}
```

### Add Different Shadow on Hover:

```css
.lesson-card:hover {
  box-shadow: 0 20px 40px rgba(255, 107, 157, 0.3); /* Adjust shadow */
}
```

## 🚀 Performance Benefits

✅ **Better Performance**:

- No continuous animations (saves CPU)
- Single simple transition per property
- No rapid state changes
- GPU-friendly transforms only

✅ **Better UX**:

- Smooth, predictable animation
- No jarring flicker
- Clean visual feedback
- Responsive feel

## 📚 Files Modified

- `styles/globals.css` - Main fix location
  - Line 136-179: Lesson card styles
  - Line 181-184: Animation keyframes

## 🧪 Testing Checklist

- [x] Hover over lesson card center - smooth lift
- [x] Hover over lesson card edge - no flicker
- [x] Hover over lesson card corner - no flicker
- [x] Move mouse slowly across card - smooth animation
- [x] Click lesson card - works correctly
- [x] Mobile touch - no issues

## 💡 Key Takeaways

1. **Avoid continuous animations on hover elements** - Causes flicker on edges
2. **Use transitions instead of animations for interactive states** - Smoother, cleaner
3. **Keep hover effects simple** - Less chance of conflicts
4. **Test edge cases** - Especially on borders/edges where hover toggles rapidly

---

**Problem Fixed! ✅** No more lesson card flickering! 🎉
