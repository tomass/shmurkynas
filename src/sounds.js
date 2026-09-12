// Short sounds of the game. They are made by the browser itself, so that no
// sound files have to be downloaded.

let audioContext = null;

function getAudioContext() {
    if (audioContext === null) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return null;
        }
        audioContext = new AudioContextClass();
    }
    // Browsers keep the sound asleep until the player touches something.
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playNote(context, frequency, startTime, duration) {
    const oscillator = context.createOscillator();
    const volume = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;

    // Rise quickly and then die away, so the notes do not click.
    volume.gain.setValueAtTime(0.0001, startTime);
    volume.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// A cheerful climbing major chord played when a treasure is found.
export function playVictorySound() {
    try {
        const context = getAudioContext();
        if (!context) {
            return;
        }
        const startTime = context.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G and the higher C
        notes.forEach((frequency, i) => {
            const isLast = i === notes.length - 1;
            playNote(context, frequency, startTime + i * 0.09, isLast ? 0.55 : 0.25);
        });
    } catch (error) {
        // A game without sound is still a game, so failures here are ignored.
        console.log('Could not play the victory sound:', error);
    }
}
