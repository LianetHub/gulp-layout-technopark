/**
 * Открывает mailto: в новой вкладке (веб-почта не подменяет текущую
 */
export function initMailtoLinks() {
	document.addEventListener("click", function (e) {
		console.log("click");

		if (e.defaultPrevented || e.button !== 0) return;
		if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

		const link = e.target.closest('a[href^="mailto:"]');
		if (!link) return;

		e.preventDefault();
		window.open(link.href, "_blank", "noopener,noreferrer");
	});
}
