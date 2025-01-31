// Constants
const FLAG_STATUS_URL = 'flag_status.json';  // Status file in root directory
const REFRESH_INTERVAL = 3600000; // 1 hour in milliseconds
const ANIMATION_DURATION = 2000; // 2 seconds for flag position transition
const MAX_TIMELINE_ITEMS = 10; // Maximum number of items to show in timeline
const HISTORICAL_STORAGE_KEY = 'flag_status_history';

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
 * Update the timeline visualization
 */
function updateTimeline() {
    timelineElement.innerHTML = '';
    
    const timelineItems = statusHistory.slice(0, MAX_TIMELINE_ITEMS).map(status => {
        const date = new Date(status.last_updated);
        const formattedDate = formatDate(status.last_updated);
        const isHalfStaff = status.status === 'half-staff';
        
        return `
            <div class="timeline-item ${isHalfStaff ? 'half-staff' : 'full-staff'}">
                <div class="timeline-content">
                    <div class="timeline-date">${formattedDate}</div>
                    <div class="timeline-status">${isHalfStaff ? 'Half-Staff' : 'Full-Staff'}</div>
                    ${isHalfStaff ? `<div class="timeline-reason">${status.reason}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
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
    
    // Update history list
    const historyItems = statusHistory
        .filter(status => status.status === 'half-staff')
        .slice(0, 5)
        .map(status => `
            <div class="history-item">
                <div class="history-date">${formatDate(status.last_updated)}</div>
                <div class="history-reason">${status.reason}</div>
            </div>
        `).join('');
    
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
    
    // Don't animate if it's the first update
    const shouldAnimate = currentStatus !== null;
    
    // Update state
    currentStatus = status;
    
    // Add to history if it's a new status
    if (!statusHistory.length || 
        statusHistory[0].last_updated !== status.last_updated ||
        statusHistory[0].status !== status.status) {
        statusHistory.unshift(status);
        saveStatusHistory();
        updateTimeline();
        updateHistoricalStats();
    }
    
    // Update text content
    statusTextElement.textContent = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    reasonElement.textContent = status.reason || '';
    
    if (status.status === 'half-staff') {
        durationElement.textContent = status.duration || 
            `Duration: ${formatDuration(status.start_date, status.end_date)}`;
        
        if (status.proclamation_url) {
            proclamationLinkElement.innerHTML = `
                <a href="${status.proclamation_url}" target="_blank" rel="noopener noreferrer">
                    View Presidential Proclamation
                </a>
            `;
        }
    } else {
        durationElement.textContent = '';
        proclamationLinkElement.innerHTML = '';
    }
    
    lastUpdatedElement.textContent = formatDate(status.last_updated);
    sourceElement.textContent = status.source;
    
    // Update flag position with animation
    if (shouldAnimate) {
        isTransitioning = true;
        flagElement.style.transition = `top ${ANIMATION_DURATION}ms ease-in-out`;
    }
    
    // Set flag position
    if (status.status === 'half-staff') {
        flagElement.classList.add('half-staff');
    } else {
        flagElement.classList.remove('half-staff');
    }
    
    // Reset transition state
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
    // Load historical data
    loadStatusHistory();
    updateTimeline();
    updateHistoricalStats();
    
    // Initial update
    await updateFlagStatus();
    
    // Set up periodic updates
    setInterval(updateFlagStatus, REFRESH_INTERVAL);
    
    // Add error handling for flag animation
    flagElement.addEventListener('transitionend', () => {
        isTransitioning = false;
    });
    
    // Handle visibility changes
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