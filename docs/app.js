// Constants
const FLAG_STATUS_URL = 'flag_status.json';
const REFRESH_INTERVAL = 3600000; // 1 hour in milliseconds
const ANIMATION_DURATION = 2000; // 2 seconds for flag position transition
const MAX_TIMELINE_ITEMS = 10;
const HISTORICAL_STORAGE_KEY = 'flag_status_history';

// National holidays and observances that affect flag status
const FLAG_HOLIDAYS = [
    { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'full-staff' },
    { date: '2025-02-17', name: 'Presidents Day', type: 'full-staff' },
    { date: '2025-05-15', name: 'Peace Officers Memorial Day', type: 'half-staff' },
    { date: '2025-05-26', name: 'Memorial Day', type: 'special' }, // half-staff until noon, then full-staff
    { date: '2025-07-04', name: 'Independence Day', type: 'full-staff' },
    { date: '2025-09-01', name: 'Labor Day', type: 'full-staff' },
    { date: '2025-09-11', name: 'Patriot Day', type: 'half-staff' },
    { date: '2025-11-11', name: 'Veterans Day', type: 'full-staff' },
    { date: '2025-12-07', name: 'Pearl Harbor Remembrance Day', type: 'half-staff' }
];

// DOM Elements
const flagElement = document.getElementById('flag');
const statusTextElement = document.getElementById('status-text');
const reasonElement = document.getElementById('reason');
const durationElement = document.getElementById('duration');
const proclamationLinkElement = document.getElementById('proclamation-link');
const lastUpdatedElement = document.getElementById('last-updated');
const sourceElement = document.getElementById('source');
const loadingOverlay = document.getElementById('loading-overlay');
const timelineElement = document.getElementById('timeline');
const yearCountElement = document.getElementById('year-count');
const monthCountElement = document.getElementById('month-count');
const historyListElement = document.getElementById('history-list');
const upcomingEventsElement = document.getElementById('upcoming-events');

// State
let currentStatus = null;
let isTransitioning = false;
let statusHistory = [];

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

/**
 * Format a duration for display
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {string} Formatted duration string
 */
function formatDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    
    if (months === 1) {
        return remainingDays > 0 ? `1 month and ${remainingDays} days` : '1 month';
    }
    return remainingDays > 0 ? `${months} months and ${remainingDays} days` : `${months} months`;
}

/**
 * Get upcoming flag events
 * @returns {Array} Array of upcoming events
 */
function getUpcomingEvents() {
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    
    return FLAG_HOLIDAYS
        .filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= now && eventDate <= threeMonthsFromNow;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Update the upcoming events display
 */
function updateUpcomingEvents() {
    const events = getUpcomingEvents();
    const timeline = document.createElement('div');
    timeline.className = 'event-timeline';
    
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const timeUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
        
        const eventElement = document.createElement('div');
        eventElement.className = `event-item ${event.type}`;
        eventElement.innerHTML = `
            <div class="event-date">${formatDate(event.date)}</div>
            <div class="event-name">${event.name}</div>
            <div class="event-countdown">${timeUntil} days away</div>
            <div class="event-status">
                ${event.type === 'half-staff' ? 'Half-Staff' : 
                  event.type === 'special' ? 'Special Protocol' : 'Full-Staff'}
            </div>
        `;
        
        timeline.appendChild(eventElement);
    });
    
    upcomingEventsElement.innerHTML = '';
    upcomingEventsElement.appendChild(timeline);
}

/**
 * Update the timeline visualization
 */
function updateTimeline() {
    const timelineItems = statusHistory
        .slice(0, MAX_TIMELINE_ITEMS)
        .map((status, index) => {
            const isHalfStaff = status.status === 'half-staff';
            return `
                <div class="timeline-item ${index % 2 === 0 ? 'left' : 'right'}">
                    <div class="timeline-content ${isHalfStaff ? 'half-staff' : 'full-staff'}">
                        <div class="timeline-date">${formatDate(status.last_updated)}</div>
                        <div class="timeline-status">
                            ${isHalfStaff ? 'Half-Staff' : 'Full-Staff'}
                        </div>
                        ${isHalfStaff ? `
                            <div class="timeline-reason">${status.reason}</div>
                            ${status.duration ? `
                                <div class="timeline-duration">${status.duration}</div>
                            ` : ''}
                        ` : ''}
                    </div>
                </div>
            `;
        })
        .join('');
    
    timelineElement.innerHTML = timelineItems;
}

/**
 * Update historical statistics
 */
function updateHistoricalStats() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const yearHalfStaff = statusHistory.filter(status => 
        new Date(status.last_updated) >= yearStart && 
        status.status === 'half-staff'
    ).length;
    
    const monthHalfStaff = statusHistory.filter(status =>
        new Date(status.last_updated) >= monthAgo &&
        status.status === 'half-staff'
    ).length;
    
    yearCountElement.textContent = `${yearHalfStaff} half-staff orders`;
    monthCountElement.textContent = `${monthHalfStaff} half-staff orders`;
    
    const historyItems = statusHistory
        .filter(status => status.status === 'half-staff')
        .slice(0, 5)
        .map(status => `
            <div class="history-item">
                <div class="history-date">${formatDate(status.last_updated)}</div>
                <div class="history-reason">${status.reason}</div>
                ${status.duration ? `
                    <div class="history-duration">${status.duration}</div>
                ` : ''}
            </div>
        `)
        .join('');
    
    historyListElement.innerHTML = historyItems;
}

/**
 * Save status history to local storage
 */
function saveStatusHistory() {
    localStorage.setItem(HISTORICAL_STORAGE_KEY, JSON.stringify(statusHistory));
}

/**
 * Load status history from local storage
 */
function loadStatusHistory() {
    const saved = localStorage.getItem(HISTORICAL_STORAGE_KEY);
    if (saved) {
        statusHistory = JSON.parse(saved);
    }
}

/**
 * Update the UI with new flag status
 * @param {Object} status - Flag status data
 */
async function updateUI(status) {
    if (isTransitioning) return;
    
    const shouldAnimate = currentStatus !== null;
    currentStatus = status;
    
    if (!statusHistory.length || 
        statusHistory[0].last_updated !== status.last_updated ||
        statusHistory[0].status !== status.status) {
        statusHistory.unshift(status);
        saveStatusHistory();
        updateTimeline();
        updateHistoricalStats();
    }
    
    statusTextElement.textContent = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    reasonElement.textContent = status.reason || '';
    
    if (status.status === 'half-staff') {
        durationElement.textContent = status.duration || 
            `Duration: ${formatDuration(status.start_date, status.end_date)}`;
        
        if (status.proclamation_url) {
            proclamationLinkElement.innerHTML = `
                <a href="${status.proclamation_url}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-external-link-alt"></i> View Presidential Proclamation
                </a>
            `;
        }
    } else {
        durationElement.textContent = '';
        proclamationLinkElement.innerHTML = '';
    }
    
    lastUpdatedElement.textContent = formatDate(status.last_updated);
    sourceElement.textContent = status.source;
    
    if (shouldAnimate) {
        isTransitioning = true;
        flagElement.style.transition = `top ${ANIMATION_DURATION}ms ease-in-out`;
    }
    
    if (status.status === 'half-staff') {
        flagElement.classList.add('half-staff');
    } else {
        flagElement.classList.remove('half-staff');
    }
    
    if (shouldAnimate) {
        setTimeout(() => {
            isTransitioning = false;
            flagElement.style.transition = '';
        }, ANIMATION_DURATION);
    }
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    statusTextElement.textContent = 'Error';
    reasonElement.textContent = message;
    lastUpdatedElement.textContent = 'Unable to update';
    sourceElement.textContent = 'Error';
}

/**
 * Fetch current flag status
 * @returns {Promise<Object>} Flag status data
 */
async function fetchFlagStatus() {
    try {
        const response = await fetch(FLAG_STATUS_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch flag status');
        }
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
        showError('Unable to fetch flag status. Please try again later.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Initialize the application
 */
async function init() {
    loadStatusHistory();
    updateTimeline();
    updateHistoricalStats();
    updateUpcomingEvents();
    
    await updateFlagStatus();
    
    setInterval(updateFlagStatus, REFRESH_INTERVAL);
    
    flagElement.addEventListener('transitionend', () => {
        isTransitioning = false;
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updateFlagStatus();
        }
    });
}

// Start the application
init().catch(error => {
    console.error('Failed to initialize application:', error);
    showError('Failed to initialize application. Please refresh the page.');
});