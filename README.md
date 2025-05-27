# 🇺🇸 U.S. Flag Status Monitor

A modern, real-time web application that monitors and displays the current status of the U.S. flag based on official government sources. The application provides an animated flag display, automatic updates, offline functionality, and comprehensive accessibility features.

## 🌐 Live Site

Visit the live flag status monitor at: [https://jacob-booth.github.io/flag-status-monitor](https://jacob-booth.github.io/flag-status-monitor)

## ✨ Features

### Core Functionality
- **Real-time Flag Status**: Automatically checks and displays current flag status (full-staff or half-staff)
- **Animated Flag Display**: Beautiful CSS-based flag animation with smooth transitions
- **Official Sources**: Integrates with government APIs and official proclamations
- **Automatic Updates**: Configurable polling intervals with smart caching
- **Manual Override**: Secure admin interface for manual status updates

### Modern Web Technologies
- **Progressive Web App (PWA)**: Installable on desktop and mobile devices
- **Offline Support**: Service worker provides full offline functionality
- **Dark Mode**: Automatic and manual theme switching
- **Responsive Design**: Optimized for all screen sizes and devices
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support

### User Experience
- **Real-time Notifications**: Push notifications for status changes
- **Status History**: Complete historical record with search and filtering
- **Keyboard Navigation**: Full keyboard accessibility support
- **Print Friendly**: Optimized print styles for documentation
- **Fast Loading**: Optimized assets and intelligent caching

## 🚀 Quick Start

### Prerequisites
- Python 3.7+ (for development server)
- Modern web browser with JavaScript enabled
- Internet connection (for initial setup and live data)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flag-status-monitor.git
   cd flag-status-monitor
   ```

2. **Start the development server**
   ```bash
   python server.py
   ```
   Or specify a custom port:
   ```bash
   python server.py 3000
   ```

3. **Open in browser**
   Navigate to `http://localhost:8000` (or your custom port)

4. **Install as PWA** (optional)
   - Click the install prompt in your browser
   - Or use the browser's "Install App" option

## 📁 Project Structure

```
flag-status-monitor/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── server.py              # Development server
├── src/
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   ├── js/
│   │   ├── main.js        # Application entry point
│   │   ├── FlagStatusApp.js # Main application class
│   │   ├── components/
│   │   │   ├── FlagDisplay.js
│   │   │   └── NotificationManager.js
│   │   └── utils/
│   │       ├── api.js
│   │       ├── storage.js
│   │       └── constants.js
│   ├── icons/             # PWA icons (various sizes)
│   └── images/            # Screenshots and assets
├── check_status.py        # Backend status checker
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# API Configuration
FLAG_API_URL=https://api.example.com/flag-status
API_KEY=your_api_key_here
UPDATE_INTERVAL=300000  # 5 minutes in milliseconds

# Notification Settings
ENABLE_NOTIFICATIONS=true
NOTIFICATION_SOUND=true

# Cache Settings
CACHE_DURATION=3600000  # 1 hour in milliseconds
OFFLINE_CACHE_SIZE=50   # Number of cached responses
```

### Application Settings
The application can be configured through the settings panel or by modifying `src/js/utils/constants.js`:

```javascript
export const CONFIG = {
  UPDATE_INTERVAL: 5 * 60 * 1000,    // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  NOTIFICATION_TIMEOUT: 5000,
  THEME: 'auto',                     // 'light', 'dark', or 'auto'
  ANIMATIONS_ENABLED: true
};
```

## 🌐 API Endpoints

### Development Server Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Current flag status |
| GET | `/api/history` | Historical status data |
| GET | `/api/health` | Server health check |
| POST | `/api/status/override` | Manual status override |

### Response Format

#### Flag Status Response
```json
{
  "status": "full-staff",
  "reason": "Normal operations",
  "source": "Official Proclamation",
  "last_updated": "2024-01-15T10:30:00Z",
  "next_check": "2024-01-15T11:30:00Z",
  "confidence": 100,
  "metadata": {
    "server": "production",
    "version": "1.0.0"
  }
}
```

#### History Response
```json
{
  "history": [
    {
      "date": "2024-01-15T10:30:00Z",
      "status": "half-staff",
      "reason": "Memorial observance",
      "source": "Presidential Proclamation"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🎨 Customization

### Themes
The application supports light and dark themes with automatic detection:

```css
/* Custom theme variables */
:root {
  --flag-red: #B22234;
  --flag-white: #FFFFFF;
  --flag-blue: #3C3B6E;
  --accent-color: var(--flag-blue);
}

.dark-theme {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}
```

### Flag Animation
Customize the flag animation in `src/css/styles.css`:

```css
.flag {
  animation: wave 6s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}
```

## 🔒 Security

### Content Security Policy
The application implements a strict CSP:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:;">
```

### API Security
- CORS headers properly configured
- Input validation on all endpoints
- Rate limiting (in production)
- HTTPS enforcement (in production)

## ♿ Accessibility

The application is designed to be fully accessible:

- **WCAG 2.1 AA compliant**
- **Screen reader support** with proper ARIA labels
- **Keyboard navigation** for all interactive elements
- **High contrast mode** support
- **Reduced motion** support for users with vestibular disorders
- **Focus management** and skip links

### Keyboard Shortcuts
- `Space` or `Enter`: Refresh status
- `N`: Toggle notifications
- `T`: Toggle theme
- `H`: View history
- `S`: Open settings
- `Escape`: Close modals/overlays

## 📱 Progressive Web App

### Installation
The app can be installed on:
- **Desktop**: Chrome, Edge, Firefox
- **Mobile**: iOS Safari, Android Chrome
- **Windows**: Microsoft Store (when published)

### Offline Functionality
- Full offline browsing
- Cached status data
- Background sync when online
- Offline indicator

### Features
- App shortcuts for quick actions
- Custom splash screen
- Standalone window mode
- Push notifications

## 🧪 Testing

### Manual Testing
1. **Status Updates**: Verify flag position changes
2. **Offline Mode**: Disconnect internet and test functionality
3. **Responsive Design**: Test on various screen sizes
4. **Accessibility**: Test with screen readers and keyboard navigation
5. **PWA Features**: Test installation and offline usage

### Browser Compatibility
- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## 🚀 Deployment

### Static Hosting
Deploy to any static hosting service:

```bash
# Build for production (if using build tools)
npm run build

# Deploy to Netlify, Vercel, GitHub Pages, etc.
```

### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Configuration
- **Development**: Use `server.py` with mock data
- **Staging**: Connect to staging APIs
- **Production**: Use production APIs with monitoring

## 📊 Monitoring

### Analytics
- Page views and user engagement
- PWA installation rates
- Offline usage patterns
- Error tracking and performance metrics

### Health Checks
- API endpoint availability
- Service worker functionality
- Cache performance
- User experience metrics

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure accessibility compliance
- Test across multiple browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **U.S. Government** for providing official flag status information
- **Web Standards Community** for PWA and accessibility guidelines
- **Open Source Contributors** for inspiration and code examples

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/flag-status-monitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flag-status-monitor/discussions)
- **Email**: support@flagstatus.example.com

---

**Made with 🇺🇸 for America**