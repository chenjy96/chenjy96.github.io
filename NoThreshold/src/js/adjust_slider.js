const yAxisSlider = document.getElementById('yAxisSlider');
const yAxisValue = document.getElementById('yAxisValue');

const yAxisValues = [100, 500, 1200, 2000, 3000, 5000, 8000];

function updateYAxis(index) {
    const newYMax = yAxisValues[index];
    yAxisValue.textContent = `Y-axis Max: ${newYMax} mg`;
    
    fftChart.options.scales.y.max = newYMax;
    fftChart.update();
}

yAxisSlider.addEventListener('input', function() {
    const index = parseInt(this.value);
    updateYAxis(index);
});

updateYAxis(2);

function updateChart(newData) {
    fftChart.data.datasets[0].data = newData;
    fftChart.update();
}

const rawYAxisSlider = document.getElementById('rawYAxisSlider');
const rawYAxisValue = document.getElementById('rawYAxisValue');

const rawYAxisValues = [100, 500, 1500, 2000, 3000, 5000, 8000];

function updateRawYAxis(index) {
    const newYMax = rawYAxisValues[index];
    const newYMin = -newYMax;
    rawYAxisValue.textContent = `Y-axis Range: ±${newYMax} mg`;
    
    rawChart.options.scales.y.max = newYMax;
    rawChart.options.scales.y.min = newYMin;
    rawChart.update();
}

rawYAxisSlider.addEventListener('input', function() {
    const index = parseInt(this.value);
    updateRawYAxis(index);
});

updateRawYAxis(3);  // Default Range 2000 (index 3)

function updateRawChart(newData) {
    rawChart.data.datasets[0].data = newData;
    rawChart.update();
}