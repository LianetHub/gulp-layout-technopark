import { isSmartCaptchaReady, requestSmartCaptchaToken, resetSmartCaptcha } from './smartcaptcha.js';

const parseFormResponse = async (response) => {
	const contentType = response.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		return { success: response.ok, error: response.ok ? "" : "Ошибка сервера" };
	}

	try {
		const data = await response.json();
		const success =
			data?.result === "ok" ||
			data?.success === true ||
			data?.STATUS === "success" ||
			data?.status === "success";
		const error =
			data?.error ??
			data?.ERROR ??
			data?.message ??
			data?.MESSAGE ??
			(!success ? "Ошибка сервера" : "");

		return { success: Boolean(success), error: String(error || "") };
	} catch (e) {
		return { success: false, error: "Некорректный ответ сервера" };
	}
};

const isFileAttachValid = (input) => {
	const attach = input.closest("[data-file-attach]");
	const state = attach?.dataset.state;
	const fileId = attach?.querySelector("[data-file-attach-id]")?.value;
	const hasUploadUrl = Boolean(attach?.dataset.uploadUrl);
	const hasFile = Boolean(input.files && input.files.length > 0);

	if (state === "loading" || state === "error") return false;

	// AJAX-режим: к отправке нужен только токен (file id)
	if (hasUploadUrl) {
		return state === "ready" && Boolean(fileId);
	}

	return hasFile || (state === "ready" && (Boolean(fileId) || Boolean(attach?.fileAttach?.getFile?.())));
};

export const formSubmit = () => {
	const forms = document.querySelectorAll("form");

	forms.forEach((form) => {
		if (form.classList.contains('configurator') || form.classList.contains('search')) return;

		form.addEventListener("submit", formSend);

		if (!form.querySelector('[name="captcha"]')) {
			form.insertAdjacentHTML("beforeend", `<input type="hidden" name="captcha" value="${navigator.userAgent}"/>`);
		}

		const inputs = form.querySelectorAll('[data-required]');
		inputs.forEach(input => {
			input.addEventListener('blur', () => {
				validateField(input);
				toggleButtonState(form);
			});

			input.addEventListener('input', () => {
				if (input.classList.contains('_error')) {
					validateField(input);
				}
				toggleButtonState(form);
			});

			if (input.type === 'checkbox' || input.type === 'file') {
				input.addEventListener('change', () => {
					validateField(input);
					toggleButtonState(form);
				});
			}
		});
	});

	async function formSend(e) {
		e.preventDefault();
		const form = e.target;
		const submitBtn = form.querySelector('.form__submit');
		const currentUrl = form.getAttribute("action");
		const isFormValid = validateForm(form);

		if (isFormValid) {
			try {
				if (form.hasAttribute('data-ya-captcha-form')) {
					if (!isSmartCaptchaReady()) {
						alert('Подождите, загружается защита формы');
						return;
					}

					const token = await requestSmartCaptchaToken();
					const tokenInput = form.querySelector('[name="smart-token"]');

					if (tokenInput) {
						tokenInput.value = token;
					}
				}

				form.classList.add("_sending");
				if (submitBtn) submitBtn.classList.add("_loading");

				const formData = new FormData(form);

				const response = await fetch(currentUrl, {
					method: "POST",
					body: formData,
					headers: {
						"X-Requested-With": "XMLHttpRequest",
					},
				});

				const result = await parseFormResponse(response);

				if (result.success) {
					form.reset();
					toggleButtonState(form);
					showModal("#success");
				} else {
					throw new Error(result.error || "Ошибка сервера");
				}
			} catch (error) {
				if (form.hasAttribute('data-ya-captcha-form') && error?.message && /капч|защит|captcha/i.test(error.message)) {
					alert(error.message);
				} else {
					showModal("#error");
				}
			} finally {
				form.classList.remove("_sending");
				form.reset();
				if (submitBtn) {
					submitBtn.setAttribute('disabled', 'disabled');
					submitBtn.classList.remove("_loading");
				}

				if (form.hasAttribute('data-ya-captcha-form')) {
					resetSmartCaptcha();
				}
			}
		}
	}

	function validateField(input) {
		let isFieldValid = true;

		if (input.matches("[name='email']")) {
			isFieldValid = emailTest(input.value);
		} else if (input.matches("[type='checkbox']")) {
			isFieldValid = input.checked;
		} else if (input.matches("[type='tel']")) {
			isFieldValid = phoneTest(input.value);
		} else if (input.matches("[type='file']")) {
			isFieldValid = isFileAttachValid(input);
		} else {
			isFieldValid = input.value.trim() !== "";
		}

		if (input.matches("[type='file']") && input.closest("[data-file-attach]")) {
			formRemoveError(input);
			return isFieldValid;
		}

		if (!isFieldValid) {
			formAddError(input);
		} else {
			formRemoveError(input);
		}

		return isFieldValid;
	}

	function validateForm(form) {
		let errorCount = 0;
		const inputs = form.querySelectorAll("[data-required]");
		inputs.forEach(input => {
			if (!validateField(input)) {
				errorCount++;
			}
		});
		return errorCount === 0;
	}

	function toggleButtonState(form) {
		const submitBtn = form.querySelector('.form__submit');
		if (!submitBtn) return;

		let isInvalid = false;
		const inputs = form.querySelectorAll("[data-required]");

		inputs.forEach(input => {
			if (input.matches("[name='email']")) {
				if (!emailTest(input.value)) isInvalid = true;
			} else if (input.matches("[type='checkbox']")) {
				if (!input.checked) isInvalid = true;
			} else if (input.matches("[type='tel']")) {
				if (!phoneTest(input.value)) isInvalid = true;
			} else if (input.matches("[type='file']")) {
				if (!isFileAttachValid(input)) isInvalid = true;
			} else if (input.value.trim() === "") {
				isInvalid = true;
			}
		});

		submitBtn.disabled = isInvalid;
	}

	function formAddError(input) {
		input.classList.add("_error");
		input.parentElement.classList.add("_error");
	}

	function formRemoveError(input) {
		input.classList.remove("_error");
		input.parentElement.classList.remove("_error");
	}

	function emailTest(email) {
		return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(email).toLowerCase());
	}

	function phoneTest(phone) {
		const cleaned = phone.replace(/\D/g, '');
		return cleaned.length >= 10 && /^[1-9]\d{9,14}$/.test(cleaned);
	}

	function showModal(id) {
		if (typeof Fancybox !== "undefined") {
			Fancybox.close(true);
			Fancybox.show([{ src: id, type: "inline" }], {
				dragToClose: false,
				mainClass: "custom-modal",
			});
		}
	}
};
