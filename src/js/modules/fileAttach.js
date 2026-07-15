const ICONS = {
	empty: "img/contest/paperclip-24.svg",
	ready: "img/contest/file-doc.svg",
	error: "img/contest/warning.svg",
	remove: "img/contest/trash.svg",
};

const escapeHtml = (value) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const formatSize = (bytes) => {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const getAcceptList = (block, input) => {
	const raw = block.dataset.accept || input?.getAttribute("accept") || "";
	return raw
		.split(",")
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
};

const isFileAccepted = (file, acceptList) => {
	if (!acceptList.length) return true;

	const name = file.name.toLowerCase();
	const type = (file.type || "").toLowerCase();
	const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";

	return acceptList.some((rule) => {
		if (rule.startsWith(".")) return ext === rule;
		if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
		return type === rule;
	});
};

const parseUploadResponse = (raw) => {
	let data = raw;

	if (typeof raw === "string") {
		try {
			data = JSON.parse(raw);
		} catch (e) {
			return { success: false, error: "Некорректный ответ сервера" };
		}
	}

	if (!data || typeof data !== "object") {
		return { success: false, error: "Некорректный ответ сервера" };
	}

	const success = data.success === true || data.STATUS === "success" || data.status === "success";
	const fileId = data.fileId ?? data.FILE_ID ?? data.id ?? data.file_id ?? "";
	const fileName = data.fileName ?? data.FILE_NAME ?? data.name ?? "";
	const error =
		data.error ??
		data.ERROR ??
		data.message ??
		data.MESSAGE ??
		(!success ? "Не удалось загрузить файл" : "");

	return {
		success: Boolean(success && fileId),
		fileId: String(fileId || ""),
		fileName: String(fileName || ""),
		error: String(error || ""),
	};
};

const getBitrixSessid = () => {
	const input = document.querySelector('input[name="sessid"]');
	if (input?.value) return input.value;
	if (typeof window.BX?.bitrix_sessid === "function") return window.BX.bitrix_sessid();
	return "";
};

const createProgressIcon = (percent = 0) => {
	const value = Math.max(0, Math.min(100, Number(percent) || 0));
	const radius = 10;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (value / 100) * circumference;

	return `
		<span class="file-attach__progress" data-file-attach-progress aria-hidden="true" style="--progress:${value}">
			<svg class="file-attach__progress-svg" viewBox="0 0 24 24" width="24" height="24">
				<circle class="file-attach__progress-track" cx="12" cy="12" r="${radius}" fill="none" stroke-width="2.5"></circle>
				<circle class="file-attach__progress-value" cx="12" cy="12" r="${radius}" fill="none" stroke-width="2.5"
					stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
			</svg>
		</span>
	`;
};

const renderState = (block, state, payload = {}) => {
	const area = block.querySelector("[data-file-attach-area]");
	if (!area) return;

	const { name = "", sizeText = "", errorText = "", percent = 0 } = payload;
	const iconsPath = block.dataset.iconsPath || "";
	const safeName = escapeHtml(name);
	const safeSize = escapeHtml(sizeText);
	const safeError = escapeHtml(errorText);
	const safeHint = escapeHtml(block.dataset.hint || "PDF, DOC, JPG до 10 МБ");
	const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));

	const icon = (key) => {
		const custom = block.dataset[`icon${key[0].toUpperCase()}${key.slice(1)}`];
		return escapeHtml(custom || `${iconsPath}${ICONS[key]}`);
	};

	let html = "";

	if (state === "empty") {
		html = `
			<div class="file-attach__state file-attach__state--empty">
				<img src="${icon("empty")}" class="file-attach__icon" alt="" width="24" height="24">
				<span class="file-attach__hint">${safeHint}</span>
				<button type="button" class="file-attach__choose" data-file-attach-choose>Выбрать</button>
			</div>
		`;
	} else if (state === "loading") {
		html = `
			<div class="file-attach__state file-attach__state--loading">
				${createProgressIcon(safePercent)}
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__size">${safeSize} • ${safePercent}%</span>
				</div>
			</div>
		`;
	} else if (state === "ready") {
		html = `
			<div class="file-attach__state file-attach__state--ready">
				<img src="${icon("ready")}" class="file-attach__icon" alt="" width="24" height="24">
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__size">${safeSize}</span>
				</div>
				<button type="button" class="file-attach__remove" data-file-attach-remove aria-label="Удалить файл">
					<img src="${icon("remove")}" alt="" width="16" height="16">
				</button>
			</div>
		`;
	} else if (state === "error") {
		html = `
			<div class="file-attach__state file-attach__state--error">
				<img src="${icon("error")}" class="file-attach__icon" alt="" width="24" height="24">
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__error-text">${safeError}</span>
				</div>
				<button type="button" class="file-attach__remove" data-file-attach-remove aria-label="Удалить файл">
					<img src="${icon("remove")}" alt="" width="16" height="16">
				</button>
			</div>
		`;
	}

	area.innerHTML = html;
	block.dataset.state = state;

	// Служебное сообщение «Прикрепите файл» — только от валидации формы,
	// не путаем его с ошибкой размера/формата (data-state="error").
	if (state !== "empty") {
		block.classList.remove("_error");
		block.querySelector('input[type="file"]')?.classList.remove("_error");
	}

	const form = block.closest("form");
	if (form) {
		form.dispatchEvent(new Event("input", { bubbles: true }));
	}
};

const ensureFileIdInput = (block, input) => {
	let fileIdInput = block.querySelector("[data-file-attach-id]");
	if (fileIdInput) return fileIdInput;

	fileIdInput = document.createElement("input");
	fileIdInput.type = "hidden";
	fileIdInput.name = block.dataset.fileIdName || `${input?.name || "application"}_file_id`;
	fileIdInput.setAttribute("data-file-attach-id", "");
	fileIdInput.value = "";
	block.appendChild(fileIdInput);
	return fileIdInput;
};

const bindFileAttach = (block) => {
	if (block.dataset.fileAttachInited === "1") return;
	block.dataset.fileAttachInited = "1";

	const input = block.querySelector('input[type="file"]');
	const fileIdInput = ensureFileIdInput(block, input);
	const maxMb = Number(block.dataset.maxSize) || 10;
	const maxBytes = maxMb * 1024 * 1024;
	const acceptList = getAcceptList(block, input);
	const uploadUrl = block.dataset.uploadUrl || "";

	let xhr = null;
	let currentFile = null;

	const notifyForm = () => {
		input?.dispatchEvent(new Event("change", { bubbles: true }));
		block.closest("form")?.dispatchEvent(new Event("input", { bubbles: true }));
	};

	const setEmpty = () => {
		currentFile = null;
		fileIdInput.value = "";
		if (input) input.value = "";
		renderState(block, "empty");
		notifyForm();
	};

	const setError = (file, message) => {
		currentFile = null;
		fileIdInput.value = "";
		if (input) input.value = "";
		renderState(block, "error", {
			name: file?.name || "Файл",
			errorText: message,
		});
		notifyForm();
	};

	const setReady = (file, fileId) => {
		currentFile = file;
		fileIdInput.value = fileId || "";
		renderState(block, "ready", {
			name: file.name,
			sizeText: formatSize(file.size),
		});
		notifyForm();
	};

	const setLoading = (file, percent) => {
		renderState(block, "loading", {
			name: file.name,
			sizeText: formatSize(file.size),
			percent,
		});
	};

	const abortUpload = () => {
		if (xhr) {
			xhr.abort();
			xhr = null;
		}
	};

	const uploadFile = (file) => {
		if (!uploadUrl) {
			// Без endpoint — локальный preview (вёрстка / разработка без Bitrix)
			setReady(file, "");
			return;
		}

		abortUpload();
		setLoading(file, 0);

		const formData = new FormData();
		formData.append(input?.name || "file", file);

		const sessid = getBitrixSessid();
		if (sessid) formData.append("sessid", sessid);

		const form = block.closest("form");
		if (form) {
			const title = form.querySelector('[name="form-title"]')?.value;
			if (title) formData.append("form-title", title);
		}

		xhr = new XMLHttpRequest();
		xhr.open("POST", uploadUrl, true);
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

		xhr.upload.addEventListener("progress", (event) => {
			if (!event.lengthComputable) return;
			const percent = Math.round((event.loaded / event.total) * 100);
			setLoading(file, percent);
		});

		xhr.addEventListener("load", () => {
			const currentXhr = xhr;
			xhr = null;

			if (!currentXhr) return;

			if (currentXhr.status < 200 || currentXhr.status >= 300) {
				setError(file, "Ошибка загрузки файла");
				return;
			}

			const result = parseUploadResponse(currentXhr.responseText);
			if (!result.success) {
				setError(file, result.error || "Не удалось загрузить файл");
				return;
			}

			// Файл уже на сервере — в форме отправляем fileId, а не повторно файл
			if (input) input.value = "";
			setReady(file, result.fileId);
			block.dispatchEvent(
				new CustomEvent("file-attach:uploaded", {
					bubbles: true,
					detail: {
						fileId: result.fileId,
						fileName: result.fileName || file.name,
						file,
					},
				})
			);
		});

		xhr.addEventListener("error", () => {
			xhr = null;
			setError(file, "Ошибка сети при загрузке");
			block.dispatchEvent(
				new CustomEvent("file-attach:error", {
					bubbles: true,
					detail: { file, error: "Ошибка сети при загрузке" },
				})
			);
		});

		xhr.addEventListener("abort", () => {
			xhr = null;
		});

		xhr.send(formData);
	};

	const handleSelectedFile = (file) => {
		if (!file) {
			setEmpty();
			return;
		}

		if (!isFileAccepted(file, acceptList)) {
			setError(file, "Недопустимый формат файла");
			return;
		}

		if (file.size > maxBytes) {
			setError(file, `Файл слишком большой (${formatSize(file.size)})`);
			return;
		}

		uploadFile(file);
	};

	block.addEventListener("click", (e) => {
		if (e.target.closest("[data-file-attach-choose]")) {
			e.preventDefault();
			input?.click();
			return;
		}

		if (e.target.closest("[data-file-attach-remove]")) {
			e.preventDefault();
			abortUpload();
			setEmpty();
			return;
		}

		if (e.target.closest("[data-file-attach-area]") && block.dataset.state === "empty") {
			if (e.target.closest("[data-file-attach-choose]")) return;
			input?.click();
		}
	});

	input?.addEventListener("change", () => {
		const file = input.files?.[0];
		handleSelectedFile(file);
	});

	block.closest("form")?.addEventListener("reset", () => {
		abortUpload();
		setEmpty();
	});

	// Публичный API на DOM-узле для Bitrix
	block.fileAttach = {
		reset: () => {
			abortUpload();
			setEmpty();
		},
		getState: () => block.dataset.state || "empty",
		getFileId: () => fileIdInput.value,
		getFile: () => currentFile,
		isReady: () => block.dataset.state === "ready" && (!uploadUrl || Boolean(fileIdInput.value)),
	};

	setEmpty();
};

export const initFileAttach = (root = document) => {
	const scope = root?.querySelectorAll ? root : document;
	scope.querySelectorAll("[data-file-attach]").forEach(bindFileAttach);
};

if (typeof window !== "undefined") {
	window.initFileAttach = initFileAttach;
}
