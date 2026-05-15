(() => {
  const ACTION_TEST_IDS = [
    "retweet",
    "unretweet",
    "like",
    "unlike",
    "bookmark",
    "removeBookmark",
    "view",
    "analytics"
  ];

  const ACTION_LABEL_WORDS = [
    "repost",
    "reposts",
    "quote",
    "quotes",
    "like",
    "likes",
    "bookmark",
    "bookmarks",
    "view",
    "views"
  ];

  const COUNT_TEXT_PATTERN =
    /^\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[KMB]?\s*$/i;
  const ACTION_SELECTOR = ACTION_TEST_IDS
    .map((testId) => `[data-testid="${testId}"]`)
    .join(",");
  const COMMENT_ACTION_SELECTOR = '[data-testid="reply"]';
  const FOLLOWER_LINK_SELECTOR =
    'a[href$="/followers"], a[href*="/followers?"]';

  const hasActionLabel = (element) => {
    const label = element.getAttribute("aria-label") || "";
    const normalized = label.toLowerCase();
    return ACTION_LABEL_WORDS.some((word) => normalized.includes(word));
  };

  const isCountText = (text) => COUNT_TEXT_PATTERN.test(text);

  const maskVisibleCountNode = (element) => {
    if (element.classList.contains("x-count-masker-count")) return;
    element.classList.add("x-count-masker-count");
    element.setAttribute("aria-hidden", "true");
  };

  const unmaskVisibleCountNode = (element) => {
    element.classList.remove("x-count-masker-count");
    if (element.getAttribute("aria-hidden") === "true") {
      element.removeAttribute("aria-hidden");
    }
  };

  const sanitizeActionLabel = (element) => {
    const label = element.getAttribute("aria-label");
    if (!label || element.dataset.xCountMaskerLastLabel === label) return;

    element.dataset.xCountMaskerLastLabel = label;

    const sanitized = label
      .replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*[KMB]?\s+(Replies|Reply|Reposts|Repost|Quotes|Quote|Likes|Like|Bookmarks|Bookmark|Views|View)\b/gi, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (sanitized && sanitized !== label) {
      element.setAttribute("aria-label", sanitized);
    }
  };

  const maskActionCounts = (actionElement) => {
    if (!actionElement) return;
    sanitizeActionLabel(actionElement);

    const candidates = actionElement.querySelectorAll(
      'span, div[dir="auto"], [data-testid="app-text-transition-container"]'
    );

    for (const candidate of candidates) {
      const text = candidate.textContent || "";
      if (isCountText(text)) {
        maskVisibleCountNode(candidate);
      }
    }
  };

  const unmaskCommentCounts = (actionElement) => {
    const candidates = actionElement.querySelectorAll(
      'span, div[dir="auto"], [data-testid="app-text-transition-container"]'
    );

    for (const candidate of candidates) {
      if (candidate.classList.contains("x-count-masker-count")) {
        unmaskVisibleCountNode(candidate);
      }
    }
  };

  const findFollowerCountNode = (linkElement) => {
    const candidates = linkElement.querySelectorAll(
      'span, div[dir="auto"], [data-testid="app-text-transition-container"]'
    );

    for (const candidate of candidates) {
      const text = candidate.textContent || "";
      if (isCountText(text)) {
        return candidate;
      }
    }

    return null;
  };

  const maskFollowerCount = (linkElement) => {
    const countNode = findFollowerCountNode(linkElement);
    if (!countNode) return;

    if (!countNode.classList.contains("x-count-masker-follower-count")) {
      countNode.classList.add("x-count-masker-follower-count");
      countNode.title = "Double-click to show follower count";
    }
  };

  const scan = (root = document) => {
    for (const actionElement of root.querySelectorAll(ACTION_SELECTOR)) {
      maskActionCounts(actionElement);
    }

    for (const commentAction of root.querySelectorAll(COMMENT_ACTION_SELECTOR)) {
      unmaskCommentCounts(commentAction);
    }

    for (const followerLink of root.querySelectorAll(FOLLOWER_LINK_SELECTOR)) {
      maskFollowerCount(followerLink);
    }

    for (const element of root.querySelectorAll("[aria-label]")) {
      if (hasActionLabel(element)) {
        sanitizeActionLabel(element);
      }
    }
  };

  let scheduled = false;

  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  };

  scan();

  document.addEventListener(
    "click",
    (event) => {
      if (!event.target.closest(".x-count-masker-follower-count")) return;

      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    "dblclick",
    (event) => {
      const countNode = event.target.closest(".x-count-masker-follower-count");
      if (!countNode) return;

      countNode.classList.toggle("x-count-masker-follower-count--revealed");
      countNode.title = countNode.classList.contains(
        "x-count-masker-follower-count--revealed"
      )
        ? "Double-click to hide follower count"
        : "Double-click to show follower count";

      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
