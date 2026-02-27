# PWA Setup Guide for NIA Tools

## Issues Fixed

1. ✅ Updated manifest.ts with proper icon sizes (192x192, 512x512)
2. ✅ Removed incorrect manifest.json reference from layout.tsx
3. ✅ Added proper icon metadata in layout.tsx
4. ✅ Added maskable icon support for better Android experience

## Required Icons to Generate

You need to create the following icon files in the `/public` directory:

### Required Icons:
- `icon-192.png` - 192x192px (standard icon)
- `icon-512.png` - 512x512px (standard icon)
- `icon-192-maskable.png` - 192x192px (with safe zone padding)
- `icon-512-maskable.png` - 512x512px (with safe zone padding)
- `apple-icon.png` - 180x180px (for iOS devices)

### How to Generate Icons

#### Option 1: Use Online Tools (Recommended)
1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
   - Upload your logo
   - Download all generated icons
   - Place them in the `/public` folder

2. **Favicon.io**: https://favicon.io/
   - Generate icons from image or text
   - Download and extract to `/public`

#### Option 2: Manual Creation with Design Tools

**For Standard Icons (icon-192.png, icon-512.png):**
- Create square images (192x192 and 512x512)
- Use your NIA logo centered
- Background: #004e3b (your theme color)
- Export as PNG

**For Maskable Icons (icon-192-maskable.png, icon-512-maskable.png):**
- Create square images (192x192 and 512x512)
- Add 10% padding on all sides (safe zone)
- Center your logo within the safe zone
- Background: #004e3b
- Export as PNG

**For Apple Icon (apple-icon.png):**
- Create 180x180px square image
- Use your logo centered
- Background: #004e3b
- Export as PNG

#### Option 3: Use ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Convert your logo to required sizes
convert logo.png -resize 192x192 -gravity center -background "#004e3b" -extent 192x192 public/icon-192.png
convert logo.png -resize 512x512 -gravity center -background "#004e3b" -extent 512x512 public/icon-512.png
convert logo.png -resize 180x180 -gravity center -background "#004e3b" -extent 180x180 public/apple-icon.png

# For maskable icons (with padding)
convert logo.png -resize 172x172 -gravity center -background "#004e3b" -extent 192x192 public/icon-192-maskable.png
convert logo.png -resize 460x460 -gravity center -background "#004e3b" -extent 512x512 public/icon-512-maskable.png
```

## Testing Your PWA

### 1. Local Testing
```bash
npm run build
npm start
```

### 2. Check Manifest
- Open DevTools → Application → Manifest
- Verify all icons are loading correctly
- Check for any warnings

### 3. Test Installation
- Chrome: Look for install icon in address bar
- Edge: Click the + icon in address bar
- Mobile: "Add to Home Screen" option should appear

### 4. Lighthouse Audit
- Open DevTools → Lighthouse
- Run PWA audit
- Should score 100% with proper icons

## PWA Requirements Checklist

- ✅ HTTPS (required for production)
- ✅ Valid manifest.ts file
- ✅ Icons: 192x192 and 512x512 (minimum)
- ✅ Maskable icons for Android
- ✅ Apple touch icon for iOS
- ✅ Theme color defined
- ✅ Start URL configured
- ✅ Display mode: standalone
- ⚠️ Service Worker (optional but recommended for offline support)

## Next Steps (Optional Enhancements)

### 1. Add Service Worker for Offline Support
Create `public/sw.js` for caching and offline functionality.

### 2. Add Push Notifications
Follow the Next.js PWA guide for implementing web push notifications.

### 3. Add Screenshots
Add screenshots to manifest for better install prompts:
```typescript
screenshots: [
  {
    src: "/screenshot1.png",
    sizes: "1280x720",
    type: "image/png",
  },
],
```

## Troubleshooting

### Install button not showing?
- Ensure you're on HTTPS (localhost is OK for testing)
- Check DevTools Console for manifest errors
- Verify all icon files exist in `/public`
- Clear browser cache and reload

### Icons not displaying correctly?
- Verify file paths match manifest
- Check image dimensions match declared sizes
- Ensure PNG format (not JPEG)

### iOS not showing install prompt?
- iOS requires manual "Add to Home Screen" from Share menu
- Ensure apple-icon.png exists
- Check viewport meta tag is present

## Resources

- [Next.js PWA Documentation](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
