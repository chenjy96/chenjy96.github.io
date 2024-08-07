document.addEventListener('DOMContentLoaded', function() {
    const normalButton = document.getElementById('normalButton');
    const anomalyButton = document.getElementById('anomalyButton');
    const normalAudio = document.getElementById('normalAudio');
    const anomalyAudio = document.getElementById('anomalyAudio');

    function playAudio(audio, button) {
        if (audio.paused) {
            stopAllAudio();
            audio.play();
            button.textContent = `Stop ${button.textContent}`;
        } else {
            audio.pause();
            audio.currentTime = 0;
            button.textContent = button.textContent.replace('Stop ', '');
        }
    }

    function stopAllAudio() {
        normalAudio.pause();
        normalAudio.currentTime = 0;
        anomalyAudio.pause();
        anomalyAudio.currentTime = 0;
        normalButton.textContent = 'Normal';
        anomalyButton.textContent = 'Anomaly';
    }

    normalButton.addEventListener('click', function() {
        playAudio(normalAudio, normalButton);
    });

    anomalyButton.addEventListener('click', function() {
        playAudio(anomalyAudio, anomalyButton);
    });

    // Attempt to minimize gap in looping
    [normalAudio, anomalyAudio].forEach(audio => {
        audio.addEventListener('timeupdate', function() {
            var buffer = 0.20; // buffer time，could be adjusted 
            if (this.currentTime > this.duration - buffer) {
                this.currentTime = 0;
                this.play();
            }
        });
    });
});