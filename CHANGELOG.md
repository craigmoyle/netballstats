# Changelog

All notable changes to netballstats are documented in this file.

## [Unreleased]

### Added

#### Australian Diamonds International Archive
- **New section at `/international/`**: Dedicated archive for Australian Diamonds matches, leaderboards, and player profiles
- **Archive page** (`/international/`): Recent matches table (latest 10, newest first with scores), player and team leaderboards with stat selectors, tabbed player/team panel
- **Players directory** (`/international/players/`): Searchable directory of all international players
- **Player profiles** (`/international/player/`): Individual player stats across international matches
- **Compare page** (`/international/compare/`): Side-by-side Diamonds player and team comparisons
- **Ask the Stats** (`/international/query/`): Natural language query support for international data
- **Competition coverage**: Exhaustive search across all women's competitions to identify every Diamonds match — 29 competitions and 200+ matches across 13 years of data
- **Stat selectors on leaderboards**: Player and team stat dropdowns (points, goal assists, feeds, gains, intercepts, etc.) with dynamic table captions
- **Unified two-section navigation**: Top nav separates Super Netball and Australian Diamonds sections with a divider
- **Dedicated data pipeline**: Separate Azure Container Apps jobs rebuild international data on Tuesday/Friday schedules
- **Database tables**: `international_matches`, `international_teams`, `international_players`, `international_player_match_stats` (long-format stats, same schema discipline as Super Netball tables)

#### Code Quality & Reliability
- **Crash Prevention**: New `coerce_seasons()` helper prevents season parameter crashes on empty arrays/NA values
- **Goals Logic Centralization**: Extracted duplicate "points calculation" logic (goal1 + 2×goal2) into `build_goals_stat_expression()` helper
- **Standardized Error Responses**: All builder errors now use consistent schema with `{status, intent_type, error, code}` structure
- **Table Availability Safety**: Trend queries now check for `team_match_stats` availability before falling back to `team_period_stats`
- **Comprehensive Testing**: 17 new regression tests covering season coercion edge cases; 40+ existing tests all passing

#### Ask the Stats - Natural Language Query Builder
- **Query Builder Interface**: New query page with free-form text input for asking questions about Super Netball history
- **Natural Language Parsing**: Parser extracts player/team, stat, operator, threshold, opponent, and season from questions
- **Confidence-Tier Guided Workflow**: Parser returns HIGH/MEDIUM/LOW confidence with prefill hints for template builder
- **10 Template Types**: COUNT THRESHOLD, SINGLE PEAK, PLAYER LIST, TEAM LOW MARK, HEAD-TO-HEAD, PLAYER COMBO, RECORD HOLDER, MULTI-TEAM, QUARTER BREAKDOWN, RISING STARS
- **4 Builder Template Shapes**: 
  - Comparison: Multi-subject stat comparisons with custom operators
  - Trend: Season-over-season analysis with year-over-year changes
  - Record: All-time record holders with context
  - Combination: Multi-filter queries with AND/OR operators
- **Extended API Endpoint**: `POST /api/ask-the-stats` now supports both:
  - Natural language queries (existing)
  - Builder-based submissions with `builder_source=true` (new)
- **Parser Improvements**:
  - 6 regex patterns for threshold extraction ("50 goals or more" → 50)
  - Team name resolution with clear documentation
  - 22 comprehensive test cases for edge cases and error handling

#### Code Quality & Reliability
- **Crash Prevention**: New `coerce_seasons()` helper prevents season parameter crashes on empty arrays/NA values
- **Goals Logic Centralization**: Extracted duplicate "points calculation" logic (goal1 + 2×goal2) into `build_goals_stat_expression()` helper
- **Standardized Error Responses**: All builder errors now use consistent schema with `{status, intent_type, error, code}` structure
- **Table Availability Safety**: Trend queries now check for `team_match_stats` availability before falling back to `team_period_stats`
- **Comprehensive Testing**: 17 new regression tests covering season coercion edge cases; 40+ existing tests all passing

#### Documentation
- Added comprehensive documentation to critical helper functions in `api/R/helpers.R` and `api/plumber.R`
- Documented 22 critical functions with security review and SQL injection risk assessment
- Created verification reports for Ask the Stats feature completeness
- Updated `AGENTS.md` with full international data integration architecture and operating notes

### Fixed

- **International URL routing**: Removed double `/api/` prefix from all international page fetch calls (`buildUrl()` already prepends `/api`)
- **International match ordering**: Fixed reversed sort order; matches now display newest first
- **International match scores**: Fixed status check (`"complete"` not `"completed"`) so scores render correctly
- **International team leaders**: Aggregates from `international_player_match_stats` (no separate team stats table); uses `LEFT JOIN + COALESCE` to handle squad_id mismatches on the points stat
- **International competition discovery**: Replaced name-heuristic search with exhaustive check of all women's competitions; coverage increased from 13 to 29 competitions (60 → 200+ matches)
- **International players endpoint**: Fixed crash on empty search param (`nzchar(NULL)` → `logical(0)` → "argument is of length zero"); rewrote to use incremental params pattern
- **Stale Container App revision**: Deactivated old revision that was handling live traffic despite 0% weight
- **Docker layer cache**: Added `ARG BUILD_TIMESTAMP` to force fresh `COPY` of R files on each deploy
- **Docker Container Startup**: Fixed API startup failure by installing R packages in runtime stage (not build stage) and disabling project `.Rprofile` to prevent renv activation
- **Round Preview UX**: Player stats now grouped under single teal team heading; round preview shows in-progress rounds and auto-advances when complete
- **Parser Threshold Extraction**: Fixed 6 regex patterns for accurate threshold parsing (e.g., "50 goals or more", "at least 30 assists")
- **API Validation**: Fixed crash vulnerability in season parameter handling across all builder types

- **No SQL Injection Risks**: All builder queries use parameterized statements; user input never concatenated
- **Input Validation**: Comprehensive validation of all builder template shapes before query execution
- **Rate Limiting**: Rate limiter remains active; returns HTTP 429 on limit exceeded
- **Parameterized Queries**: All stats, seasons, operators validated against whitelist before use

### Performance

- **Efficient Query Building**: Builder functions execute 1-2 optimized queries per request
- **Table Index Usage**: Queries leverage indexed columns (`local_start_time`, `squad_id`, `season`)
- **Caching Ready**: Architecture supports adding response caching without changes

### Backward Compatibility

✅ All existing natural language query endpoints remain functional  
✅ URL query parameters still work (GET/POST)  
✅ Original error handling paths preserved  
✅ No breaking changes to API contract  

---

## Previous Releases

### Round Preview & Player Profile UX [Released]
- Implemented round preview page with in-progress round detection
- Fixed player stats layout to group stats under single team heading
- Added visual hierarchy with teal team heading styling
- Responsive design for mobile and desktop

### API Infrastructure [Released]
- Deployed API on Azure Container Apps
- Configured PostgreSQL Flexible Server database
- Set up scheduled database refresh jobs
- Implemented rate limiting and error telemetry

### Initial Archive [Released]
- Homepage with historical archive navigation
- Compare page for season/team/player comparisons
- Player profile pages with career stats
- Team overview with season breakdowns

---

## Documentation

- `AGENTS.md` — Operating guidelines for future development
- `DESIGN.md` — Design tokens and system spec
- `CLAUDE.md` — Product design context for UI and copy
- `README.md` — Installation, deployment, and development guide
- `api/R/helpers.R` — Inline documentation for all query builders and helpers
- `api/plumber.R` — Inline documentation for API endpoints

---

## Support

For issues, questions, or feature requests, please refer to the repository documentation or create an issue on GitHub.
