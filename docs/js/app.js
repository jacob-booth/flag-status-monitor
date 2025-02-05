// Import modules
import { FLAG_FACTS, FLAG_EVENTS, getRandomFact, getThemeForMonth } from './flag-data.js';
import { audioController } from './audio-controller.js';
import { timelineController } from './timeline.js';

// Constants
const FLAG_STATUS_URL = 'flag_status.json';
const WHITE_HOUSE_RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.whitehouse.gov%2Ffeed%2F';
const REFRESH_INTERVAL = 3600000; // 1 hour

// DOM Elements
const statusTextElement = document.getElementById('status-text');
const positionValueElement = document.getElementById('position-value');
const sinceValueElement = document.getElementById('since-value');
const durationValueElement = document.getElementById('duration-value');
const sourceValueElement = document.getElementById('source-value');
const proclamationPanel = document.getElementById('proclamation-panel');
const proclamationText = document.getElementById('proclamation-text');
const proclamationDate = document.getElementById('proclamation-date');
const proclamationLink = document.getElementById('proclamation-link');
const loadingOverlay = document.getElementById('loading-overlay');
const flagElement = document.querySelector('.flag');
const currentFactElement = document.getElementById('current-fact');
const nextFactButton = document.getElementById('next-fact');
const anthemToggle = document.getElementById('anthem-toggle');
const volumeSlider = document.getElementById('volume-slider');
const currentThemeElement = document.getElementById('current-theme');

// State
let currentStatus = null;
let isAnthemPlaying = false;

/**
 * Format a date for display
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
 */
function formatDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return `${days}D`;
}

/**
 * Update the fun facts display
 */
function updateFunFact() {
    const fact = getRandomFact();
    if (currentFactElement) {
        currentFactElement.textContent = fact;
        currentFactElement.style.opacity = 0;
        requestAnimationFrame(() => {
            currentFactElement.style.transition = 'opacity 0.5s ease';
            currentFactElement.style.opacity = 1;
        });
    }
}

/**
 * Update theme display
 */
function updateThemeDisplay() {
    const currentMonth = new Date().getMonth() + 1;
    const theme = getThemeForMonth(currentMonth.toString());
    if (currentThemeElement) {
        currentThemeElement.textContent = theme;
    }
}

/**
 * Toggle anthem playback
 */
async function toggleAnthem() {
    try {
        if (isAnthemPlaying) {
            await audioController.stop();
            anthemToggle.innerHTML = '<span class="icon">♪</span>';
        } else {
            await audioController.playAnthem();
            anthemToggle.innerHTML = '<span class="icon">⏹</span>';
        }
        isAnthemPlaying = !isAnthemPlaying;
    } catch (error) {
        console.error('Error toggling anthem:', error);
        // Reset state if there's an error
        isAnthemPlaying = false;
        anthemToggle.innerHTML = '<span class="icon">♪</span>';
    }
}

/**
 * Update the UI with new flag status
 */
async function updateUI(status) {
    currentStatus = status;
    
    // Update main status
    if (statusTextElement) {
        statusTextElement.textContent = status.status === 'half-staff' ? 'HALF' : 'FULL';
        statusTextElement.classList.toggle('half', status.status === 'half-staff');
    }
    
    // Update flag position
    if (flagElement) {
        flagElement.classList.remove('half-staff', 'full-staff');
        flagElement.classList.add(status.status);
    }
    
    // Update details
    if (positionValueElement) {
        positionValueElement.textContent = status.status === 'half-staff' ? 'HALF-STAFF' : 'FULL-STAFF';
    }
    if (sinceValueElement) {
        sinceValueElement.textContent = formatDate(status.last_updated);
    }
    if (durationValueElement) {
        durationValueElement.textContent = status.duration || 
            formatDuration(status.start_date, status.end_date);
    }
    if (sourceValueElement) {
        sourceValueElement.textContent = status.source;
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (statusTextElement) statusTextElement.textContent = 'ERROR';
    if (positionValueElement) positionValueElement.textContent = '---';
    if (sinceValueElement) sinceValueElement.textContent = '---';
    if (durationValueElement) durationValueElement.textContent = '---';
    if (sourceValueElement) sourceValueElement.textContent = message;
}

/**
 * Fetch current flag status
 */
async function fetchFlagStatus() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${FLAG_STATUS_URL}?t=${timestamp}`);
        if (!response.ok) throw new Error('Failed to fetch flag status');
        return await response.json();
    } catch (error) {
        console.error('Error fetching flag status:', error);
        throw error;
    }
}

/**
 * Fetch and parse White House RSS feed
 */
async function fetchWhiteHouseProclamations() {
    try {
        const response = await fetch(WHITE_HOUSE_RSS_PROXY);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Filter for proclamations related to flag status
        const proclamations = data.items
            ? data.items
                .filter(item =>
                    item.title.toLowerCase().includes('flag') ||
                    item.title.toLowerCase().includes('proclamation')
                )
                .map(item => ({
                    title: item.title,
                    content: item.content,
                    link: item.link,
                    date: new Date(item.pubDate)
                }))
            : [];

        // Update UI with latest proclamation if available
        if (proclamations.length > 0 && proclamationText && proclamationDate && proclamationLink) {
            const latest = proclamations[0];
            proclamationText.textContent = latest.title;
            proclamationDate.textContent = formatDate(latest.date);
            proclamationLink.href = latest.link;
        } else {
            // Show default message if no proclamations available
            if (proclamationText) {
                proclamationText.textContent = 'No recent proclamations available';
            }
            if (proclamationDate) {
                proclamationDate.textContent = formatDate(new Date());
            }
            if (proclamationLink) {
                proclamationLink.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching proclamations:', error);
        // Show error message in UI
        if (proclamationText) {
            proclamationText.textContent = 'Unable to load proclamations';
        }
        if (proclamationDate) {
            proclamationDate.textContent = formatDate(new Date());
        }
        if (proclamationLink) {
            proclamationLink.style.display = 'none';
        }
    }
}

/**
 * Update flag status and handle errors
 */
async function updateFlagStatus() {
    try {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        const status = await fetchFlagStatus();
        await updateUI(status);
    } catch (error) {
        showError('Unable to fetch status');
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

/**
 * Initialize the application
 */
async function init() {
    try {
        // Set up audio controls
        if (anthemToggle && volumeSlider) {
            anthemToggle.addEventListener('click', toggleAnthem);
            volumeSlider.addEventListener('input', (e) => {
                audioController.setVolume(e.target.value / 100);
            });
        }

        // Set up fun facts
        if (nextFactButton) {
            updateFunFact();
            nextFactButton.addEventListener('click', updateFunFact);
        }
        
        // Set up theme display
        updateThemeDisplay();
        
        // Set up proclamation panel interaction
        if (proclamationPanel) {
            proclamationPanel.addEventListener('click', () => {
                proclamationPanel.classList.toggle('expanded');
            });
        }
        
        // Initial updates
        await Promise.all([
            updateFlagStatus(),
            fetchWhiteHouseProclamations()
        ]);
        
        // Set up periodic updates
        setInterval(updateFlagStatus, REFRESH_INTERVAL);
        setInterval(fetchWhiteHouseProclamations, REFRESH_INTERVAL);
        setInterval(updateFunFact, REFRESH_INTERVAL);
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                updateFlagStatus();
                fetchWhiteHouseProclamations();
                updateThemeDisplay();
            }
        });
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize');
    }
}

// Start the application
init().catch(error => {
    console.error('Failed to initialize:', error);
    showError('Failed to initialize');
});