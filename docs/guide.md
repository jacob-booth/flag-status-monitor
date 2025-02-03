# Flag Status Monitor - Developer Guide

## Repository Structure

```
flag-status-monitor/
├── docs/                 # GitHub Pages site files
│   ├── index.html       # Main page HTML
│   ├── styles.css       # Main stylesheet
│   ├── app.js          # Frontend JavaScript
│   └── flag_status.json # Current flag status data
├── src/
│   └── api/            # Backend API code
└── scripts/            # Development scripts
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/jacob-booth/flag-status-monitor.git
   cd flag-status-monitor
   ```

2. Start the local development server:
   ```bash
   cd docs
   py -m http.server 8000
   ```

3. Open http://localhost:8000 in your browser to view the site.

## Making Changes

1. Make your changes to files in the `docs/` directory.

2. Test locally using the development server.

3. Commit and push your changes:
   ```bash
   git add docs/
   git commit -m "Description of changes"
   git push
   ```

4. The GitHub Pages deployment will automatically start. You can monitor the deployment status:
   - Check `.github/workflows/update-site.yml` for the workflow configuration
   - Check `docs/last_updated.txt` for the last deployment timestamp
   - The site updates every 6 hours or on push to main

## Verifying Changes

1. After pushing changes, wait for the GitHub Actions workflow to complete.

2. Check `docs/last_updated.txt` to confirm the deployment timestamp has updated.

3. Visit https://jacob-booth.github.io/flag-status-monitor/ to verify your changes.

## Flag Implementation Details

The American flag is implemented using CSS with specific attention to accuracy:

- Flag ratio: 19:10 (width:height)
- Union (blue field): 40% width, 7/13 height
- Stars: 50 stars arranged in 9 alternating rows (6-5-6-5-6-5-6-5-6)
- Stripes: 13 alternating stripes (7 red, 6 white)

### CSS Variables

```css
:root {
    --flag-red: #B22234;    /* Official red color */
    --flag-white: #FFFFFF;   /* White */
    --flag-blue: #3C3B6E;   /* Official blue color */
    --star-size: 3px;       /* Size of each star */
}
```

### Updating Star Alignment

Stars are positioned using radial gradients with precise percentage-based coordinates. Each star row follows this pattern:
- 6-star rows: 8.33%, 25%, 41.67%, 58.33%, 75%, 91.67%
- 5-star rows: 16.67%, 33.33%, 50%, 66.67%, 83.33%

## Troubleshooting

1. If changes aren't appearing on the live site:
   - Check `docs/last_updated.txt` for deployment status
   - Verify your changes were pushed to the main branch
   - Check GitHub Actions for any workflow failures

2. If local preview looks different from live site:
   - Clear browser cache
   - Check browser console for errors
   - Verify all files are properly committed and pushed

3. If star alignment issues occur:
   - Check the union dimensions (40% width, 7/13 height)
   - Verify star coordinates in CSS
   - Test responsiveness at different screen sizes