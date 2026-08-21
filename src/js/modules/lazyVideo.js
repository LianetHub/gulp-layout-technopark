/**
 * Plays muted loop videos only while they are in (or near) the viewport.
 * Pauses off-screen / hidden-tab videos to cut CPU/GPU decode and RAM.
 * Skips autoplay when the user prefers reduced motion or Save-Data.
 */
export function initLazyVideos() {
	const videos = document.querySelectorAll(".hero__video-block, .order__video-block");
	if (!videos.length) return;

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const saveData = navigator.connection?.saveData === true;
	const canAutoplay = !reduceMotion && !saveData;

	const playSafe = (video) => {
		if (!canAutoplay) return;
		const playPromise = video.play();
		if (playPromise?.catch) playPromise.catch(() => {});
	};

	const ensureSources = (video) => {
		if (video.dataset.sourcesLoaded === "1") return;

		video.querySelectorAll("source[data-src]").forEach((source) => {
			if (!source.getAttribute("src") && source.dataset.src) {
				source.setAttribute("src", source.dataset.src);
			}
		});
		video.load();
		video.dataset.sourcesLoaded = "1";
	};

	if (!canAutoplay) {
		videos.forEach((video) => {
			video.removeAttribute("autoplay");
			video.pause();
			video.preload = "none";
		});
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				const video = entry.target;

				if (entry.isIntersecting) {
					ensureSources(video);
					playSafe(video);
				} else {
					video.pause();
				}
			});
		},
		{
			rootMargin: "200px 0px",
			threshold: 0.01,
		},
	);

	videos.forEach((video) => {
		video.removeAttribute("autoplay");
		video.preload = "none";
		video.muted = true;
		video.setAttribute("playsinline", "");

		video.querySelectorAll("source[src]").forEach((source) => {
			if (!source.dataset.src) {
				source.dataset.src = source.getAttribute("src");
				source.removeAttribute("src");
			}
		});
		video.dataset.sourcesLoaded = "0";

		observer.observe(video);
	});

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			videos.forEach((video) => video.pause());
			return;
		}

		videos.forEach((video) => {
			const rect = video.getBoundingClientRect();
			const inView = rect.bottom > 0 && rect.top < window.innerHeight;
			if (inView && video.dataset.sourcesLoaded === "1") playSafe(video);
		});
	});
}
