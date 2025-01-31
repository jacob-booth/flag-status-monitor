# 🇺🇸 Flag Status Monitor

An automated system that tracks and displays the current U.S. flag status (full-staff or half-staff) based on official government sources. The system updates every 6 hours and provides a visual representation of the current flag position.

## 🌐 Live Site

Visit the live flag status monitor at: [https://jacob-booth.github.io/flag-status-monitor](https://jacob-booth.github.io/flag-status-monitor)

## ✨ Features

- 🔄 Automated status updates from multiple authoritative sources
- 🎌 Real-time animated flag display
- 📱 Mobile-responsive design
- ⚡ Fast, reliable updates via GitHub Actions
- 🔒 Secure manual override system

## 🏗️ Project Structure

```
flag-status-monitor/
├── index.html              # Main webpage
├── styles.css             # Styles and animations
├── app.js                 # Frontend logic
├── flag_status.json       # Current flag status
├── _config.yml           # GitHub Pages configuration
├── src/
│   └── api/
│       └── check_status.py  # Status checker script
├── docs/                  # Documentation
│   ├── index.md
│   └── ...
├── scripts/
│   └── dev_server.py     # Local development server
└── .github/
    └── workflows/
        └── update-flag-status.yml  # GitHub Actions workflow
```

## 🚀 Setup

### Prerequisites
- Python 3.9+
- GitHub account with Actions enabled
- API keys for data sources

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/jacob-booth/flag-status-monitor.git
cd flag-status-monitor
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure API keys:
   - Copy `config.example.json` to `config.json`
   - Add your API keys and configuration

4. Run the development server:
```bash
python scripts/dev_server.py
```

### GitHub Pages Setup

1. Go to your repository settings
2. Navigate to "Pages" under "Code and automation"
3. Under "Build and deployment":
   - Source: "GitHub Actions"
   - Branch: "main"
4. Configure repository secrets:
   - Go to Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `OPM_API_KEY`: Your OPM API key
     - `THIRD_PARTY_API_KEY`: Your third-party API key

The site will automatically deploy when:
- Changes are pushed to main branch
- Flag status is updated (every 6 hours)
- Manual deployment is triggered

## 📚 Documentation

Comprehensive documentation is available in the [docs](docs/) directory:
- [System Architecture](docs/architecture.md)
- [API Integration](docs/adr/002-api-integration-strategy.md)
- [Security Architecture](docs/adr/003-security-architecture.md)
- [Implementation Roadmap](docs/implementation-roadmap.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- U.S. Office of Personnel Management
- State Government APIs
- Flag Status API providers

## 📞 Support

For issues and feature requests:
1. Check [existing issues](https://github.com/jacob-booth/flag-status-monitor/issues)
2. Create a [new issue](https://github.com/jacob-booth/flag-status-monitor/issues/new)
3. Provide detailed reproduction steps

## ⚡ Quick Links

- [Live Site](https://jacob-booth.github.io/flag-status-monitor)
- [Documentation](https://jacob-booth.github.io/flag-status-monitor/docs)
- [Report Issue](https://github.com/jacob-booth/flag-status-monitor/issues/new)
- [Request Feature](https://github.com/jacob-booth/flag-status-monitor/issues/new)