/**
 * 🎵 [v26.0] Instagram-Style Audio Player Component
 * Handles play/pause, seeking, progress updates, and automatic cleanup.
 */

export function renderAudioPlayerHTML(audioUrl) {
    if (!audioUrl || audioUrl === 'null') return '';
    return `
        <div class="sns-audio-player" id="sns-audio-container">
            <button class="audio-play-btn" id="audio-play-pause" title="Play/Pause">▶</button>
            <div class="audio-progress-wrap">
                <input type="range" class="audio-progress-bar" id="audio-progress" value="0" step="0.1">
                <div class="audio-time-info">
                    <span id="audio-current-time">0:00</span>
                    <span id="audio-total-time">0:00</span>
                </div>
            </div>
        </div>
    `;
}

export function initAudioPlayer(container, audioUrl) {
    if (!container) return null;
    
    const audio = new Audio(audioUrl);
    const playBtn = container.querySelector('#audio-play-pause');
    const progress = container.querySelector('#audio-progress');
    const curTime = container.querySelector('#audio-current-time');
    const totTime = container.querySelector('#audio-total-time');

    if (!playBtn || !progress || !curTime || !totTime) return null;

    const formatTime = (sec) => {
        if (isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    audio.onloadedmetadata = () => {
        totTime.textContent = formatTime(audio.duration);
        progress.max = audio.duration;
    };

    audio.ontimeupdate = () => {
        if (!progress.dragging) {
            progress.value = audio.currentTime;
            curTime.textContent = formatTime(audio.currentTime);
        }
    };

    audio.onended = () => {
        playBtn.textContent = '▶';
        progress.value = 0;
        curTime.textContent = '0:00';
    };

    playBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent drag gesture conflict
        if (audio.paused) {
            audio.play().catch(err => console.warn("Audio Play Conflict:", err));
            playBtn.textContent = '⏸';
        } else {
            audio.pause();
            playBtn.textContent = '▶';
        }
    };

    progress.oninput = () => {
        progress.dragging = true;
        curTime.textContent = formatTime(progress.value);
    };

    progress.onchange = () => {
        audio.currentTime = progress.value;
        progress.dragging = false;
        if (!audio.paused) audio.play();
    };

    // Return cleanup function
    return () => {
        audio.pause();
        audio.src = "";
        audio.load();
    };
}
