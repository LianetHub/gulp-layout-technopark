export const initFileAttach = () => {
	const blocks = document.querySelectorAll("[data-file-attach]");

	blocks.forEach((block) => {
		const input = block.querySelector('input[type="file"]');
		const chooseBtns = block.querySelectorAll("[data-file-attach-choose]");
		const removeBtns = block.querySelectorAll("[data-file-attach-remove]");
		const nameEl = block.querySelector("[data-file-attach-name]");
		const sizeEl = block.querySelector("[data-file-attach-size]");
		const errorNameEl = block.querySelector("[data-file-attach-error-name]");
		const errorTextEl = block.querySelector("[data-file-attach-error]");
		const maxMb = Number(block.dataset.maxSize) || 10;
		const maxBytes = maxMb * 1024 * 1024;

		const setState = (state) => {
			block.dataset.state = state;
			block.querySelectorAll("[data-state]").forEach((el) => {
				el.hidden = el.dataset.state !== state;
			});

			if (state === "error") {
				block.classList.add("_error");
				input?.classList.add("_error");
			} else {
				block.classList.remove("_error");
				input?.classList.remove("_error");
			}

			const form = block.closest("form");
			if (form) {
				form.dispatchEvent(new Event("input", { bubbles: true }));
			}
		};

		const formatSize = (bytes) => {
			if (bytes < 1024) return `${bytes} Б`;
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
			return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
		};

		const clear = () => {
			if (input) {
				input.value = "";
				input.dispatchEvent(new Event("change", { bubbles: true }));
			}
			setState("empty");
		};

		chooseBtns.forEach((btn) => {
			btn.addEventListener("click", () => input?.click());
		});

		removeBtns.forEach((btn) => {
			btn.addEventListener("click", clear);
		});

		block.querySelector("[data-file-attach-area]")?.addEventListener("click", (e) => {
			if (e.target.closest("[data-file-attach-remove], [data-file-attach-choose]")) return;
			if (block.dataset.state === "empty") input?.click();
		});

		input?.addEventListener("change", () => {
			const file = input.files?.[0];
			if (!file) {
				setState("empty");
				return;
			}

			if (file.size > maxBytes) {
				if (errorNameEl) errorNameEl.textContent = file.name;
				if (errorTextEl) {
					errorTextEl.textContent = `Файл слишком большой (${formatSize(file.size)})`;
				}
				input.value = "";
				setState("error");
				return;
			}

			if (nameEl) nameEl.textContent = file.name;
			if (sizeEl) sizeEl.textContent = formatSize(file.size);
			setState("ready");
		});

		block.closest("form")?.addEventListener("reset", () => {
			setState("empty");
		});

		setState("empty");
	});
};
