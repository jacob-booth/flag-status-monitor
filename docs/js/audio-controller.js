class AudioController {
    constructor() {
        this.anthem = document.getElementById('anthem');
        this.volume = 0.3; // Default volume 30%
        
        if (this.anthem) {
            this.anthem.volume = this.volume;
        }
    }

    async playAnthem() {
        if (!this.anthem) return;
        
        try {
            await this.anthem.play();
        } catch (error) {
            console.error('Error playing anthem:', error);
            throw error;
        }
    }

    async stop() {
        if (!this.anthem) return;
        
        try {
            this.anthem.pause();
            this.anthem.currentTime = 0;
        } catch (error) {
            console.error('Error stopping anthem:', error);
            throw error;
        }
    }

    setVolume(value) {
        if (!this.anthem) return;
        
        this.volume = Math.max(0, Math.min(1, value));
        this.anthem.volume = this.volume;
    }

    getVolume() {
        return this.volume;
    }
}

// Export singleton instance
export const audioController = new AudioController();