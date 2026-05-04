"use strict";



document.addEventListener("DOMContentLoaded", function () {
    //  Fancybox
    if (typeof Fancybox !== "undefined" && Fancybox !== null) {
        Fancybox.bind("[data-fancybox]", {
            dragToClose: false,
            closeExisting: true
        });
    }

    document.addEventListener('click', function (e) {
        const target = e.target;
        const header = document.querySelector('.header');

        // menu
        if (target.closest('.header__menu-toggler')) {
            header.classList.toggle('open-menu');
            document.body.classList.toggle('open-mobile-menu');
        }

        if (header.classList.contains('open-menu') && target.classList.contains('menu')) {
            header.classList.remove('open-menu');
            document.body.classList.remove('open-mobile-menu');
        }

        if (target.closest('.menu__link')) {
            header.classList.remove('open-menu');
            document.body.classList.remove('open-mobile-menu');
        }

    })

    // sliders
    document.querySelectorAll('.banner__slider')?.forEach(slider => {
        new Swiper(slider, {
            slidesPerView: 1,
            speed: 1000,
            effect: "fade",
            loop: true,
            autoplay: {
                delay: 5000,
                stopOnLastSlide: false
            },
            fadeEffect: {
                crossFade: true
            }
        })
    })


    if (document.querySelector('.gallery__slider')) {
        new Swiper('.gallery__slider', {
            slidesPerView: "auto",
            spaceBetween: 8,
            navigation: {
                nextEl: ".gallery__next",
                prevEl: ".gallery__prev"
            },
            breakpoints: {
                575.98: {
                    spaceBetween: 16,
                }
            }
        })
    }

    // initAnimation();


});


function initAnimation() {
    const counters = document.querySelectorAll('[data-counter]');
    const animationSections = document.querySelectorAll('[data-animate]');

    if (counters.length > 0) {
        const animationDuration = 2000;

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    startCounter(entry.target);
                }
            });
        }, { threshold: 0.1 });

        counters.forEach(el => counterObserver.observe(el));

        function startCounter(el) {
            const originalText = el.textContent.trim();
            const targetNumber = parseInt(originalText.replace(/\D/g, ''), 10);
            const suffix = originalText.replace(/[0-9\s]/g, '');

            const startNumber = Math.floor(targetNumber * 0.8);
            const startTime = performance.now();

            const updateCounter = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / animationDuration, 1);

                const currentCount = Math.floor(startNumber + (progress * (targetNumber - startNumber)));

                el.textContent = currentCount + (suffix ? suffix : '');

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    el.textContent = targetNumber + (suffix ? suffix : '');
                }
            };

            requestAnimationFrame(updateCounter);
        }
    }

    if (animationSections.length > 0) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, { threshold: 0.1 });

        animationSections.forEach(section => sectionObserver.observe(section));
    }
}