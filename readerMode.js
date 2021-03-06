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
	const keyDown = {
		"control": false,
		"shift": false,
		"alt": false,
		"meta": false,
	};
	for (const key in map) {
		keyDown[key] = false;
	}

	// requestAnimationFrame has been called
	let active = false;

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
		if (!element) {
			return false;
		}
		if (element == window) {
			return document.body.clientHeight > window.innerHeight;
		} else if (!(element instanceof Element)) {
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
		for (let parent = element; parent && parent != document.body; parent = parent.parentElement) {
			if (canScroll(parent)) {
				return parent;
			}
		}

		if (canScroll(window)) {
			return window;
		}

		return defaultTarget;
	}

	/**
	 * @param {KeyboardEvent} e 
	 */
	function specialKeys(e) {
		keyDown["control"] = e.ctrlKey;
		keyDown["shift"] = e.shiftKey;
		keyDown["alt"] = e.altKey;
		keyDown["meta"] = e.metaKey;
	}

	document.addEventListener("keydown", e => {
		if (!e.key) { // apparently this is a thing...
			return;
		}
		specialKeys(e);
		const key = e.key.toLowerCase();
		if (keyboardUsed() || !(key in keyDown)) {
			return;
		}
		keyDown[key] = true;
		if (key in map) {
			e.preventDefault();
			if (!active) {
				requestAnimationFrame(moveStuff);
				active = true;
			}
		}
	});

	document.addEventListener("keyup", e => {
		if (!e.key) { // apparently this is a thing...
			return;
		}
		specialKeys(e);
		const key = e.key.toLowerCase();
		if (!(key in keyDown)) {
			return;
		}
		keyDown[key] = false;
		if (!keyboardUsed() && key in map) {
			e.preventDefault();
		}
	});

	const moveStuff = function () {
		active = false;

		if (keyboardUsed()) {
			return;
		}

		for (const key in map) {
			if (keyDown[key]) {
				active = true;
			}
		}
		if (active) {
			requestAnimationFrame(moveStuff);
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

	console.log("Reader Mode " + chrome.runtime.getManifest().version + " enabled");

	const script = document.createElement("script");
	script.type = "text/javascript";
	script.id = "BlockBlockAdBlockScript";
	script.innerText = `
		{
			let count = 0;
			let id = setInterval(check, 500);
			function check() {
				for (s in window) {
					if (s.length == 10 && window[s] && typeof window[s] == "object" && typeof window[s]["clear"] == "function") {
						console.log("Cleared:", s, window[s]);
						window[s].clear();
						stopScript();
						return;
					}
				}
				if (++count > 100) {
					stopScript();
				}
			}
			function stopScript() {
				clearInterval(id);
				document.getElementById("${script.id}").remove();
			}
		}
	`.replace(/\r?\n\s*/g, "");
	document.body.appendChild(script);
});
