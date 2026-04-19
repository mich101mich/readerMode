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
 * The current scroll target, latched on keydown and cleared on keyup
 *
 * @type { Element | Window | null }
 */
let currentScrollTarget = null;

// Add the scroll speed as a changeable parameter
window.readerModeScrollSpeed = 20;

/**
 * Checks if the keyboard is currently being used for input
 *
 * @returns {boolean} true if the keyboard is being used for input
 */
function keyboardBusy() {
    // Modifier keys held = don't intercept
    if (keyDown["control"] || keyDown["alt"] || keyDown["meta"]) {
        return true;
    }

    // designMode (entire document editable)
    if (document.designMode === "on") {
        return true;
    }

    /**
     * Recursively finds the true active element, piercing through Shadow DOMs.
     */
    function getDeepActiveElement(root = document) {
        const active = root.activeElement;
        if (active && active.shadowRoot) {
            return getDeepActiveElement(active.shadowRoot);
        }
        return active;
    }

    const elem = getDeepActiveElement();

    // If nothing is focused, or the body is focused, we are safe to use WASD
    if (!elem || elem === document.body) {
        return false;
    }

    // Standard form elements
    if (elem instanceof HTMLTextAreaElement
        || elem instanceof HTMLSelectElement) {
        return true;
    }
    if (elem instanceof HTMLInputElement) {
        // Check for types that involve text input
        // From <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#input_types>
        // button           A push button with no default behavior displaying the value of the value attribute, empty by default.
        // checkbox         A check box allowing single values to be selected/deselected.
        // color            A control for specifying a color; opening a color picker when active in supporting browsers.
        // date             A control for entering a date (year, month, and day, with no time). Opens a date picker or numeric wheels for year, month, day when active in supporting browsers.
        // datetime-local   A control for entering a date and time, with no time zone. Opens a date picker or numeric wheels for date- and time-components when active in supporting browsers.
        // email            A field for editing an email address. Looks like a text input, but has validation parameters and relevant keyboard in supporting browsers and devices with dynamic keyboards.
        // file             A control that lets the user select a file. Use the accept attribute to define the types of files that the control can select.
        // hidden           A control that is not displayed but whose value is submitted to the server. There is an example in the next column, but it's hidden!
        // image            A graphical submit button. Displays an image defined by the src attribute. The alt attribute displays if the image src is missing.
        // month            A control for entering a month and year, with no time zone.
        // number           A control for entering a number. Displays a spinner and adds default validation. Displays a numeric keypad in some devices with dynamic keypads.
        // password         A single-line text field whose value is obscured. Will alert user if site is not secure.
        // radio            A radio button, allowing a single value to be selected out of multiple choices with the same name value.
        // range            A control for entering a number whose exact value is not important. Displays as a range widget defaulting to the middle value. Used in conjunction min and max to define the range of acceptable values.
        // reset            A button that resets the contents of the form to default values. Not recommended.
        // search           A single-line text field for entering search strings. Line-breaks are automatically removed from the input value. May include a delete icon in supporting browsers that can be used to clear the field. Displays a search icon instead of enter key on some devices with dynamic keypads.
        // submit           A button that submits the form.
        // tel              A control for entering a telephone number. Displays a telephone keypad in some devices with dynamic keypads.
        // text             The default value. A single-line text field. Line-breaks are automatically removed from the input value.
        // time             A control for entering a time value with no time zone.
        // url              A field for entering a URL. Looks like a text input, but has validation parameters and relevant keyboard in supporting browsers and devices with dynamic keyboards.
        // week             A control for entering a date consisting of a week-year number and a week number with no time zone.
        // datetime         A control for entering a date and time (hour, minute, second, and fraction of a second) based on UTC time zone.
        const textInputTypes = ["date", "datetime-local", "email", "month", "number", "password", "search", "tel", "text", "time", "url", "week", "datetime"];
        if (textInputTypes.includes(elem.type)) {
            return true;
        }
    }

    // Contenteditable
    if (elem instanceof HTMLElement && elem.isContentEditable) {
        return true;
    }

    // ARIA roles for custom inputs
    if (elem instanceof Element) {
        const role = elem.getAttribute("role");
        if (role === "textbox" || role === "searchbox" || role === "combobox" || role === "spinbutton") {
            return true;
        }
    }

    return false;
}

/**
 * Checks if the element can be scrolled in the given direction
 *
 * @param {Element | Window | null} element The element to check
 * @param {number} dx The horizontal scroll direction (-1, 0, or 1)
 * @param {number} dy The vertical scroll direction (-1, 0, or 1)
 * @returns {boolean} true if the element can be scrolled in the given direction
 */
function canScrollInDirection(element, dx, dy) {
    let scrollLeft, scrollTop, scrollRight, scrollBottom;

    if (element instanceof Window) {
        const docEl = document.documentElement;
        scrollLeft = window.scrollX;
        scrollTop = window.scrollY;
        scrollRight = docEl.scrollWidth - window.innerWidth - window.scrollX;
        scrollBottom = docEl.scrollHeight - window.innerHeight - window.scrollY;
    } else if (element instanceof Element) {
        // Check if element has scrollable overflow style
        const style = getComputedStyle(element);
        if (!/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
            return false;
        }

        scrollLeft = element.scrollLeft;
        scrollTop = element.scrollTop;
        scrollRight = element.scrollWidth - element.clientWidth - element.scrollLeft;
        scrollBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
    } else {
        return false;
    }

    const canScrollUp = dy < 0 && scrollTop > 0;
    const canScrollDown = dy > 0 && scrollBottom > 0;
    const canScrollLeft = dx < 0 && scrollLeft > 0;
    const canScrollRight = dx > 0 && scrollRight > 0;

    return canScrollUp || canScrollDown || canScrollLeft || canScrollRight;
}

/**
 * Finds a scrollable element within the provided element and its parents that can scroll in the given direction
 *
 * @param {Element | null} element The element to start the search from
 * @param {number} dx The horizontal scroll direction (-1, 0, or 1)
 * @param {number} dy The vertical scroll direction (-1, 0, or 1)
 * @returns { Element | Window | null } The scrollable element, or null if none found
 */
function getScrollParent(element, dx, dy) {
    if (!element || !(element instanceof Element)) {
        // no element => check window directly
        return canScrollInDirection(window, dx, dy) ? window : null;
    }

    while (element && element != document.body) {
        if (canScrollInDirection(element, dx, dy)) {
            return element;
        }
        if (getComputedStyle(element).position === "fixed") {
            // Fixed elements don't scroll with parent, check window
            return canScrollInDirection(window, dx, dy) ? window : null;
        }
        element = element.parentElement;
    }

    return canScrollInDirection(window, dx, dy) ? window : null;
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

window.addEventListener("keydown", e => {
    if (!e.key) { // apparently this is a thing...
        return;
    }

    updateSpecialKeys(e);

    const key = e.key.toLowerCase();
    if (keyboardBusy() || !(key in keyDown)) {
        return;
    }

    const wasAlreadyDown = keyDown[key];
    keyDown[key] = true;

    if (key in directionalKeys) {
        e.preventDefault();

        // Only query for a new target if this is a fresh press (not a repeat)
        // and we don't have a target yet
        if (!wasAlreadyDown && !currentScrollTarget) {
            // Calculate the scroll direction from all currently pressed keys
            let dx = 0;
            let dy = 0;
            for (const k in directionalKeys) {
                if (keyDown[k]) {
                    dx += directionalKeys[k][0];
                    dy += directionalKeys[k][1];
                }
            }

            // Find the hovered element and get a scrollable parent
            const targets = document.querySelectorAll(":hover");
            const hoveredElement = targets[targets.length - 1] || null;
            currentScrollTarget = getScrollParent(hoveredElement, dx, dy);
        }

        if (currentScrollTarget && !isRunning) {
            requestAnimationFrame(scrollImpl);
            isRunning = true;
        }
    }
});

window.addEventListener("keyup", e => {
    if (!e.key) { // apparently this is a thing...
        return;
    }
    updateSpecialKeys(e);

    const key = e.key.toLowerCase();
    if (!(key in keyDown)) {
        return;
    }
    keyDown[key] = false;

    if (key in directionalKeys) {
        e.preventDefault();

        // Check if all directional keys are released
        let hasDirectionalKey = false;
        for (const k in directionalKeys) {
            if (keyDown[k]) {
                hasDirectionalKey = true;
                break;
            }
        }

        // Clear target when all directional keys are released
        if (!hasDirectionalKey) {
            currentScrollTarget = null;
        }
    }
});

function scrollImpl() {
    // Stop if keyboard is busy or no target
    if (keyboardBusy() || !currentScrollTarget) {
        isRunning = false;
        return;
    }

    // Check if target was removed from DOM
    if (!(currentScrollTarget instanceof Window) && !document.contains(currentScrollTarget)) {
        currentScrollTarget = null;
        isRunning = false;
        return;
    }

    // Check if any directional keys are still held
    let hasDirectionalKey = false;
    for (const key in directionalKeys) {
        if (keyDown[key]) {
            hasDirectionalKey = true;
            break;
        }
    }
    if (!hasDirectionalKey) {
        isRunning = false;
        return;
    }

    requestAnimationFrame(scrollImpl);

    // Calculate scroll direction from all held keys
    let scrollX = 0;
    let scrollY = 0;
    for (const k in directionalKeys) {
        if (keyDown[k]) {
            // sum of all keys, so that diagonal scrolling is possible and opposite keys cancel each other out
            scrollX += directionalKeys[k][0];
            scrollY += directionalKeys[k][1];
        }
    }

    if (scrollX === 0 && scrollY === 0) {
        return;
    }

    const factor = keyDown["shift"] ? 3 : 1;
    currentScrollTarget.scrollBy(
        scrollX * window.readerModeScrollSpeed * factor,
        scrollY * window.readerModeScrollSpeed * factor
    );
}

console.log("Reader Mode " + chrome.runtime.getManifest().version + " enabled");
