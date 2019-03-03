chrome.storage.sync.get('blacklist', ({ blacklist }) => {

	const url = window.location.href;
	for (const item of blacklist.split("\n")) {
		if (item && url.includes(item)) {
			console.log("Reader Mode disabled by rule:", item);
			return;
		}
	}

	/** @type { { [key: string]: number[] } } */
	const map = {
		"w": [0, -1], "arrowup": [0, -1],
		"a": [-1, 0], "arrowleft": [-1, 0],
		"s": [0, 1], "arrowdown": [0, 1],
		"d": [1, 0], "arrowright": [1, 0],
	};

	/** @type { { [key: string]: boolean } } */
	const keyDown = {};

	/** @type { Element | Window } */
	let defaultTarget = window;

	window.readerModeScrollSpeed = 20;

	function keyboardUsed() {
		const active = document.activeElement;

		return keyDown["control"] || keyDown["alt"] || keyDown["meta"]
			|| (active instanceof HTMLElement ? active.isContentEditable : false)
			|| active instanceof HTMLInputElement
			|| active instanceof HTMLTextAreaElement
			|| active instanceof HTMLSelectElement
	}

	/**
	 * @param {Element | Window} element
	 */
	function canScroll(element) {
		if (!element || !(element instanceof Element)) {
			return false;
		}
		let style = getComputedStyle(element);
		return /(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX) && element.scrollHeight != element.clientHeight;
	}

	/**
	 * @param {Element | Window} element
	 */
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
		for (let parent = element; parent; parent = parent.parentElement) {
			if (canScroll(parent)) {
				return parent == document.body ? defaultTarget : parent;
			}
		}

		return defaultTarget;
	}

	document.addEventListener("keydown", e => {
		if (!e.key) { // apparently this is a thing...
			return;
		}
		const key = e.key.toLowerCase();
		if (!keyboardUsed()) {
			keyDown[key] = true;
			if (key in map) {
				e.preventDefault();
			}
		}
	});

	document.addEventListener("keyup", e => {
		if (!e.key) { // apparently this is a thing...
			return;
		}
		const key = e.key.toLowerCase();
		keyDown[key] = false;
		if (!keyboardUsed() && key in map) {
			e.preventDefault();
		}
	});

	const moveStuff = function () {
		requestAnimationFrame(moveStuff);

		if (keyboardUsed()) {
			return;
		}

		let scrollX = 0;
		let scrollY = 0;
		for (let k in map) {
			if (keyDown[k]) {
				scrollX += map[k][0];
				scrollY += map[k][1];
			}
		}

		if (scrollX == 0 && scrollY == 0) {
			return;
		}

		let targets = document.querySelectorAll(":hover");
		let target = getScrollParent(targets[targets.length - 1]);
		defaultTarget = target;

		let factor = keyDown["shift"] ? 3 : 1;
		target.scrollBy(scrollX * window.readerModeScrollSpeed * factor, scrollY * window.readerModeScrollSpeed * factor);
	};
	moveStuff();

	console.log("Reader Mode " + chrome.runtime.getManifest().version + " enabled");

	const script = document.createElement("script");
	script.innerText = "let disableBlockAdBlockCounter = 0; function disableBlockAdBlock() {if (++disableBlockAdBlockCounter > 1000) { return; } if (typeof BGWRSzJxTu != 'undefined') { console.log(':P'); BGWRSzJxTu.clear(); return; }; requestAnimationFrame(disableBlockAdBlock); }; disableBlockAdBlock();";
	document.body.appendChild(script);
});
