# Changelog

## [1.0.12] - 2026-01-26

### Improved
- **Report Formatting:** Updated the text report format to be cleaner and more readable, matching the requested style:
    - Replaced bullet points with `●` for top-level items and `○` for sub-items.
    - Adjusted indentation and spacing to better align descriptions with their parent tasks.
    - Top-level items: `  ●  KEY-123: Summary`
    - Sub-items: `       ○ Description`

### Fixed
- **Linux Clipboard Support:** Added robust support for HTML clipboard copying on Linux using `wl-copy` (Wayland) with fallback to `xclip` (X11).
- **Report Preview:** Fixed minor formatting issues in the report preview modal.

### Added
- **HTML Copy:** Implemented "Copy as HTML" feature (press `y` in preview) which preserves formatting when pasting into rich text editors (like Gmail, Slack, Confluence).
