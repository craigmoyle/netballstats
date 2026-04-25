# Code Quality Review: parser-enhance

**Date:** 2025-04-25  
**Reviewer:** GitHub Copilot  
**Status:** ❌ **DO NOT MERGE** — 3 critical blockers

## Overview

Comprehensive quality review of the natural language parser for Ask the Stats feature, including:
- `api/R/parse_question.R` (new parser, 321 lines)
- `api/plumber.R` (new endpoint, 60 lines)
- `assets/query.js` (frontend integration, 71 lines)

---

## ❌ CRITICAL BLOCKERS

### 1. extract_threshold() never called — all thresholds are NULL

**Location:** `api/R/parse_question.R:130-154` (defined), `35-37` (never invoked)

**Problem:**  
The `extract_threshold()` function is defined but orphaned. It's never called from `extract_operator()`. All thresholds returned are NULL.

**Impact:**  
Threshold extraction is broken. Queries like:
- "Which players scored 40+ goals in 2025?" → `{threshold: NULL}` (should be 40)
- "50 goals or more" → `{threshold: NULL}` (should be 50)
- "at least 3 intercepts" → `{threshold: NULL}` (should be 3)

**Evidence:**
```r
# Line 35-37: extract_operator() is called
operator_result <- extract_operator(text)
parsed$operator <- operator_result$operator
parsed$threshold <- operator_result$threshold  # ← Always NULL

# But extract_operator() never calls extract_threshold()
# Line 88-127: All returns have threshold = NULL
```

**Fix:**
Call `extract_threshold(text)` inside `extract_operator()` after detecting operator type:
```r
# In extract_operator()
threshold <- if (operator %in% c("count_threshold", "highest", "lowest")) {
  extract_threshold(text)
} else {
  NULL
}
return(list(operator = operator, threshold = threshold))
```

---

### 2. Hardcoded team names are factually incorrect

**Location:** `api/R/parse_question.R:217-222` (extract_subject), `270-275` (extract_opponent)

**Problem:**  
The hardcoded teams list contains non-existent teams:

| Hardcoded | Issue | Real Team |
|-----------|-------|-----------|
| `"perth wildcats"` | ✗ Not a Super Netball team | N/A (doesn't exist) |
| `"suncorp vixens"` | ✗ Suncorp is sponsor, not team name | Melbourne Vixens |
| `"brisbane lions"` | ✗ No lions team | Queensland Firebirds |
| `"collingwood magpies"` | ✗ Not a Super Netball team | N/A (doesn't exist) |

Missing real teams:
- Adelaide Thunderbirds (listed as "adelaide thunderbirds" but only as backup)
- NSW Swifts (only "swifts" listed)
- West Coast Fever (only "fever" listed)
- Sunshine Coast Lightning (not listed)
- Queensland Firebirds (not listed, replaced with "brisbane lions")

**Evidence:**
```r
# helpers.R example questions use real team names
"How many times has Fowler scored 50 goals or more against the Vixens?"
"What is Fowler's highest goals total against the Swifts?"
# Database stores: "NSW Swifts", "Melbourne Vixens" (full names)
```

**Impact:**
- Team name extraction fails or matches wrong teams
- Queries with opponent filters silently produce wrong results
- Example: "vs Firebirds" fails if parser doesn't recognize full name

**Fix:**
Query teams from database at startup:
```r
fetch_team_aliases <- function(conn) {
  teams <- dbGetQuery(conn, "SELECT squad_id, squad_name, squad_code FROM teams")
  # Build aliases: full name, code, first word, last word
  # Return as canonical list
}
```

Or update hardcoded list to real Super Netball teams:
```r
CANONICAL_TEAMS <- c(
  "adelaide thunderbirds", "nsw swifts", "melbourne vixens",
  "west coast fever", "sunshine coast lightning", "queensland firebirds",
  # Shorthand aliases:
  "thunderbirds", "swifts", "vixens", "fever", "lightning", "firebirds"
)
```

---

### 3. No tests — example questions are untested

**Status:** Zero automated tests for parser.

**Missing Coverage:**
- ✗ None of the 5 `QUERY_SUPPORTED_EXAMPLES` tested
- ✗ Edge cases untested (empty input, misspelled stat, missing subject)
- ✗ Threshold extraction untested (and broken per Blocker #1)
- ✗ Team name matching untested
- ✗ Possessive patterns untested

**Impact:**
Broken features go undetected. Example: "50 goals or more" threshold feature silently fails with NULL.

**Fix:**
Create `scripts/test_parse_question.R`:
```r
test_cases <- list(
  list(
    question = "How many times has Fowler scored 50 goals or more against the Vixens?",
    expect_stat = "goals",
    expect_threshold = 50,
    expect_operator = "count_threshold",
    expect_opponent = "vixens"
  ),
  list(
    question = "Which players scored 40+ goals in 2025?",
    expect_stat = "goals",
    expect_threshold = 40,
    expect_season = 2025
  ),
  # ... more test cases
)

for (tc in test_cases) {
  result <- parse_natural_language_question(tc$question)
  assert_true(result$parsed$stat == tc$expect_stat, ...)
  assert_true(result$parsed$threshold == tc$expect_threshold, ...)
}
```

---

## ⚠️ IMPORTANT ISSUES

### 4. Performance: ~80-120 regex patterns recompiled per request

**Location:** `api/R/parse_question.R:189-200` (extract_stat), `278-296` (extract_opponent)

**Problem:**
```r
for (stat_key in names(stat_mappings)) {           # 20 iterations
  for (alias in stat_mappings[[stat_key]]) {       # 3-5 iterations each
    pattern <- paste0("\\b", gsub(...), "\\b")    # REBUILT EACH TIME
    if (grepl(pattern, text)) { ... }             # RECOMPILED EACH TIME
  }
}
```

Result: ~100-120 regex compilations per API call vs. ~1 if cached.

**Fix:**
Cache patterns at module load time.

---

### 5. Maintainability: Team names hardcoded in TWO places

**Location:** `extract_subject():217-222`, `extract_opponent():270-275`

**Problem:**
- Duplicate team lists → update burden
- Dead code: `extract_subject()` creates unused `teams_pattern` variable
- Inconsistency risk: lists can drift

**Fix:**
Define `CANONICAL_TEAMS` at module top, reuse in both functions.

---

### 6. Possessive name extraction fails on multi-word names

**Location:** `api/R/parse_question.R:247-254`

**Current pattern:**
```r
possessive_pattern <- "\\b([A-Za-z]+)'s\\s+(?:highest|lowest|best|total)"
```

**Problem:**
- ✗ "Chloe Singleton's highest goals" → captures "Chloe" only (loses "Singleton")
- ✓ "Fowler's highest goals" → works

**Fix:**
```r
possessive_pattern <- "\\b([A-Za-z\\s]+)'s\\s+(?:highest|lowest|best|total)"
```

---

### 7. Regex failures can crash endpoint

**Location:** `api/R/parse_question.R:189-200, 278-296`

**Problem:**  
`grepl()` called without `tryCatch`. Invalid regex → 500 error.

**Fix:**
```r
tryCatch({
  if (grepl(pattern, text)) { ... }
}, error = function(e) {
  # Log and return NULL
  NULL
})
```

---

### 8. HTTP semantics: 200 for parse failures

**Location:** `api/plumber.R:1792`

**Current:** Parse failures return `res$status <- 200L`

**Issue:** HTTP 200 = success. Parse failure ≠ success.

**Better:** Return 422 Unprocessable Entity or document intentional behavior.

**Note:** Frontend unaffected (checks `success` field, not status code).

---

### 9. Season 2026 allowed

**Location:** `api/R/parse_question.R:314`

**Problem:** `year_int <= 2026L` allows future seasons that don't exist.

**Fix:** `year_int <= 2025L` or `year_int <= current_year() + 1`

---

### 10. No player name validation

**Location:** `api/R/parse_question.R:205-266`

**Problem:**  
Parser accepts any text as player name without validation. Undetected errors:
- "Nonexistent Plr scored highest" → `subject="Nonexistent Plr"` ✓ (parse OK, fails at query)
- "xyz scored highest" → `subject="xyz"` ✓ (same)

**Note:** Optional. Query endpoint will reject invalid names. Can be deferred.

---

## ✅ POSITIVE FINDINGS

- ✓ JSON API structure is clear and well-documented
- ✓ Error messages are user-friendly
- ✓ Input validation in plumber endpoint is robust
- ✓ `@serializer unboxedJSONNullNA` correctly handles NULL values
- ✓ Frontend error handling gracefully falls back to template gallery
- ✓ `record_to_scalars()` properly boxes values
- ✓ Case-insensitive matching is appropriate

---

## VERDICT

**Status:** ❌ **DO NOT MERGE**

**Reason:**  
Three critical blockers prevent deployment:

1. **Threshold extraction is completely broken** (function orphaned)
2. **Team names are factually incorrect** (perth wildcats, suncorp vixens don't exist)
3. **Zero tests validate the feature**

The parser will **silently fail** on:
- Threshold queries: "Which players scored 40+ goals?"
- Team filters: "Who scored highest vs the Vixens?"

---

## EFFORT ESTIMATE

~2–3 hours to fix all issues:

| Task | Time |
|------|------|
| Integrate `extract_threshold()` | 30 min |
| Fix team names (query from DB) | 30 min |
| Add comprehensive test suite | 1–2 hours |
| Polish (perf, error handling, edge cases) | 1 hour |

---

## NEXT STEPS

1. ✅ Fix the 3 blockers
2. ✅ Add test coverage (at least examples)
3. ✅ Re-submit for review

---

**Generated:** 2025-04-25  
**Reviewer:** GitHub Copilot CLI
