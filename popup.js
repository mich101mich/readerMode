// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

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
			{ code: `window.moveSpeed` },
			(stuff) => {
				console.log(stuff);
				speed.value = stuff[0];
				speedForm.addEventListener("submit", e => {

					const val = parseInt(speed.value);
					if (val && !isNaN(val) && val > 0) {
						chrome.tabs.executeScript(
							tab.id,
							{ code: `window.moveSpeed = ${val};` }
						);
						window.close();
					}

					e.preventDefault();
				})
			}
		);
	});
});

function update(id, updated) {
	chrome.storage.sync.set({ blacklist: updated }, () => {
		chrome.tabs.executeScript(
			id,
			{ code: 'window.location.reload();' }
		);
		window.close();
	});
}
