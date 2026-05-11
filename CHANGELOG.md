# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-12

### Added
- Initial release
- `inspect()` function for structured merge request investigation
- `DiffInspectVcs` interface for VCS provider abstraction
- Context gatherers: diff, blame, commits, author profile, related changes, scope analysis
- Selective context gathering via `include` option
- Parallel VCS calls for blame and commit history
