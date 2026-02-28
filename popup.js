document.addEventListener("DOMContentLoaded", () => {
  const shieldBtn = document.getElementById("shieldBtn");
  const safeBtn = document.getElementById("safeBtn");
  const suspiciousBtn = document.getElementById("suspiciousBtn");
  const unsafeBtn = document.getElementById("unsafeBtn");

  // Load Reputation Shield State
  chrome.storage.local.get(["shield"], (data) => {
    if (shieldBtn) shieldBtn.checked = !!data.shield;
  });

  // Toggle Shield
  shieldBtn?.addEventListener("change", (e) => {
    chrome.storage.local.set({ shield: e.target.checked }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.reload(tabs[0].id);
      });
    });
  });

  // Get Tab Data & Check Vote Status
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;

    const urlObj = new URL(tabs[0].url);
    const host = urlObj.hostname;

    // 1. Send Message to content.js
    chrome.tabs.sendMessage(tabs[0].id, { action: "getData" }, (res) => {
      const scoreEl = document.getElementById("score");
      const statusEl = document.getElementById("status");

      if (chrome.runtime.lastError || !res) {
        if (scoreEl) scoreEl.innerText = "No data";
        if (statusEl) statusEl.innerText = "Visit a website to scan";
      } else {
        if (scoreEl) scoreEl.innerText = `Safety: ${res.score}%`;
        if (statusEl) statusEl.innerText = res.toxicCount > 0 ? "Toxic content found" : "Page looks clean";
      }
    });

    // 2. Check if user already voted on this host
    checkVoteStatus(host);
  });

  // Rating Event Listeners
  safeBtn?.addEventListener("click", () => rateSite("safe"));
  suspiciousBtn?.addEventListener("click", () => rateSite("suspicious"));
  unsafeBtn?.addEventListener("click", () => rateSite("unsafe"));
});

function checkVoteStatus(host) {
  chrome.storage.local.get(["votedHosts", "ratings"], (data) => {
    const votedHosts = data.votedHosts || {};
    const ratings = data.ratings || {};

    // If already voted, disable buttons
    if (votedHosts[host]) {
      const indicator = document.getElementById("votedIndicator");
      if (indicator) indicator.style.display = "block";

      document.querySelectorAll(".btn").forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
      });
    }

    // Update community stats display
    const r = ratings[host] || { safe: 0, suspicious: 0, unsafe: 0 };
    const scoreDisplay = document.getElementById("communityScore");
    if (scoreDisplay) {
      scoreDisplay.innerText = `Safe: ${r.safe} | Suspicious: ${r.suspicious} | Unsafe: ${r.unsafe}`;
    }
  });
}

function rateSite(type) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    const host = new URL(tabs[0].url).hostname;

    chrome.storage.local.get(["votedHosts", "ratings"], (data) => {
      let votedHosts = data.votedHosts || {};
      let ratings = data.ratings || {};

      if (votedHosts[host]) return; // Stop if already voted

      // Mark as voted and increment count
      votedHosts[host] = true;
      if (!ratings[host]) ratings[host] = { safe: 0, suspicious: 0, unsafe: 0 };
      ratings[host][type]++;

      chrome.storage.local.set({ votedHosts, ratings }, () => {
        checkVoteStatus(host);
      });
    });
  });
}