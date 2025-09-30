// SprintCopilot Presentation JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Removed scroll animations to improve performance

    // Counter animation for statistics
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start) + '%';
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target + '%';
            }
        }
        
        updateCounter();
    }

    // Animate hero stats when they come into view
    const heroStatsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stats = entry.target.querySelectorAll('.hero-stats h3');
                stats.forEach((stat, index) => {
                    const values = [95, 80, 60];
                    setTimeout(() => {
                        animateCounter(stat, values[index]);
                    }, index * 200);
                });
                heroStatsObserver.unobserve(entry.target);
            }
        });
    });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        heroStatsObserver.observe(heroStats);
    }

    // Animate impact metrics
    const impactObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const metric = entry.target.querySelector('.impact-metric h3');
                const value = parseInt(metric.textContent);
                setTimeout(() => {
                    animateCounter(metric, value);
                }, 300);
                impactObserver.unobserve(entry.target);
            }
        });
    });

    document.querySelectorAll('.impact-card').forEach(card => {
        impactObserver.observe(card);
    });

    // Chart bar animation
    const chartObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bars = entry.target.querySelectorAll('.chart-bar');
                bars.forEach((bar, index) => {
                    setTimeout(() => {
                        bar.style.animation = 'growUp 1s ease-out forwards';
                    }, index * 100);
                });
                chartObserver.unobserve(entry.target);
            }
        });
    });

    const previewChart = document.querySelector('.preview-chart');
    if (previewChart) {
        chartObserver.observe(previewChart);
    }

    // Add hover effects to cards
    document.querySelectorAll('.problem-card, .feature-card, .impact-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Dashboard preview interaction
    const dashboardPreview = document.querySelector('.dashboard-preview');
    if (dashboardPreview) {
        dashboardPreview.addEventListener('mouseenter', function() {
            this.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.05)';
        });
        
        dashboardPreview.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateY(-5deg) rotateX(5deg) scale(1)';
        });
    }

    // Typing effect for hero title
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.innerHTML = '';
        
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }

    // Removed parallax effect to improve performance

    // Add loading animation
    function showLoadingAnimation() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading SprintCopilot...</p>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        setTimeout(() => {
            loadingOverlay.remove();
        }, 1500);
    }

    // Add click tracking for demo buttons
    document.querySelectorAll('a[href="index.html"]').forEach(button => {
        button.addEventListener('click', function(e) {
            // Add analytics tracking here if needed
            console.log('Demo button clicked');
        });
    });

    // Removed scroll progress indicator to improve performance

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            window.scrollBy(0, window.innerHeight);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            window.scrollBy(0, -window.innerHeight);
        } else if (e.key === 'Home') {
            e.preventDefault();
            window.scrollTo(0, 0);
        } else if (e.key === 'End') {
            e.preventDefault();
            window.scrollTo(0, document.body.scrollHeight);
        }
    });

    console.log('SprintCopilot Presentation loaded successfully! 🚀');
});