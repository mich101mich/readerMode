chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.sync.get("blacklist", data => {
		if (!data || !data.blacklist) {
			chrome.storage.sync.set({ blacklist: "" });
		}
	});
});