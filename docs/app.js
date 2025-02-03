// Constants
const FLAG_STATUS_URL = 'flag_status.json';
const WHITE_HOUSE_RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.whitehouse.gov%2Ffeed%2F';
const REFRESH_INTERVAL = 3600000; // 1 hour
const ANIMATION_DURATION = 300;

// DOM Elements
const statusTextElement = document.getElementById('status-text');
const positionValueElement = document.getElementById('position-value');
const sinceValueElement = document.getElementById('since-value');
const durationValueElement = document.getElementById('duration-value');
const sourceValueElement = document.getElementById('source-value');
const timelineElement = document.getElementById('timeline');
const proclamationPanel = document.getElementById('proclamation-panel');
const proclamationText = document.getElementById('proclamation-text');
const proclamationDate = document.getElementById('proclamation-date');
const proclamationLink = document.getElementById('proclamation-link');
const loadingOverlay = document.getElementById('loading-overlay');

// State
let currentStatus = null;
let timelineData = [];
let proclamations = [];
let isPanelExpanded = false;

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(d);
}

/**
 * Format duration for display
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {string} Formatted duration
 */
function formatDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return `${days}D`;
}

/**
 * Update the timeline visualization
 */
function updateTimeline() {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Filter data for the last week
    const weekData = timelineData.filter(item => 
        new Date(item.timestamp) >= weekAgo
    );

    // Calculate timeline position
    const totalTime = now - weekAgo;
    const currentPosition = ((now - weekAgo) / totalTime) * 100;
    
    const timelineLine = timelineElement.querySelector('.timeline-line');
    const timelineMarker = timelineElement.querySelector('.timeline-marker');
    
    timelineLine.style.width = `${currentPosition}%`;
    timelineMarker.style.left = `${currentPosition}%`;
}

/**
 * Toggle proclamation panel
 */
function toggleProclamationPanel() {
    isPanelExpanded = !isPanelExpanded;
    proclamationPanel.classList.toggle('expanded', isPanelExpanded);
}

/**
 * Fetch and parse White House RSS feed
 */
async function fetchWhiteHouseProclamations() {
    try {
        const response = await fetch(WHITE_HOUSE_RSS_PROXY);
        const data = await response.json();
        
        // Filter for proclamations related to flag status
        proclamations = data.items
            .filter(item => 
                item.title.toLowerCase().includes('flag') ||
                item.title.toLowerCase().includes('proclamation')
            )
            .map(item => ({
                title: item.title,
                content: item.content,
                link: item.link,
                date: new Date(item.pubDate)
            }));

        // Update UI with latest proclamation if available
        if (proclamations.length > 0) {
            const latest = proclamations[0];
            proclamationText.textContent = latest.title;
            proclamationDate.textContent = formatDate(latest.date);
            proclamationLink.href = latest.link;
        }
    } catch (error) {
        console.error('Error fetching proclamations:', error);
    }
}

/**
 * Update the UI with new flag status
 * @param {Object} status - Flag status data
 */
async function updateUI(status) {
    currentStatus = status;
    
    // Update main status
    statusTextElement.textContent = status.status === 'half-staff' ? 'HALF' : 'FULL';
    statusTextElement.classList.toggle('half', status.status === 'half-staff');
    
    // Update details
    positionValueElement.textContent = status.status === 'half-staff' ? 'HALF-STAFF' : 'FULL-STAFF';
    sinceValueElement.textContent = formatDate(status.last_updated);
    durationValueElement.textContent = status.duration || 
        formatDuration(status.start_date, status.end_date);
    sourceValueElement.textContent = status.source;
    
    // Add to timeline data
    timelineData.push({
        status: status.status,
        timestamp: status.last_updated
    });
    
    // Update timeline
    updateTimeline();
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    statusTextElement.textContent = 'ERROR';
    positionValueElement.textContent = '---';
    sinceValueElement.textContent = '---';
    durationValueElement.textContent = '---';
    sourceValueElement.textContent = message;
}

/**
 * Fetch current flag status
 */
async function fetchFlagStatus() {
    try {
        const response = await fetch(FLAG_STATUS_URL);
        if (!response.ok) throw new Error('Failed to fetch flag status');
        return await response.json();
    } catch (error) {
        console.error('Error fetching flag status:', error);
        throw error;
    }
}

/**
 * Update flag status and handle errors
 */
async function updateFlagStatus() {
    try {
        loadingOverlay.style.display = 'flex';
        const status = await fetchFlagStatus();
        await updateUI(status);
    } catch (error) {
        showError('Unable to fetch status');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Initialize the application
 */
async function init() {
    // Set up proclamation panel interaction
    proclamationPanel.addEventListener('click', toggleProclamationPanel);
    
    // Set up timeline buttons
    document.querySelectorAll('.timeline-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.timeline-button').forEach(b => 
                b.classList.remove('active')
            );
            button.classList.add('active');
            updateTimeline();
        });
    });
    
    // Initial updates
    await Promise.all([
        updateFlagStatus(),
        fetchWhiteHouseProclamations()
    ]);
    
    // Set up periodic updates
    setInterval(updateFlagStatus, REFRESH_INTERVAL);
    setInterval(fetchWhiteHouseProclamations, REFRESH_INTERVAL);
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updateFlagStatus();
            fetchWhiteHouseProclamations();
        }
    });
}

// Start the application
init().catch(error => {
    console.error('Failed to initialize:', error);
    showError('Failed to initialize');
});