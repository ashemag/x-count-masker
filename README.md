# X Count Masker

A small Manifest V3 Chrome extension that hides visible engagement counts on X posts while leaving the underlying buttons clickable. It also masks follower counts on profile links until you double-click the hidden number.

It masks counts for common X post actions:

- replies
- reposts
- quotes
- likes
- bookmarks
- impressions
- views

Reply/comment counts stay visible.

The extension runs as a content script on `x.com` and `twitter.com`. It scans the current page and keeps watching for new posts loaded while you scroll.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `/Users/ashemagalhaes/Desktop/code/x-count-masker`.
5. Visit or refresh X.

## Notes

- The extension does not block network requests or modify your account data.
- Like, repost, reply, bookmark, impression analytics, and view controls remain clickable.
- Counts are hidden in the page UI with CSS, and new counts loaded during infinite scroll are masked automatically.
- Follower counts can be revealed or hidden again by double-clicking the masked count.
