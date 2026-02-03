# SaveOurPhones

## Mission

Reduce e-waste by giving old iPhones a meaningful second life. This project provides a collection of lightweight Progressive Web Apps (PWAs) optimized for older iOS devices, transforming discarded phones into useful dedicated appliances.

## Project Overview

SaveOurPhones is a website hosting a curated collection of single-purpose web apps that run well on older iPhones (iPhone 5s and later with iOS 12+). Users visit the site, choose an app, and add it to their home screen as a standalone PWA.

## Target Devices

- iPhone 5s, 6, 6s, SE (1st gen), 7, 8, X and older
- iOS 12+ (Safari PWA support)
- Limited RAM (1-2GB) and slower processors
- Smaller screens (4"-5.5")

## Design Principles

1. **Lightweight**: Apps must be <500KB total (HTML/CSS/JS). No heavy frameworks.
2. **Offline-first**: Service workers for full offline functionality
3. **Battery efficient**: Minimal background processing, dark mode options
4. **Touch optimized**: Large tap targets (44px+), simple gestures
5. **Standalone**: Each app works independently as a home screen PWA
6. **Accessible**: High contrast, readable fonts, VoiceOver support

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step required)
- Service Workers for offline caching
- Web App Manifest for PWA installation
- LocalStorage/IndexedDB for persistence
- CSS Grid/Flexbox for responsive layouts

## Repository Structure

```
/
├── index.html              # Main landing page / app catalog
├── CLAUDE.md               # This file
├── shared/                 # Shared assets across apps
│   ├── manifest-base.json  # Base PWA manifest template
│   ├── sw-template.js      # Service worker template
│   └── styles/             # Common CSS utilities
├── apps/                   # Individual apps
│   ├── clock/              # Example: bedside clock
│   ├── timer/              # Example: kitchen timer
│   ├── notes/              # Example: simple notepad
│   └── [app-name]/
│       ├── index.html
│       ├── manifest.json
│       ├── sw.js
│       ├── app.js
│       └── styles.css
└── docs/                   # Documentation
    └── adding-apps.md      # Guide for contributors
```

## App Ideas (Repurpose Use Cases)

- **Bedside Clock**: Large display clock with alarm, night mode
- **Kitchen Timer**: Multiple timers, voice alerts
- **Digital Photo Frame**: Slideshow from local photos
- **Baby Monitor Display**: Pair with another device
- **Recipe Viewer**: Offline cookbook
- **Meditation Timer**: Intervals, ambient sounds
- **Habit Tracker**: Daily check-ins
- **Grocery List**: Shareable shopping lists
- **Weather Station**: Current conditions display
- **Music Remote**: Control other devices
- **Security Camera Viewer**: View IP camera feeds
- **Doorbell Display**: Smart doorbell companion
- **Plant Care Tracker**: Watering reminders
- **Pomodoro Timer**: Focus/break intervals
- **White Noise Machine**: Sleep sounds

## Development Guidelines

### Creating a New App

1. Create folder in `/apps/[app-name]/`
2. Include required files: `index.html`, `manifest.json`, `sw.js`
3. Keep total size under 500KB
4. Test on iOS Safari (real device or simulator)
5. Verify offline functionality works
6. Add to main catalog in `/index.html`

### Performance Targets

- First Contentful Paint: <1.5s on 3G
- Time to Interactive: <3s on older devices
- Lighthouse PWA score: 90+

### Testing Checklist

- [ ] Works offline after first load
- [ ] Installable as PWA (Add to Home Screen)
- [ ] Responsive on 4" screens
- [ ] Touch targets are 44px+
- [ ] No JavaScript errors in Safari
- [ ] Dark mode supported
- [ ] Battery usage is minimal

## Commands

```bash
# Local development (any static server)
python3 -m http.server 8000
# or
npx serve .

# Test service worker (requires HTTPS or localhost)
# Use browser DevTools > Application > Service Workers
```

## Contributing

Focus on apps that:
- Serve a single, clear purpose
- Work well as a dedicated device
- Don't require constant internet
- Respect the constraints of older hardware

Avoid:
- Heavy animations or graphics
- Features requiring latest iOS
- Apps that drain battery quickly
- Anything requiring user accounts
