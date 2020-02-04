
/**@type {HTMLButtonElement} */
const button = document.getElementById('toggle');
/**@type {HTMLInputElement} */
const inputURL = document.getElementById('url');
/**@type {HTMLDivElement} */
const ruleText = document.getElementById('ruleText');
/**@type {HTMLFormElement} */
const speedForm = document.getElementById('speedForm');
/**@type {HTMLInputElement} */
const speed = document.getElementById('speed');

/**@type {HTMLFormElement} */
const downloadForm = document.getElementById('downloadForm');
/**@type {HTMLInputElement} */
const downloads = document.getElementById('downloads');
/**@type {HTMLInputElement} */
const pathInput = document.getElementById('pathInput');

chrome.storage.sync.get('blacklist', (/** @type { { blacklist: string } } */ { blacklist }) => {
	chrome.tabs.query({ active: true, currentWindow: true }, function ([tab]) {
		const match = /\/\/((.*?\.)+.+?\/)/.exec(tab.url);
		if (!match || match.length < 2 || !match[1]) {
			window.close();
			return;
		}
		const url = match[1];

		const list = blacklist.split("\n");
		for (const item of list) {
			if (item && tab.url.includes(item)) {
				inputURL.value = item;
				inputURL.readOnly = true;
				ruleText.innerHTML = "Existing Rule: ";
				button.innerText = "Remove applying rule from blacklist"
				button.addEventListener("click", () => {
					let updated = list.filter(v => v !== item).join("\n").trim();
					update(tab.id, updated);
				});

				speed.disabled = true;

				return;
			}
		}

		inputURL.value = url;
		ruleText.innerHTML = "New Rule: ";
		button.innerText = "Blacklist this site"
		button.addEventListener("click", () => {
			list.push(inputURL.value);
			let updated = list.join("\n").trim();
			update(tab.id, updated);
		});

		chrome.tabs.executeScript(
			tab.id,
			{ code: `window.readerModeScrollSpeed` },
			([readerModeScrollSpeed]) => {
				speed.value = readerModeScrollSpeed;
				speedForm.addEventListener("submit", e => {

					const val = parseInt(speed.value);
					if (val && !isNaN(val) && val > 0) {
						chrome.tabs.executeScript(
							tab.id,
							{ code: `window.readerModeScrollSpeed = ${val};` }
						);
						window.close();
					}

					e.preventDefault();
				})
			}
		);
	});
});

let path = "dl";
let dlCount = 0;
chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
	if (dlCount == 0) {
		return;
	}
	dlCount--;
	suggest({filename: path + "/" + downloadItem.filename});
});

downloadForm.addEventListener("submit", e => {

	path = pathInput.value;

	const urls = downloads.value.trim().split("\n");
	for (const url of urls) {
		if (!url) {
			continue;
		}
		console.log("downloading", url);
		chrome.downloads.download({ url });
		dlCount++;
	}

	e.preventDefault();
})

function update(id, updated) {
	chrome.storage.sync.set({ blacklist: updated }, () => {
		chrome.tabs.executeScript(
			id,
			{ code: 'window.location.reload();' }
		);
		window.close();
	});
}
