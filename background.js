const MENU_ITEM_PREFIX = "open_in_window_";

async function rebuildMenus() {
  await chrome.contextMenus.removeAll();

  const windows = await chrome.windows.getAll({ populate: true });

  // Only include normal browser windows (exclude PWAs, devtools, etc.)
  const normalWindows = windows.filter(w => w.type === "normal");

  // Only add items when more than one normal window is open
  if (normalWindows.length <= 1) return;

  for (const win of normalWindows) {
    const activeTab = win.tabs ? win.tabs.find(t => t.active) : null;
    const rawTitle = (activeTab && activeTab.title) ? activeTab.title : `Window ${win.id}`;
    const truncated = rawTitle.length > 14 ? rawTitle.slice(0, 14) + "\u2026" : rawTitle;

    chrome.contextMenus.create({
      id: `${MENU_ITEM_PREFIX}${win.id}`,
      title: `Open link in "${truncated}" window`,
      contexts: ["link"],
    });
  }
}

chrome.contextMenus.onClicked.addListener((info) => {
  const id = String(info.menuItemId);
  if (!id.startsWith(MENU_ITEM_PREFIX)) return;

  const targetWindowId = parseInt(id.replace(MENU_ITEM_PREFIX, ""), 10);
  chrome.tabs.create({ url: info.linkUrl, windowId: targetWindowId }, () => {
    chrome.windows.update(targetWindowId, { focused: true });
  });
});

chrome.windows.onCreated.addListener(rebuildMenus);
chrome.windows.onRemoved.addListener(rebuildMenus);
chrome.tabs.onActivated.addListener(rebuildMenus);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.title) rebuildMenus();
});

rebuildMenus();
