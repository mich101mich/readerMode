chrome.storage.sync.get('blacklist', ({ blacklist }) => {

	const url = window.location.href;
	for (const item of blacklist.split("\n")) {
		if (item && url.includes(item)) {
			console.log("Reader Mode disabled by rule:", item);

			return;
		}
	}

	var map = {
		"w": [0, -1], "arrowup": [0, -1],
		"a": [-1, 0], "arrowleft": [-1, 0],
		"s": [0, 1], "arrowdown": [0, 1],
		"d": [1, 0], "arrowright": [1, 0],
	};

	function shouldWork() {
		return !window.keyDown["ctrl"]
			&& !document.activeElement.isContentEditable
			&& !(document.activeElement instanceof HTMLInputElement)
			&& !(document.activeElement instanceof HTMLTextAreaElement)
			&& !(document.activeElement instanceof HTMLSelectElement)
	}

	function canScroll(element) {
		if (!element || !(element instanceof Element)) {
			return false;
		}
		var style = getComputedStyle(element);
		return /(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)
	}

	let defaultTarget = window;

	function getScrollParent(element) {

		if (!canScroll(defaultTarget)) {
			defaultTarget = window;
		}

		if (!element || !(element instanceof Element)) {
			return defaultTarget;
		}

		if (getComputedStyle(element).position === "fixed") {
			return canScroll(element) ? element : defaultTarget;
		}
		for (var parent = element; parent; parent = parent.parentElement) {
			if (canScroll(parent)) {
				return parent == document.body ? defaultTarget : parent;
			}
		}

		return defaultTarget;
	}

	window.keyDown = {};
	document.addEventListener("keydown", e => {
		var key = e.key.toLowerCase();
		window.keyDown[key] = true;
		if (shouldWork() && key in map) {
			e.preventDefault();
		}
	});
	document.addEventListener("keyup", e => {
		var key = e.key.toLowerCase();
		window.keyDown[key] = false;
		if (shouldWork() && key in map) {
			e.preventDefault();
		}
	});
	window.moveSpeed = 20;
	window.moveStuff = function () {
		if (!shouldWork()) {
			requestAnimationFrame(window.moveStuff);
			return;
		}
		var scrollX = 0;
		var scrollY = 0;
		for (var k in map) {
			if (window.keyDown[k]) {
				scrollX += map[k][0];
				scrollY += map[k][1];
			}
		}
		var targets = document.querySelectorAll(":hover");
		var target = targets[targets.length - 1];
		target = getScrollParent(target);

		var factor = window.keyDown["shift"] ? 3 : 1;
		target.scrollBy(scrollX * window.moveSpeed * factor, scrollY * window.moveSpeed * factor);

		requestAnimationFrame(window.moveStuff);
	};
	window.moveStuff();
	console.log("Reader Mode " + chrome.runtime.getManifest().version + " enabled");
});
