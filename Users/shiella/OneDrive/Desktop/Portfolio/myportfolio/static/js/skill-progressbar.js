// Trigger skill progress animations when About section scrolls into view
document.addEventListener('DOMContentLoaded', function(){
    const panel = document.querySelector('.skills-panel');
    if (!panel) return;
    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                panel.querySelectorAll('.skill-progress').forEach(el=> el.classList.add('in-view'));
                obs.unobserve(entry.target);
            }
        });
    }, {threshold: 0.25});
    io.observe(panel);
});
