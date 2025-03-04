/**
 * A mapping of keys to their respective scroll directions
 *
 * @type { { [key: string]: number[] } }
 */
const directionalKeys = {
    "w": [0, -1], "arrowup": [0, -1],
    "a": [-1, 0], "arrowleft": [-1, 0],
    "s": [0, 1], "arrowdown": [0, 1],
    "d": [1, 0], "arrowright": [1, 0],
};

/**
 * A mapping of keys to their current state
 *
 * @type { { [key: string]: boolean } }
 */
let keyDown = {
    "control": false,
    "shift": false,
    "alt": false,
    "meta": false,
};
for (const key in directionalKeys) {
    keyDown[key] = false;
}

/**
 * Is the requestAnimationFrame loop currently running
 */
let isRunning = false;

/**
 * The most recent target that was scrolled
 *
 * @type { Element | Window }
 */
let lastTarget = window;

// Add the scroll speed as a changeable parameter
window.readerModeScrollSpeed = 20;

/**
 * Checks if the keyboard is currently being used for input
 *
 * @returns {boolean} true if the keyboard is being used for input
 */
function keyboardBusy() {
    const elem = document.activeElement;

    return keyDown["control"] || keyDown["alt"] || keyDown["meta"]
        || (elem instanceof HTMLElement && elem.isContentEditable)
        || elem instanceof HTMLInputElement
        || elem instanceof HTMLTextAreaElement
        || elem instanceof HTMLSelectElement
}

/**
 * Checks if the element can be scrolled
 *
 * @param {Element | Window | null} element The element to check
 * @returns {boolean} true if the element can be scrolled
 */
function canScroll(element) {
    if (element instanceof Window) {
        return document.body.clientHeight > window.innerHeight;
    } else if (element instanceof Element) {
        let style = getComputedStyle(element);
        return /(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)
            && element.scrollHeight != element.clientHeight;
    } else { // null or unexpected type
        return false;
    }
}

/**
 * Finds a scrollable element within the provided element and its parents, or the window/lastTarget if none is found
 *
 * @param {Element | Window | null} element The element to start the search from
 * @returns { Element | Window } The scrollable element
 */
function getScrollParent(element) {

    if (!canScroll(lastTarget)) {
        // lastTarget is no longer a valid scroll target
        lastTarget = window;
    }

    if (!element || !(element instanceof Element)) {
        // no element => no parents to check
        return lastTarget;
    }

    while (element && element != document.body) {
        if (canScroll(element)) {
            return element;
        }
        if (getComputedStyle(element).position === "fixed") {
            // No use scrolling the parent of a fixed element
            return lastTarget;
        }
        element = element.parentElement;
    }

    return canScroll(window) ? window : lastTarget;
}

/**
 * Updates the state of the special keys from the event
 *
 * @param {KeyboardEvent} e The event to update from
 */
function updateSpecialKeys(e) {
    keyDown["control"] = e.ctrlKey;
    keyDown["shift"] = e.shiftKey;
    keyDown["alt"] = e.altKey;
    keyDown["meta"] = e.metaKey;
}

document.addEventListener("keydown", e => {
    if (!e.key) { // apparently this is a thing...
        return;
    }

    updateSpecialKeys(e);

    const key = e.key.toLowerCase();
    if (keyboardBusy() || !(key in keyDown)) {
        return;
    }
    keyDown[key] = true;

    if (key in directionalKeys) {
        e.preventDefault();
        if (!isRunning) {
            requestAnimationFrame(scrollImpl);
            isRunning = true;
        }
    }
});

document.addEventListener("keyup", e => {
    if (!e.key) { // apparently this is a thing...
        return;
    }
    updateSpecialKeys(e);

    const key = e.key.toLowerCase();
    if (!(key in keyDown)) {
        return;
    }
    keyDown[key] = false;

    if (!keyboardBusy() && key in directionalKeys) {
        e.preventDefault();
    }
});

function scrollImpl() {
    if (keyboardBusy()) {
        return;
    }

    let hasDirectionalKey = false;
    for (const key in directionalKeys) {
        if (keyDown[key]) {
            hasDirectionalKey = true;
        }
    }
    if (!hasDirectionalKey) {
        isRunning = false;
        return;
    }

    requestAnimationFrame(scrollImpl);

    let scrollX = 0;
    let scrollY = 0;
    for (let k in directionalKeys) {
        if (keyDown[k]) {
            // sum of all keys, so that diagonal scrolling is possible and opposite keys cancel each other out
            scrollX += directionalKeys[k][0];
            scrollY += directionalKeys[k][1];
        }
    }

    if (scrollX == 0 && scrollY == 0) {
        return;
    }

    let targets = document.querySelectorAll(":hover");
    let target = getScrollParent(targets[targets.length - 1]);
    lastTarget = target;

    let factor = keyDown["shift"] ? 3 : 1;
    target.scrollBy(
        scrollX * window.readerModeScrollSpeed * factor,
        scrollY * window.readerModeScrollSpeed * factor
    );
}

console.log("Reader Mode " + chrome.runtime.getManifest().version + " enabled");
