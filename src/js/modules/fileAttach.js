const ICON_CLASS = {
	empty: "icon-paperclip",
	ready: "icon-file",
	error: "icon-warning",
	remove: "icon-trash",
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

	const success =
		data.result === "ok" ||
		data.success === true ||
		data.STATUS === "success" ||
		data.status === "success";

	const fileId = data.fileId ?? data.FILE_ID ?? data.id ?? data.file_id ?? "";
	const fileName = data.fileName ?? data.FILE_NAME ?? data.name ?? "";
	const error =
		data.error ??
		data.ERROR ??
		data.message ??
		data.MESSAGE ??
		(!success ? "Не удалось загрузить файл" : "");

	return {
		success: Boolean(success),
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

const resolveErrorText = (file, message) => {
	if (file && /слишком большой/i.test(String(message || ""))) {
		return `Файл слишком большой (${formatSize(file.size)})`;
	}
	return message;
};

const renderState = (block, state, payload = {}) => {
	const area = block.querySelector("[data-file-attach-area]");
	if (!area) return;

	const { name = "", sizeText = "", errorText = "" } = payload;
	const safeName = escapeHtml(name);
	const safeSize = escapeHtml(sizeText);
	const safeError = escapeHtml(errorText);
	const safeHint = escapeHtml(block.dataset.hint || "PDF, DOC, JPG до 10 МБ");

	let html = "";

	if (state === "empty") {
		html = `
			<div class="file-attach__state file-attach__state--empty">
				<span class="file-attach__icon ${ICON_CLASS.empty}" aria-hidden="true"></span>
				<span class="file-attach__hint">${safeHint}</span>
				<button type="button" class="file-attach__choose" data-file-attach-choose>Выбрать</button>
			</div>
		`;
	} else if (state === "loading") {
		html = `
			<div class="file-attach__state file-attach__state--loading">
				<span class="file-attach__loader" aria-hidden="true"></span>
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__size">${safeSize}</span>
				</div>
			</div>
		`;
	} else if (state === "ready") {
		html = `
			<div class="file-attach__state file-attach__state--ready">
				<span class="file-attach__icon ${ICON_CLASS.ready}" aria-hidden="true"></span>
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__size">${safeSize}</span>
				</div>
				<button type="button" class="file-attach__remove" data-file-attach-remove aria-label="Удалить файл">
					<span class="${ICON_CLASS.remove}" aria-hidden="true"></span>
				</button>
			</div>
		`;
	} else if (state === "error") {
		html = `
			<div class="file-attach__state file-attach__state--error">
				<span class="file-attach__icon ${ICON_CLASS.error}" aria-hidden="true"></span>
				<div class="file-attach__meta">
					<span class="file-attach__name">${safeName}</span>
					<span class="file-attach__error-text">${safeError}</span>
				</div>
				<button type="button" class="file-attach__remove" data-file-attach-remove aria-label="Удалить файл">
					<span class="${ICON_CLASS.remove}" aria-hidden="true"></span>
				</button>
			</div>
		`;
	}

	area.innerHTML = html;
	block.dataset.state = state;

	if (state !== "empty") {
		block.classList.remove("_error");
		block.querySelector('input[type="file"]')?.classList.remove("_error");
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

const isAttachReady = (block, fileIdInput, currentFile, uploadUrl) => {
	if (block.dataset.state !== "ready") return false;
	if (!uploadUrl) return Boolean(currentFile) || Boolean(fileIdInput.value);
	return Boolean(fileIdInput.value) || Boolean(currentFile);
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

	let abortController = null;
	let currentFile = null;
	let suppressChange = false;

	const notifyForm = () => {
		suppressChange = true;
		input?.dispatchEvent(new Event("change", { bubbles: true }));
		suppressChange = false;
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
			errorText: resolveErrorText(file, message),
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

	const setLoading = (file) => {
		if (block.dataset.state === "loading") return;
		renderState(block, "loading", {
			name: file.name,
			sizeText: formatSize(file.size),
		});
	};

	const abortUpload = () => {
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
	};

	const uploadFile = async (file) => {
		if (!uploadUrl) {
			setReady(file, "");
			return;
		}

		abortUpload();
		setLoading(file);

		const formData = new FormData();
		formData.append(input?.name || "file", file);

		const sessid = getBitrixSessid();
		if (sessid) formData.append("sessid", sessid);

		const form = block.closest("form");
		if (form) {
			const title = form.querySelector('[name="form-title"]')?.value;
			if (title) formData.append("form-title", title);
		}

		const controller = new AbortController();
		abortController = controller;

		try {
			const response = await fetch(uploadUrl, {
				method: "POST",
				body: formData,
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				signal: controller.signal,
			});

			if (abortController !== controller) return;
			abortController = null;

			if (!response.ok) {
				setError(file, "Ошибка сервера");
				return;
			}

			const result = parseUploadResponse(await response.text());
			if (!result.success) {
				setError(file, result.error || "Не удалось загрузить файл");
				return;
			}

			if (result.fileId && input) {
				input.value = "";
			}

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
		} catch (error) {
			if (abortController !== controller) return;
			abortController = null;

			if (error?.name === "AbortError") return;

			setError(file, "Ошибка сервера");
			block.dispatchEvent(
				new CustomEvent("file-attach:error", {
					bubbles: true,
					detail: { file, error: "Ошибка сервера" },
				})
			);
		}
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
		if (suppressChange) return;
		const file = input.files?.[0];
		handleSelectedFile(file);
	});

	block.closest("form")?.addEventListener("reset", () => {
		abortUpload();
		setEmpty();
	});

	block.fileAttach = {
		reset: () => {
			abortUpload();
			setEmpty();
		},
		getState: () => block.dataset.state || "empty",
		getFileId: () => fileIdInput.value,
		getFile: () => currentFile,
		isReady: () => isAttachReady(block, fileIdInput, currentFile, uploadUrl),
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
