document.addEventListener('DOMContentLoaded', function () {
    const indicator = document.getElementById('indicator');

    indicator.classList.add(state);

    indicator.addEventListener('stateChanged', function () {
        // console.log('statusChanged was detected');
        indicator.className = 'indicator ' + state;
    });
});
