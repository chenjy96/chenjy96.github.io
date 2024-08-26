document.addEventListener('DOMContentLoaded', function() {
    const normalButton = document.getElementById('normalButton');
    const anomalyButton = document.getElementById('anomalyButton');
    const anomalyLoopButton = document.getElementById('anomalyLoopButton');

    const normalAudio = document.getElementById('normalAudio');
    const anomalyAudio = document.getElementById('anomalyAudio');
    const anomalyLoopAudio = document.getElementById('anomalyLoopAudio');

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
        anomalyLoopAudio.pause();
        anomalyLoopAudio.currentTime = 0;
        normalButton.textContent = 'Normal';
        anomalyButton.textContent = 'Anomaly';
        anomalyLoopButton.textContent = 'Normal Anomaly Loop';
    }

    normalButton.addEventListener('click', function() {
        playAudio(normalAudio, normalButton);
    });

    anomalyButton.addEventListener('click', function() {
        playAudio(anomalyAudio, anomalyButton);
    });

    anomalyLoopButton.addEventListener('click', function() {
        playAudio(anomalyLoopAudio, anomalyLoopButton);
    });

    // Attempt to minimize gap in looping
    [normalAudio, anomalyAudio,anomalyLoopAudio].forEach(audio => {
        audio.addEventListener('timeupdate', function() {
            var buffer = 0.20; // buffer time，could be adjusted 
            if (this.currentTime > this.duration - buffer) {
                this.currentTime = 0;
                this.play();
            }
        });
    });
});