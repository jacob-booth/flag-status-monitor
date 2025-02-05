// Audio Controller for managing sound playback
class AudioController {
    constructor() {
        this.context = null;
        this.sounds = new Map();
        this.gainNode = null;
        this.currentlyPlaying = null;
        this.isMuted = false;
        this.volume = 0.3; // Default volume level
        
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => this.initAudioContext(), { once: true });
    }

    initAudioContext() {
        if (this.context) return;
        
        // Create audio context
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create main gain node
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.context.destination);
    }

    async loadSound(id, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.sounds.set(id, audioBuffer);
            return true;
        } catch (error) {
            console.error(`Error loading sound ${id}:`, error);
            return false;
        }
    }

    async playAnthem(fadeIn = true) {
        if (!this.context) return;
        
        // Stop any currently playing sound
        if (this.currentlyPlaying) {
            await this.stop();
        }

        const buffer = this.sounds.get('anthem');
        if (!buffer) return;

        // Create source node
        const source = this.context.createBufferSource();
        source.buffer = buffer;

        // Create gain node for this specific playback
        const gainNode = this.context.createGain();
        if (fadeIn) {
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume, this.context.currentTime + 2);
        } else {
            gainNode.gain.value = this.volume;
        }

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.gainNode);

        // Start playback
        source.start(0);
        
        this.currentlyPlaying = {
            source,
            gainNode,
            startTime: this.context.currentTime
        };

        // Return promise that resolves when playback ends
        return new Promise(resolve => {
            source.onended = () => {
                this.currentlyPlaying = null;
                resolve();
            };
        });
    }

    async stop(fadeOut = true) {
        if (!this.currentlyPlaying) return;

        const { source, gainNode, startTime } = this.currentlyPlaying;
        const playbackTime = this.context.currentTime - startTime;

        if (fadeOut && playbackTime > 0.1) {
            // Fade out over 0.5 seconds
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.5);
            setTimeout(() => source.stop(), 500);
        } else {
            source.stop();
        }

        this.currentlyPlaying = null;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.context.currentTime);
        }
    }

    mute() {
        this.isMuted = true;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
        }
    }

    unmute() {
        this.isMuted = false;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
        }
    }

    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    // Play a short hover sound effect
    async playHoverSound() {
        if (!this.context || this.isMuted) return;
        
        // Create oscillator for hover sound
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.context.currentTime); // A5 note
        
        gainNode.gain.setValueAtTime(0, this.context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1 * this.volume, this.context.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(this.gainNode);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    }
}

// Export singleton instance
export const audioController = new AudioController();