// Constants
const FLAG_STATUS_URL = 'data/flag_status.json';
const REFRESH_INTERVAL = 3600000; // 1 hour in milliseconds
const ANIMATION_DURATION = 2000; // 2 seconds for flag position transition

// DOM Elements
const flagElement = document.getElementById('flag');
const statusTextElement = document.getElementById('status-text');
const reasonElement = document.getElementById('reason');
const lastUpdatedElement = document.getElementById('last-updated');
const sourceElement = document.getElementById('source');
const loadingOverlay = document.getElementById('loading-overlay');

// State
let currentStatus = null;
let isTransitioning = false;

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
 * Update the UI with new flag status
 * @param {Object} status - Flag status data
 */
async function updateUI(status) {
    if (isTransitioning) return;
    
    // Don't animate if it's the first update
    const shouldAnimate = currentStatus !== null;
    
    // Update state
    currentStatus = status;
    
    // Update text content
    statusTextElement.textContent = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    reasonElement.textContent = status.reason || '';
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