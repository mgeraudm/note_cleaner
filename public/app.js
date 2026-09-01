const STORAGE_KEY = "note-history";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const readHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Unable to read saved note history:", error);
    return [];
  }
};

const writeHistory = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const renderHistory = () => {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  const items = readHistory();

  if (!items.length) {
    historyList.innerHTML = '<div class="history-empty">No saved notes yet.</div>';
    return;
  }

  historyList.innerHTML = items
    .map(
      (entry, index) => `
        <button type="button" class="history-item" data-index="${index}" aria-label="Open saved note ${index + 1}">
          <strong>${escapeHtml(entry.title || `Note ${index + 1}`)}</strong>
          <small>${escapeHtml(new Date(entry.savedAt).toLocaleString())}</small>
        </button>
      `
    )
    .join("");

  historyList.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => {
      const itemIndex = Number(button.dataset.index);
      openHistoryItem(items[itemIndex]);
    });
  });
};

const openHistoryItem = (entry) => {
  const modal = document.getElementById("historyModal");
  const original = document.getElementById("modalOriginalNote");
  const transformed = document.getElementById("modalTransformedNote");

  if (!modal || !original || !transformed) return;

  original.innerHTML = escapeHtml(entry.originalNote || "");
  transformed.innerHTML = escapeHtml(entry.transformedNote || "");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
};

const saveCurrentResult = () => {
  const resultText = document.getElementById("cleanedNotesText");
  const summaryText = document.getElementById("summaryText");
  const notesInput = document.getElementById("notesInput");

  if (!resultText || !notesInput) return;

  const original = notesInput.value.trim();
  const transformed = [resultText.textContent, summaryText ? summaryText.textContent : ""]
    .filter(Boolean)
    .join("\n\n");

  if (!original || !transformed) return;

  const history = readHistory();
  const next = [
    {
      id: Date.now(),
      title: `Note ${history.length + 1}`,
      savedAt: new Date().toISOString(),
      originalNote: original,
      transformedNote: transformed,
    },
    ...history,
  ].slice(0, 25);

  writeHistory(next);
  renderHistory();
};

const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("noteForm");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const closeModalBtn = document.getElementById("closeHistoryModal");
  const modal = document.getElementById("historyModal");

  renderHistory();

  if (form) {
    form.addEventListener("submit", () => {
      setTimeout(() => {
        saveCurrentResult();
      }, 150);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
      }
    });
  }
});
