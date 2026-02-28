// ===============================
// CONFIGURATION
// ===============================
const toxicKeywords = ["hate", "stupid", "idiot", "ugly", "useless", "trash", "bad"];
const positiveKeywords = ["congratulations", "proud", "amazing", "strong", "support", "inspiring", "queen"];

// ===============================
// TYPING MONITOR (REAL-TIME POPUP)
// ===============================
function showTypingWarning(word) {
  let existing = document.getElementById("herdefend-typing-warning");
  if (existing) return;

  const warning = document.createElement("div");
  warning.id = "herdefend-typing-warning";
  warning.innerHTML = `⚠️ The word <b>"${word}"</b> might be hurtful. Consider rephrasing to be kind!`;

  warning.style = `
    position: fixed; bottom: 30px; right: 30px; 
    background: #ffcc00; color: #000; padding: 15px; 
    border-radius: 12px; z-index: 2147483647; font-weight: bold;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5); border: 2px solid #000;
    transition: opacity 0.5s ease; font-family: sans-serif;
  `;

  document.body.appendChild(warning);

  setTimeout(() => {
    warning.style.opacity = "0";
    setTimeout(() => warning.remove(), 500);
  }, 4000);
}

document.addEventListener("input", (e) => {
  const target = e.target;
  // YouTube uses contenteditable divs for comments
  if (target.id === "contenteditable-root" || target.tagName === "TEXTAREA") {
    const text = (target.innerText || target.value).toLowerCase();
    const foundWord = toxicKeywords.find(word => text.includes(word));
    if (foundWord) showTypingWarning(foundWord);
  }
});

// ===============================
// PAGE ANALYSIS & FILTERING
// ===============================
function processYouTubeComments() {
  const comments = document.querySelectorAll("ytd-comment-thread-renderer #content-text");
  let toxicCount = 0;

  comments.forEach(comment => {
    const text = comment.innerText.toLowerCase();
    const isToxic = toxicKeywords.some(word => text.includes(word));
    const isPositive = containsKeyword(text, positiveKeywords);


    if (isToxic) {
      comment.style.filter = "blur(6px)";
      comment.style.opacity = "0.4";
      toxicCount++;
    }
    else if (isPositive) {
        comment.style.color = "#006400";
        comment.style.fontWeight = "bold";
        comment.style.filter = "none";
        comment.style.opacity = "1";
      }

      // 🙂 Neutral → Normal
      else {
        comment.style.filter = "none";
        comment.style.opacity = "1";
        comment.style.fontWeight = "normal";
        comment.style.color = "";
      }
  });
  return toxicCount;
}

// Message listener for popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getData") {
    const tCount = processYouTubeComments();
    const safetyScore = Math.max(100 - (tCount * 10), 0);
    sendResponse({ score: safetyScore, toxicCount: tCount });
  }
  return true;
});

// Auto-run if Shield is ON
chrome.storage.local.get(["shield"], (data) => {
  if (data.shield && window.location.hostname.includes("youtube.com")) {
    const observer = new MutationObserver(processYouTubeComments);
    observer.observe(document.body, { childList: true, subtree: true });
  }
});