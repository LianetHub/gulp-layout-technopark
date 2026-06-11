"use strict";

import * as devFunctions from "./modules/functions.js";
import { initSmartCaptcha } from "./modules/smartcaptcha.js";

window.initSmartCaptcha = initSmartCaptcha;

document.addEventListener("DOMContentLoaded", function () {
	//  Fancybox
	if (typeof Fancybox !== "undefined" && Fancybox !== null) {
		Fancybox.bind("[data-fancybox]", {
			dragToClose: false,
			closeExisting: true,
		});
	}

	devFunctions.isWebp();
	devFunctions.OS();
	devFunctions.formSubmit();
	devFunctions.initYandexMap();
	devFunctions.initMailtoLinks();

	// clickHandler

	document.addEventListener("click", function (e) {
		const target = e.target;
		const header = document.querySelector(".header");

		// form-title (hidden) for callback form
		const callbackTrigger = target.closest('[data-fancybox][href="#callback"], [data-fancybox][data-src="#callback"]');
		if (callbackTrigger) {
			const modal = document.getElementById("callback");
			const form = modal?.querySelector("form");
			const title = callbackTrigger.getAttribute("data-form-title") || callbackTrigger.dataset.formTitle || callbackTrigger.textContent?.trim();

			if (form && title) {
				let hidden = form.querySelector('input[type="hidden"][name="form-title"]');
				if (!hidden) {
					hidden = document.createElement("input");
					hidden.type = "hidden";
					hidden.name = "form-title";
					form.appendChild(hidden);
				}
				hidden.value = title;
			}
		}

		// menu
		if (target.closest(".header__menu-toggler")) {
			header.classList.toggle("open-menu");
			document.body.classList.toggle("open-mobile-menu");
		}

		if (header.classList.contains("open-menu") && target.classList.contains("menu")) {
			header.classList.remove("open-menu");
			document.body.classList.remove("open-mobile-menu");
		}

		if (target.closest(".menu__link")) {
			header.classList.remove("open-menu");
			document.body.classList.remove("open-mobile-menu");
		}

		if (document.body.classList.contains("_touch")) {
			if (target.closest(".menu__arrow")) {
				const parentItem = target.closest(".menu__item--parent");
				const arrow = target.closest(".menu__arrow");

				if (parentItem) {
					parentItem.classList.toggle("open-submenu");
					const isExpanded = parentItem.classList.contains("open-submenu");
					arrow.setAttribute("aria-expanded", isExpanded);
				}
			} else if (!target.closest(".menu__item--parent")) {
				const activeParent = document.querySelector(".menu__item--parent.open-submenu");
				if (activeParent) {
					activeParent.classList.remove("open-submenu");
					const activeArrow = activeParent.querySelector(".menu__arrow");
					if (activeArrow) activeArrow.setAttribute("aria-expanded", "false");
				}
			}
		}
	});

	// sliders
	document.querySelectorAll(".banner__slider")?.forEach((slider) => {
		new Swiper(slider, {
			slidesPerView: 1,
			speed: 1000,
			effect: "fade",
			loop: true,
			autoplay: {
				delay: 5000,
				stopOnLastSlide: false,
			},
			fadeEffect: {
				crossFade: true,
			},
		});
	});

	if (document.querySelector(".gallery__slider")) {
		new Swiper(".gallery__slider", {
			slidesPerView: "auto",
			spaceBetween: 8,
			navigation: {
				nextEl: ".gallery__slider-next",
				prevEl: ".gallery__slider-prev",
			},
			a11y: {
				enabled: true,
				prevSlideMessage: "Предыдущий слайд",
				nextSlideMessage: "Следующий слайд",
			},
			breakpoints: {
				575.98: {
					spaceBetween: 13,
					slidesPerGroup: 2,
				},
				1200: {
					slidesPerGroup: 3,
				},
			},
		});
	}

	if (document.querySelector(".career-guidance__slider")) {
		new Swiper(".career-guidance__slider", {
			slidesPerView: "auto",
			spaceBetween: 8,
			navigation: {
				nextEl: ".career-guidance__next",
				prevEl: ".career-guidance__prev",
			},
			breakpoints: {
				575.98: {
					spaceBetween: 16,
				},
			},
		});
	}

	initAnimation();
});

function initAnimation() {
	const counters = document.querySelectorAll("[data-counter]");
	const animationSections = document.querySelectorAll("[data-animate]");

	if (counters.length > 0) {
		const animationDuration = 2000;

		const counterObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !entry.target.classList.contains("animated")) {
						entry.target.classList.add("animated");
						startCounter(entry.target);
					}
				});
			},
			{ threshold: 0.1 },
		);

		counters.forEach((el) => counterObserver.observe(el));

		function startCounter(el) {
			const originalText = el.textContent.trim();
			const targetNumber = parseInt(originalText.replace(/\D/g, ""), 10);
			const suffix = originalText.replace(/[0-9\s\u00A0\u202F]/g, "");

			const startNumber = Math.floor(targetNumber * 0.8);
			const startTime = performance.now();
			const animationDuration = 1500;

			const formatNumber = (num) => {
				return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
			};

			const updateCounter = (currentTime) => {
				const elapsedTime = currentTime - startTime;
				const progress = Math.min(elapsedTime / animationDuration, 1);

				const currentCount = Math.floor(startNumber + progress * (targetNumber - startNumber));

				el.textContent = formatNumber(currentCount) + (suffix ? " " + suffix : "");

				if (progress < 1) {
					requestAnimationFrame(updateCounter);
				} else {
					el.textContent = formatNumber(targetNumber) + (suffix ? " " + suffix : "");
				}
			};

			requestAnimationFrame(updateCounter);
		}
	}

	if (animationSections.length > 0) {
		const sectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("animated");
					}
				});
			},
			{ threshold: 0.1 },
		);

		animationSections.forEach((section) => sectionObserver.observe(section));
	}
}
