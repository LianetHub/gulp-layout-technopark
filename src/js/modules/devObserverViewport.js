(function () {
    const display = document.createElement('div');

    Object.assign(display.style, {
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        borderRadius: '4px',
        zIndex: '9999',
        pointerEvents: 'none'
    });

    document.body.appendChild(display);

    function updateWidth() {
        display.textContent = window.innerWidth + 'px';
    }

    window.addEventListener('resize', updateWidth);
    updateWidth();
})();