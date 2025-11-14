# 🚀 Performance Update Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Review all changes in `PERFORMANCE_IMPROVEMENTS.md`
- [ ] Test locally with `npm run dev`
- [ ] Build successfully with `npm run build`
- [ ] Review Chrome DevTools Lighthouse scores

## 📦 Deployment Steps

### 1. Deploy Code Changes
```bash
git add .
git commit -m "feat: major performance improvements - 50%+ faster page loads"
git push origin main
```

### 2. Create Database Indexes (IMPORTANT!)
After deploying, run this once:

```bash
node scripts/create-indexes.js
```

**Expected Output:**
```
✅ Connected to MongoDB
✅ Index created: id (unique)
✅ Index created: level
✅ Index created: difficulty
✅ Index created: createdAt (descending)
✅ Compound index created: level + createdAt
✅ Compound index created: difficulty + createdAt
✨ All indexes created successfully!
```

### 3. Verify Performance

#### Check Cache Headers
```bash
# Should return Cache-Control headers
curl -I https://yoursite.com/api/lessons
curl -I https://yoursite.com/api/lessons/lesson-1
```

#### Test Dashboard Load
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Reload homepage
4. Check:
   - `/api/lessons` response time < 300ms
   - First 6 images load with priority
   - Next page prefetch in background

#### Test Lesson Page Load
1. Open any shadowing/dictation page
2. Check:
   - `/api/lessons/[id]` response time < 200ms
   - Cache-Control header present
   - Page interactive within 2s

## 🎯 Performance Targets

### Dashboard (Homepage)
- ✅ First Contentful Paint: < 1.5s
- ✅ Time to Interactive: < 2.5s
- ✅ API Response: < 300ms

### Lesson Pages
- ✅ First Contentful Paint: < 1.2s
- ✅ Time to Interactive: < 2.0s
- ✅ API Response: < 200ms

## 🔍 Post-Deployment Verification

### Chrome Lighthouse
1. Open page in Chrome
2. F12 → Lighthouse tab
3. Run audit
4. Target scores:
   - Performance: > 90
   - Best Practices: > 95
   - SEO: > 95

### MongoDB Performance
Check indexes are created:
```javascript
// In MongoDB shell
use your-database-name
db.lessons.getIndexes()

// Should see 6+ indexes including compound indexes
```

## 🐛 Troubleshooting

### Indexes Not Created
```bash
# Check MongoDB connection
node scripts/create-indexes.js

# If fails, check .env.local has MONGODB_URI
```

### Cache Not Working
```bash
# Check response headers
curl -I https://yoursite.com/api/lessons

# Should see:
# Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

### Images Loading Slowly
- Check first 6 images have `priority={true}`
- Verify Next.js Image optimization enabled
- Check network tab for lazy loading

## 📊 Monitoring

### Week 1 After Deployment
- Monitor API response times
- Check error rates
- Track user metrics (bounce rate, time on site)
- Review server resource usage

### Week 2-4
- Analyze cache hit rates
- Review Core Web Vitals in Google Search Console
- Compare before/after metrics

## 🎉 Success Criteria

- [ ] Dashboard loads 50%+ faster
- [ ] Lesson pages load 50%+ faster
- [ ] API responses 60%+ faster
- [ ] Lighthouse Performance > 90
- [ ] No errors in production
- [ ] Cache headers working
- [ ] Database indexes created

## 📞 Support

If issues arise:
1. Check server logs for errors
2. Verify MongoDB indexes exist
3. Test API endpoints directly
4. Review browser console for errors

---

**Created**: November 14, 2025
**Last Updated**: November 14, 2025
