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
    "impression",
    "impressions",
    "view",
    "views"
  ];

  const COUNT_VALUE_PATTERN =
    String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[KMB]?`;
  const COUNT_TEXT_PATTERN = new RegExp(
    String.raw`^\s*${COUNT_VALUE_PATTERN}\s*$`,
    "i"
  );
  const FOLLOWER_TEXT_PATTERN = new RegExp(
    String.raw`\b(${COUNT_VALUE_PATTERN})\s+(Followers?)\b`,
    "i"
  );
  const IMPRESSION_TEXT_PATTERN = new RegExp(
    String.raw`\b(${COUNT_VALUE_PATTERN})\s+(Impressions?)\b`,
    "i"
  );
  const IMPRESSION_LABEL_PATTERN = /^\s*Impressions?\s*$/i;
  const VIEW_METRIC_LABEL_PATTERN = /\b(Views?|Impressions?)\b/i;
  const ACTION_SELECTOR = ACTION_TEST_IDS
    .map((testId) => `[data-testid="${testId}"]`)
    .join(",");
  const VIEW_ACTION_SELECTOR = '[data-testid="view"], [data-testid="analytics"]';
  const COMMENT_ACTION_SELECTOR = '[data-testid="reply"]';
  const FOLLOWER_LINK_SELECTOR =
    'a[href*="/followers"], a[href*="/verified_followers"]';
  const METRIC_TEXT_SELECTOR =
    'span, div[dir="auto"], [data-testid="app-text-transition-container"]';
  const USER_TEXT_SELECTOR =
    '[data-testid="tweetText"], [data-testid="card.wrapper"]';

  const hasActionLabel = (element) => {
    const label = element.getAttribute("aria-label") || "";
    const normalized = label.toLowerCase();
    return ACTION_LABEL_WORDS.some((word) => normalized.includes(word));
  };

  const isCountText = (text) => COUNT_TEXT_PATTERN.test(text);

  const hasCountText = (element) => {
    for (const candidate of element.querySelectorAll(METRIC_TEXT_SELECTOR)) {
      if (isCountText(candidate.textContent || "")) return true;
    }

    return false;
  };

  const maskVisibleCountNode = (element) => {
    if (element.classList.contains("x-count-masker-count")) return;
    element.classList.add("x-count-masker-count");
    element.setAttribute("aria-hidden", "true");
  };

  const markFollowerCountNode = (element) => {
    if (element.classList.contains("x-count-masker-follower-count")) return;

    element.classList.add("x-count-masker-follower-count");
    element.title = "Double-click to show follower count";
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
      .replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*[KMB]?\s+(Replies|Reply|Reposts|Repost|Quotes|Quote|Likes|Like|Bookmarks|Bookmark|Impressions|Impression|Views|View)\b/gi, "$1")
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
      METRIC_TEXT_SELECTOR
    );

    for (const candidate of candidates) {
      const text = candidate.textContent || "";
      if (isCountText(text)) {
        maskVisibleCountNode(candidate);
      }
    }
  };

  const maskCountsInContainer = (container) => {
    if (!container || container.closest(USER_TEXT_SELECTOR)) return;

    const candidates = container.querySelectorAll(METRIC_TEXT_SELECTOR);
    for (const candidate of candidates) {
      const text = candidate.textContent || "";
      if (isCountText(text)) {
        maskVisibleCountNode(candidate);
      }
    }
  };

  const maskNearbyViewMetricCount = (element) => {
    let container = element;

    for (let depth = 0; container && depth < 5; depth++) {
      if (hasCountText(container)) {
        if (container.querySelector(COMMENT_ACTION_SELECTOR)) return;

        maskCountsInContainer(container);
        return;
      }

      container = container.parentElement;
    }
  };

  const unmaskCommentCounts = (actionElement) => {
    const candidates = actionElement.querySelectorAll(
      METRIC_TEXT_SELECTOR
    );

    for (const candidate of candidates) {
      if (candidate.classList.contains("x-count-masker-count")) {
        unmaskVisibleCountNode(candidate);
      }
    }
  };

  const findFollowerCountNode = (linkElement) => {
    const candidates = linkElement.querySelectorAll(
      METRIC_TEXT_SELECTOR
    );

    for (const candidate of candidates) {
      const text = candidate.textContent || "";
      if (isCountText(text)) {
        return candidate;
      }
    }

    return null;
  };

  const wrapFollowerCountText = (linkElement) => {
    const walker = document.createTreeWalker(
      linkElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (
            node.parentElement?.closest(".x-count-masker-follower-count")
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return FOLLOWER_TEXT_PATTERN.test(node.nodeValue || "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNode = walker.nextNode();
    if (!textNode || !textNode.parentNode) return null;

    const text = textNode.nodeValue || "";
    const match = text.match(FOLLOWER_TEXT_PATTERN);
    if (!match || typeof match.index !== "number") return null;

    const countText = match[1];
    const countStart = match.index + match[0].indexOf(countText);
    const countEnd = countStart + countText.length;
    const countElement = document.createElement("span");
    countElement.textContent = countText;
    markFollowerCountNode(countElement);

    const fragment = document.createDocumentFragment();
    fragment.append(text.slice(0, countStart));
    fragment.append(countElement);
    fragment.append(text.slice(countEnd));

    textNode.parentNode.replaceChild(fragment, textNode);
    return countElement;
  };

  const maskFollowerCount = (linkElement) => {
    const countNode = findFollowerCountNode(linkElement) ||
      wrapFollowerCountText(linkElement);
    if (!countNode) return;

    markFollowerCountNode(countNode);
  };

  const wrapMetricCountText = (root, pattern) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (
            node.parentElement?.closest(
              ".x-count-masker-count, .x-count-masker-follower-count"
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          if (node.parentElement?.closest(USER_TEXT_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }

          return pattern.test(node.nodeValue || "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const textNode of textNodes) {
      if (!textNode.parentNode) continue;

      const text = textNode.nodeValue || "";
      const match = text.match(pattern);
      if (!match || typeof match.index !== "number") continue;

      const countText = match[1];
      const countStart = match.index + match[0].indexOf(countText);
      const countEnd = countStart + countText.length;
      const countElement = document.createElement("span");
      countElement.textContent = countText;
      maskVisibleCountNode(countElement);

      const fragment = document.createDocumentFragment();
      fragment.append(text.slice(0, countStart));
      fragment.append(countElement);
      fragment.append(text.slice(countEnd));

      textNode.parentNode.replaceChild(fragment, textNode);
    }
  };

  const maskImpressionLabelledCounts = (root) => {
    for (const labelElement of root.querySelectorAll(METRIC_TEXT_SELECTOR)) {
      if (!IMPRESSION_LABEL_PATTERN.test(labelElement.textContent || "")) {
        continue;
      }

      for (const container of [
        labelElement.parentElement,
        labelElement.parentElement?.parentElement
      ]) {
        if (!container || container.closest(USER_TEXT_SELECTOR)) continue;

        const candidates = container.querySelectorAll(METRIC_TEXT_SELECTOR);
        for (const candidate of candidates) {
          if (candidate === labelElement) continue;

          const text = candidate.textContent || "";
          if (isCountText(text)) {
            maskVisibleCountNode(candidate);
          }
        }
      }
    }
  };

  const maskViewMetricCounts = (root) => {
    for (const viewAction of root.querySelectorAll(VIEW_ACTION_SELECTOR)) {
      maskActionCounts(viewAction);
      maskNearbyViewMetricCount(viewAction);
    }

    for (const labelledElement of root.querySelectorAll("[aria-label]")) {
      const label = labelledElement.getAttribute("aria-label") || "";
      if (!VIEW_METRIC_LABEL_PATTERN.test(label)) continue;

      sanitizeActionLabel(labelledElement);
      maskActionCounts(labelledElement);
      maskNearbyViewMetricCount(labelledElement);
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

    const scanRoot = root.body || root;
    wrapMetricCountText(scanRoot, IMPRESSION_TEXT_PATTERN);
    maskImpressionLabelledCounts(scanRoot);
    maskViewMetricCounts(scanRoot);

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
