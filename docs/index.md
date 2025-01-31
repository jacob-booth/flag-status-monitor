---
layout: default
---

<div class="container">
    <div class="time">NOW</div>

    <div class="status-display">
        <div class="status-label">STATUS</div>
        <div class="status-value" id="status-text">FULL</div>
    </div>

    <div class="details">
        <div class="detail-row">
            <div class="detail-label">POSITION</div>
            <div class="detail-value" id="position-value">---</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">SINCE</div>
            <div class="detail-value" id="since-value">---</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">DURATION</div>
            <div class="detail-value" id="duration-value">---</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">SOURCE</div>
            <div class="detail-value" id="source-value">---</div>
        </div>
    </div>

    <div class="timeline-section">
        <div class="timeline-header">
            <span>TODAY</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
            <span>SUN</span>
            <span>MON</span>
        </div>
        <div class="timeline" id="timeline">
            <div class="timeline-line"></div>
            <div class="timeline-marker"></div>
        </div>
        <div class="timeline-controls">
            <button class="timeline-button active">DAY</button>
            <button class="timeline-button">WEEK</button>
        </div>
    </div>

    <div class="proclamation-panel" id="proclamation-panel">
        <div class="handle"></div>
        <div class="proclamation-content">
            <div class="proclamation-label">PROCLAMATION</div>
            <p id="proclamation-text">Loading latest proclamation...</p>
            <div class="proclamation-meta">
                <span id="proclamation-date">---</span>
                <a href="#" id="proclamation-link" target="_blank">VIEW FULL TEXT →</a>
            </div>
        </div>
    </div>
</div>

<div class="loading-overlay" id="loading-overlay">
    <div class="loading-spinner"></div>
</div>