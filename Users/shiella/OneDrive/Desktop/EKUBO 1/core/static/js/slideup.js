document.addEventListener("DOMContentLoaded", function() {
    const elements = document.querySelectorAll('.slide-up-element');
  
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('slide-up');
          observer.unobserve(entry.target);  // Stop observing once animation has been triggered
        }
      });
    }, {
      threshold: 0.5  // Trigger when 50% of the element is visible
    });
  
    elements.forEach(element => {
      observer.observe(element);
    });
  });
  