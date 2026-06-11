let widgetId = null;
let pendingResolve = null;
let pendingReject = null;
let pendingTimer = null;

function clearSmartTokens() {
	document.querySelectorAll('input[name="smart-token"]').forEach((input) => {
		input.value = '';
	});
}

function clearPending() {
	pendingResolve = null;
	pendingReject = null;

	if (pendingTimer) {
		clearTimeout(pendingTimer);
		pendingTimer = null;
	}
}

function handleCaptchaCallback(token) {
	if (!pendingResolve) return;

	const resolve = pendingResolve;
	const reject = pendingReject;
	clearPending();

	if (typeof token === 'string' && token.length > 0) {
		resolve(token);
		return;
	}

	reject(new Error('Не удалось пройти проверку. Попробуйте ещё раз.'));
}

function handleNetworkError() {
	if (!pendingReject) return;

	const reject = pendingReject;
	clearPending();
	reject(new Error('Ошибка сети при проверке капчи. Попробуйте ещё раз.'));
}

export function initSmartCaptcha(sitekey) {
	if (!window.smartCaptcha) return false;

	widgetId = window.smartCaptcha.render('captcha-container', {
		sitekey,
		invisible: true,
		callback: handleCaptchaCallback,
	});

	window.smartCaptcha.subscribe(widgetId, 'token-expired', clearSmartTokens);
	window.smartCaptcha.subscribe(widgetId, 'network-error', handleNetworkError);

	return true;
}

export function isSmartCaptchaReady() {
	return Boolean(window.smartCaptcha && widgetId !== null);
}

export function resetSmartCaptcha() {
	clearPending();
	clearSmartTokens();

	if (isSmartCaptchaReady()) {
		window.smartCaptcha.reset(widgetId);
	}
}

export function requestSmartCaptchaToken(timeout = 30000) {
	return new Promise((resolve, reject) => {
		if (!isSmartCaptchaReady()) {
			reject(new Error('Подождите, загружается защита формы'));
			return;
		}

		clearPending();
		pendingResolve = resolve;
		pendingReject = reject;

		pendingTimer = setTimeout(() => {
			if (!pendingReject) return;

			const rejectFn = pendingReject;
			clearPending();
			rejectFn(new Error('Не удалось пройти проверку. Попробуйте ещё раз.'));
		}, timeout);

		window.smartCaptcha.execute(widgetId);
	});
}
