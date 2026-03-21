document.addEventListener('DOMContentLoaded', () => {
    const yearNode = document.getElementById('current-year');
    if (yearNode) {
        yearNode.textContent = String(new Date().getFullYear());
    }
});
