const MENU_ITEM_PREFIX = "open_in_window_";
const windowOrder = [];

async function getAlwaysTargetSecond() {
  const result = await chrome.storage.sync.get("alwaysTargetSecond");
  return result.alwaysTargetSecond === true;
}

async function rebuildMenus() {
  await chrome.contextMenus.removeAll();
  const windows = await chrome.windows.getAll({ populate: true });
  const normalWindows = windows.filter(w => w.type === "normal");
  if (normalWindows.length <= 1) return;

  const alwaysTargetSecond = await getAlwaysTargetSecond();

  if (alwaysTargetSecond) {
    const targetWindowId = windowOrder[1];
    if (targetWindowId == null) return;
    const targetWindow = normalWindows.find(w => w.id === targetWindowId);
    if (!targetWindow) return;
    const activeTab = targetWindow.tabs?.find(t => t.active);
    const rawTitle = activeTab?.title || `Window ${targetWindowId}`;
    const truncated = rawTitle.length > 14 ? rawTitle.slice(0, 14) + "\u2026" : rawTitle;
    chrome.contextMenus.create({
      id: `${MENU_ITEM_PREFIX}${targetWindowId}`,
      title: `Open link in "${truncated}" window`,
      contexts: ["link"],
    });
  } else {
    for (const win of normalWindows) {
      const activeTab = win.tabs?.find(t => t.active);
      const rawTitle = activeTab?.title || `Window ${win.id}`;
      const truncated = rawTitle.length > 14 ? rawTitle.slice(0, 14) + "\u2026" : rawTitle;
      chrome.contextMenus.create({
        id: `${MENU_ITEM_PREFIX}${win.id}`,
        title: `Open link in "${truncated}" window`,
        contexts: ["link"],
      });
    }
  }
}

async function initWindowOrder() {
  const windows = await chrome.windows.getAll({ populate: false });
  const normal = windows.filter(w => w.type === "normal").sort((a, b) => a.id - b.id);
  windowOrder.push(...normal.map(w => w.id));
  rebuildMenus();
}

chrome.windows.onCreated.addListener((win) => {
  if (win.type !== "normal") return;
  windowOrder.push(win.id);
  rebuildMenus();
});

chrome.windows.onRemoved.addListener((winId) => {
  const idx = windowOrder.indexOf(winId);
  if (idx !== -1) windowOrder.splice(idx, 1);
  rebuildMenus();
});

chrome.tabs.onActivated.addListener(rebuildMenus);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.title) rebuildMenus();
});

chrome.contextMenus.onClicked.addListener((info) => {
  const id = String(info.menuItemId);
  if (!id.startsWith(MENU_ITEM_PREFIX)) return;
  const targetWindowId = parseInt(id.replace(MENU_ITEM_PREFIX, ""), 10);
  chrome.tabs.create({ url: info.linkUrl, windowId: targetWindowId }, () => {
    chrome.windows.update(targetWindowId, { focused: true });
  });
});

// Rebuild when the setting is changed
chrome.storage.onChanged.addListener((changes) => {
  if (changes.alwaysTargetSecond) rebuildMenus();
});

initWindowOrder();