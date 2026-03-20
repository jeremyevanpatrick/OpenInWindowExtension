const checkbox = document.getElementById("alwaysTargetSecond");

chrome.storage.sync.get("alwaysTargetSecond", (result) => {
  checkbox.checked = result.alwaysTargetSecond === true;
});

checkbox.addEventListener("change", () => {
  chrome.storage.sync.set({ alwaysTargetSecond: checkbox.checked });
});