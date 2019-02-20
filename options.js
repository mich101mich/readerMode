// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const form = document.getElementById("editForm");
const input = document.getElementById("blacklist");

chrome.storage.sync.get("blacklist", ({ blacklist }) => {
	input.innerText = blacklist;
	form.addEventListener("submit", e => {
		chrome.storage.sync.set({ blacklist: input.value });
		e.preventDefault();
		return false;
	});
});
