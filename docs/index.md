# U.S. Flag Status Monitor Documentation

## Overview
The U.S. Flag Status Monitor is an automated system that tracks and displays the current U.S. flag status (full-staff or half-staff) based on official government sources.

## Features
- Real-time flag status monitoring
- Automated updates every 6 hours
- Multiple data source integration
- Animated flag display
- Mobile-responsive design

## Technical Documentation

### Architecture
- [System Architecture](architecture.md)
- [API Integration Strategy](adr/002-api-integration-strategy.md)
- [Security Architecture](adr/003-security-architecture.md)
- [Implementation Roadmap](implementation-roadmap.md)

### Data Sources
The system uses multiple data sources in priority order:
1. U.S. Office of Personnel Management (OPM) API
2. State Government APIs
3. Third-Party Flag Status API
4. Web Scraping (fallback)

### Automated Updates
Updates are handled through GitHub Actions:
- Scheduled checks every 6 hours
- Manual override capability
- Automatic deployment to GitHub Pages

### Frontend
The frontend is built with:
- HTML5
- CSS3 (with animations)
- Vanilla JavaScript
- Responsive design principles

## API Documentation

### Flag Status Format
```json
{
  "status": "full-staff | half-staff",
  "last_updated": "ISO 8601 datetime",
  "source": "string",
  "reason": "string",
  "expires": "ISO 8601 datetime | null"
}
```

### Status Codes
- `full-staff`: Flag should be displayed at full staff
- `half-staff`: Flag should be displayed at half staff

## Development Guide

### Local Development
1. Clone the repository
2. Install Python dependencies: `pip install -r requirements.txt`
3. Configure API keys in `config.json`
4. Run the development server: `python scripts/dev_server.py`

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Testing
- Run Python tests: `python -m pytest`
- Check frontend locally: Open `index.html` in a browser

## Deployment

### GitHub Pages
The site is automatically deployed to GitHub Pages when:
- Changes are pushed to main branch
- Flag status is updated
- Manual deployment is triggered

### Configuration
Required environment variables:
- `OPM_API_KEY`: API key for OPM data
- `THIRD_PARTY_API_KEY`: API key for third-party service

## Troubleshooting

### Common Issues
1. Status not updating
   - Check GitHub Actions logs
   - Verify API keys are valid
   - Check data source availability

2. Frontend display issues
   - Clear browser cache
   - Check browser console for errors
   - Verify JSON file is accessible

### Support
For issues and feature requests, please:
1. Check existing GitHub issues
2. Create a new issue if needed
3. Provide detailed reproduction steps

## License
This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.