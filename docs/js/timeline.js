import { FLAG_EVENTS, formatEventDate, getThemeForMonth } from './flag-data.js';
import { audioController } from './audio-controller.js';

class TimelineController {
    constructor() {
        this.currentView = 'day'; // 'day' or 'week'
        this.selectedDate = new Date();
        this.container = document.getElementById('timeline');
        this.timelineHeader = document.querySelector('.timeline-header');
        this.timelineMarker = document.querySelector('.timeline-marker');
        this.buttons = document.querySelectorAll('.timeline-button');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupHoverEffects();
        this.updateTimelineDisplay();
    }

    setupEventListeners() {
        // Timeline view buttons
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.setView(view);
                audioController.playHoverSound();
            });

            // Show random fact on hover
            button.addEventListener('mouseenter', () => {
                this.showFactTooltip(button);
            });

            button.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });

        // Timeline date selection
        this.container.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.timeline-day');
            if (dayElement) {
                this.selectDate(new Date(dayElement.dataset.date));
                audioController.playHoverSound();
            }
        });
    }

    setupHoverEffects() {
        // Add glow effect on hover
        const addGlowEffect = (element) => {
            element.style.transition = 'all 0.3s ease';
            element.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
            element.style.transform = 'scale(1.05)';
        };

        const removeGlowEffect = (element) => {
            element.style.boxShadow = 'none';
            element.style.transform = 'scale(1)';
        };

        // Apply to timeline days
        this.container.querySelectorAll('.timeline-day').forEach(day => {
            day.addEventListener('mouseenter', () => addGlowEffect(day));
            day.addEventListener('mouseleave', () => removeGlowEffect(day));
        });
    }

    setView(view) {
        this.currentView = view;
        this.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.updateTimelineDisplay();
    }

    updateTimelineDisplay() {
        const days = this.currentView === 'week' ? 7 : 1;
        const timelineDays = this.generateTimelineDays(days);
        
        // Update timeline content
        this.container.innerHTML = `
            <div class="timeline-days">
                ${timelineDays}
            </div>
            <div class="timeline-events">
                ${this.getEventsForCurrentPeriod()}
            </div>
        `;

        // Update header dates
        this.updateTimelineHeader();
    }

    generateTimelineDays(numDays) {
        let html = '';
        const currentDate = new Date();
        
        for (let i = 0; i < numDays; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + i);
            
            const dateStr = date.toISOString().split('T')[0];
            const isToday = i === 0;
            
            html += `
                <div class="timeline-day ${isToday ? 'today' : ''}" 
                     data-date="${dateStr}">
                    <div class="day-label">
                        ${date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div class="day-number">
                        ${date.getDate()}
                    </div>
                    ${this.getEventIndicator(date)}
                </div>
            `;
        }
        
        return html;
    }

    getEventIndicator(date) {
        const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const hasEvent = FLAG_EVENTS[monthDay];
        
        return hasEvent ? '<div class="event-indicator"></div>' : '';
    }

    getEventsForCurrentPeriod() {
        const events = [];
        const currentMonth = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const currentDay = this.selectedDate.getDate().toString().padStart(2, '0');
        const monthDay = `${currentMonth}-${currentDay}`;
        
        if (FLAG_EVENTS[monthDay]) {
            events.push(...FLAG_EVENTS[monthDay]);
        }

        if (events.length === 0) return '';

        return `
            <div class="events-list">
                ${events.map(event => `
                    <div class="event-item">
                        <div class="event-year">${event.year}</div>
                        <div class="event-description">${event.event}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateTimelineHeader() {
        const theme = getThemeForMonth((this.selectedDate.getMonth() + 1).toString());
        
        this.timelineHeader.innerHTML = `
            <div class="timeline-theme">${theme}</div>
            <div class="timeline-date">
                ${this.selectedDate.toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric'
                })}
            </div>
        `;
    }

    selectDate(date) {
        this.selectedDate = date;
        this.updateTimelineDisplay();
        
        // Dispatch event for other components
        const event = new CustomEvent('timelineDateSelected', { 
            detail: { date: this.selectedDate }
        });
        window.dispatchEvent(event);
    }

    showFactTooltip(element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'timeline-tooltip';
        tooltip.textContent = this.getRandomFact();
        
        element.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.height + 5}px`;
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
    }

    hideTooltip() {
        const tooltip = document.querySelector('.timeline-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    getRandomFact() {
        const facts = [
            "Click to change timeline view",
            "Explore historical flag events",
            "Discover flag history",
            "Find important dates",
            "Learn about flag traditions"
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }
}

// Export singleton instance
export const timelineController = new TimelineController();