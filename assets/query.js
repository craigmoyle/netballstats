const config = window.NETBALL_STATS_CONFIG || {};
const API_BASE_URL = (config.apiBaseUrl || "/api").replace(/\/$/, "");
const {
  buildUrl,
  buildSurfaceCitationText,
  bindSurfaceCitationCopy,
  clearEmptyTableState = () => {},
  fetchJson,
  getMeta,
  formatDate,
  formatNumber,
  formatStatLabel = (stat) => stat,
  playerProfileUrl = (playerId) => `/player/${encodeURIComponent(playerId)}/`,
  renderEmptyTableRow = () => {},
  showElementLoadingStatus = () => {},
  showElementStatus = () => {},
  syncResponsiveTable = () => {},
  updateSurfaceCitation = () => {}
} = window.NetballStatsUI || {};
const {
  applyMetaConfig = () => {},
  bucketCount = () => "unknown",
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};
const QUERY_LOADING_MESSAGES = [
  "Parsing the question…",
  "Checking the supporting match totals…",
  "Drafting an answer from the archive…"
];
const QUERY_STATUS_LABELS = {
  count: "Count",
  highest: "Highest",
  lowest: "Lowest",
  list: "List",
  comparison: "Comparison",
  combination: "Combination",
  trend: "Trend",
  record: "Record"
};
const PARSER_CONFIDENCE_COPY = {
  HIGH: "Ready to run",
  MEDIUM: "Needs a clearer question",
  LOW: "Builder recommended"
};
const DEFAULT_QUERY_STATE = {
  title: "Questions that work well",
  description: "The parser is strongest when you name the subject, the stat, then the kind of answer you want.",
  items: [
    "Ask how many times someone reached a stat total",
    "Ask for the highest or lowest mark against an opponent or across the archive",
    "Ask for a season trend or a head-to-head comparison"
  ]
};
const FALLBACK_EXAMPLES = [
  "How many times has Grace Nweke scored 50 points or more against the Vixens?",
  "What is Liz Watson's highest goal assist total against the Firebirds?",
  "Which players had 5+ gains in 2025?",
  "Which teams had the lowest general play turnovers in 2025?",
  "Grace Nweke goal assists across 2023, 2024, 2025",
  "Vixens vs Swifts goal assists in 2025",
  "Highest single-game intercepts all time"
];
const TABLE_SCHEMAS = {
  player: {
    caption: "Matching player performances",
    columns: ["Player", "Team", "Opponent", "Season", "Round", "Stat total", "Local start"]
  },
  team: {
    caption: "Matching team performances",
    columns: ["Team", "Opponent", "Season", "Round", "Stat total", "Local start"]
  },
  trend: {
    caption: "Season-by-season trend",
    columns: ["Season", "Games", "Total", "Average", "Year-over-year change"]
  },
  comparison: {
    caption: "Comparison summary",
    columns: ["Subject", "Type", "Games", "Total", "Average per game"]
  },
  record: {
    caption: "Record context",
    columns: ["Rank", "Subject", "Season", "Value", "Date"]
  },
  combination: {
    caption: "Matching performances",
    columns: ["Player", "Team", "Opponent", "Season", "Date", "Matched stats"]
  }
};

const elements = {
  apiBase: document.getElementById("api-base"),
  heroSeasonRange: document.getElementById("hero-season-range"),
  querySeasonSummary: document.getElementById("query-season-summary"),
  queryHeroAside: document.getElementById("query-hero-aside"),
  queryStatus: document.getElementById("query-status"),
  queryForm: document.getElementById("query-form"),
  queryStepShape: document.getElementById("query-step-shape"),
  queryStepCompose: document.getElementById("query-step-compose"),
  queryStepRun: document.getElementById("query-step-run"),
  queryTemplateStrip: document.getElementById("query-template-strip"),
  queryRunwayHint: document.getElementById("query-runway-hint"),
  questionInput: document.getElementById("question-input"),
  questionCharacterCount: document.getElementById("question-character-count"),
  clearQuestion: document.getElementById("clear-question"),
  exampleStrip: document.getElementById("example-strip"),
  summaryQuestionType: document.getElementById("summary-question-type"),
  summaryMatchCount: document.getElementById("summary-match-count"),
  summaryStat: document.getElementById("summary-stat"),
  summaryStatus: document.getElementById("summary-status"),
  answerHeadline: document.getElementById("answer-headline"),
  answerMeta: document.getElementById("answer-meta"),
  interpretationGrid: document.getElementById("interpretation-grid"),
  queryHelp: document.getElementById("query-help"),
  queryHelpSummary: document.getElementById("query-help-summary"),
  queryState: document.getElementById("query-state"),
  tableMeta: document.getElementById("table-meta"),
  queryTable: document.getElementById("query-table"),
  queryTableCaption: document.getElementById("query-table-caption"),
  queryTableHead: document.getElementById("query-table-head"),
  queryRowsBody: document.getElementById("query-rows-body"),
  errorBanner: document.getElementById("error-banner"),
  errorBannerMessage: document.getElementById("error-banner-message"),
  errorBannerActions: document.getElementById("error-banner-actions"),
  queryPulseSection: document.getElementById("query-pulse-section"),
  openBuilderTrigger: document.getElementById("open-builder-trigger"),
  queryCitation: document.getElementById("query-citation"),
  queryCitationText: document.getElementById("query-citation-text"),
  queryCitationCopy: document.getElementById("query-citation-copy")
};

elements.submitButton = elements.queryForm.querySelector('[type="submit"]');

let lastQueryCitation = {
  question: "",
  segments: []
};

function buildQueryCitationText() {
  return buildSurfaceCitationText({
    scope: "domestic",
    segments: [
      lastQueryCitation.question ? `Question: ${lastQueryCitation.question}` : "",
      ...lastQueryCitation.segments
    ]
  });
}

function renderQueryCitation({ question = "", segments = [], visible = false } = {}) {
  lastQueryCitation = { question, segments };
  updateSurfaceCitation(
    elements.queryCitation,
    elements.queryCitationText,
    visible ? buildQueryCitationText() : "",
    { visible }
  );
}

function hideQueryCitation() {
  renderQueryCitation({ visible: false });
}

const exampleButtons = Array.from(elements.exampleStrip.querySelectorAll("[data-example]"));
const templateButtons = Array.from((elements.queryTemplateStrip?.querySelectorAll("[data-template]")) || []);
const submitButtonDefaultLabel = elements.submitButton?.textContent || "Run question";

// Builder modal elements
const BUILDER_STEP_COUNT = 4;
const BUILDER_COMMON_STATS = ["points", "goalAssists", "feeds", "gain", "intercepts", "generalPlayTurnovers"];
const BUILDER_SUGGESTED_PLAYERS = [
  "Grace Nweke",
  "Liz Watson",
  "Jamie-Lee Price",
  "Paige Hadley"
];

const BUILDER_SHAPE_PREVIEW = {
  count: "How many times has [subject] recorded [stat]",
  highest: "What is [subject]'s highest [stat]",
  lowest: "What is [subject]'s lowest [stat]",
  comparison: "Compare [subject] and [subject] on [stat]",
  trend: "[subject] [stat] across seasons",
  list: "Which players or teams had [stat]",
  record: "What is the all-time record for [stat]",
  combination: "Combine conditions on [stat]"
};

const builderElements = {
  modal: document.getElementById("query-builder-modal"),
  form: document.getElementById("builder-form"),
  closeBtn: document.querySelector(".builder-modal__close"),
  nextBtn: document.getElementById("builder-next"),
  prevBtn: document.getElementById("builder-prev"),
  submitBtn: document.getElementById("builder-submit"),
  stepProgress: document.getElementById("builder-step-progress"),
  questionPreview: document.getElementById("builder-question-preview"),
  subjectHint: document.getElementById("builder-subject-hint"),
  subjectChips: document.getElementById("builder-subject-chips"),

  // Step elements
  stepShape: document.getElementById("builder-step-shape"),
  stepSubjects: document.getElementById("builder-step-subjects"),
  stepStat: document.getElementById("builder-step-stat"),
  stepTimeframe: document.getElementById("builder-step-timeframe"),

  // Subject selection
  subjectSearch: document.getElementById("builder-subject-search"),
  subjectList: document.getElementById("builder-subject-list"),

  // Stat selection
  statSearch: document.getElementById("builder-stat-search"),
  statList: document.getElementById("builder-stat-list"),

  // Filters
  filterOpponent: document.getElementById("builder-filter-opponent"),
  filterLocation: document.getElementById("builder-filter-location"),
  filterGames: document.getElementById("builder-filter-games"),

  // Timeframe
  timeframeSingle: document.getElementById("builder-timeframe-single"),
  timeframeRange: document.getElementById("builder-timeframe-range"),
  seasonSingle: document.getElementById("builder-season-single"),
  seasonFrom: document.getElementById("builder-season-from"),
  seasonTo: document.getElementById("builder-season-to")
};

// Builder state
let builderState = {
  currentStep: 1,
  shape: null,
  subjects: [],
  stat: null,
  filters: {},
  timeframe: null,
  seasonSingle: null,
  seasonRange: null,
  availableSeasons: [],
  availableSubjects: [],
  availableTeams: []
};

if (elements.apiBase) {
  elements.apiBase.textContent = API_BASE_URL;
}

function showErrorBanner(message) {
  if (!elements.errorBanner) return;
  elements.errorBanner.hidden = false;
  if (elements.errorBannerMessage) {
    elements.errorBannerMessage.textContent = message;
  }
}

function hideErrorBanner() {
  if (!elements.errorBanner) return;
  elements.errorBanner.hidden = true;
  if (elements.errorBannerMessage) {
    elements.errorBannerMessage.textContent = "";
  }
  if (elements.errorBannerActions) {
    elements.errorBannerActions.replaceChildren();
  }
}

function showBuilderButton(prefill) {
  if (!elements.errorBannerActions) return;
  const existingButton = elements.errorBannerActions.querySelector("[data-builder-trigger='true']");
  if (existingButton) {
    existingButton.remove();
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button--primary";
  button.textContent = "Use the builder";
  button.dataset.builderTrigger = "true";
  button.addEventListener("click", () => {
    openBuilderModal(prefill);
  });

  elements.errorBannerActions.appendChild(button);
}

function hasBuilderPrefill(prefill) {
  return Boolean(
    prefill
    && typeof prefill === "object"
    && Object.keys(prefill).length
  );
}

function openBuilderModal(prefill) {
  const event = new CustomEvent("open-builder-modal", {
    detail: { prefill }
  });
  window.dispatchEvent(event);
}

function rephraseSuggestion(suggestion) {
  applyQuestionText(suggestion, { focus: true });
  void runQuestion(suggestion, "suggestion");
}

function attemptComplexParse(question) {
  if (!question || typeof question !== "string") {
    return null;
  }

  const trimmed = question.trim().toLowerCase();
  const confidence = { score: 0 };

  let intentType = null;
  let subjects = [];
  let stat = null;
  let filters = [];
  let seasons = null;
  let operator = "AND";

  const comparisonMarkers = /\bvs\b|\bversus\b|\bcompared to\b|\bvs\./i;
  const trendMarkers = /\bacross\b|\btrend\b/i;
  const recordMarkers = /\ball[- ]?time\b|\bever\b|\branking\b|\brecord\b/i;
  const seasonPattern = /\b(20\d{2})\b/g;
  const seasonRangePattern = /\b(20\d{2})\s*[-–]\s*(20\d{2})\b/;
  const logicalOpPattern = /\b(and|or)\b/i;

  if (comparisonMarkers.test(trimmed)) {
    intentType = "comparison";
    confidence.score += 0.25;
  } else if (recordMarkers.test(trimmed)) {
    intentType = "record";
    confidence.score += 0.25;
  } else if (trendMarkers.test(trimmed) || /\bacross\s+(20\d{2})/.test(trimmed)) {
    intentType = "trend";
    confidence.score += 0.25;
  } else if (logicalOpPattern.test(trimmed) && (trimmed.includes("and ") || trimmed.includes("or "))) {
    intentType = "combination";
    confidence.score += 0.25;
  }

  if (intentType && /\b\d+\+/.test(trimmed)) {
    confidence.score += 0.1;
  }

  const seasonMatches = trimmed.match(seasonPattern);
  if (seasonMatches && seasonMatches.length > 0) {
    seasons = [...new Set(seasonMatches.map(Number))].sort();
    confidence.score += 0.15;
  }

  const seasonRangeMatch = trimmed.match(seasonRangePattern);
  if (seasonRangeMatch) {
    const startYear = parseInt(seasonRangeMatch[1], 10);
    const endYear = parseInt(seasonRangeMatch[2], 10);
    seasons = [];
    for (let year = startYear; year <= endYear; year++) {
      seasons.push(year);
    }
    confidence.score += 0.15;
  }

  if (intentType === "record" || !intentType) {
    return null;
  }

  confidence.score = Math.min(confidence.score, 1.0);

  return {
    intentType,
    subjects,
    stat,
    filters,
    seasons,
    operator,
    confidence: confidence.score
  };
}

function showStatus(message, tone = "neutral", options = {}) {
  showElementStatus(elements.queryStatus, message, tone, options);
}

function showLoadingStatus(messages, kicker) {
  showElementLoadingStatus(elements.queryStatus, messages, kicker);
}

function normalizeQuerySubjectType(subjectType = "player") {
  return subjectType === "team" || subjectType === "teams" ? "team" : "player";
}

function setTableSchema(subjectType = "player") {
  const schema = TABLE_SCHEMAS[subjectType] || TABLE_SCHEMAS[normalizeQuerySubjectType(subjectType)] || TABLE_SCHEMAS.player;
  if (elements.queryTableCaption) {
    elements.queryTableCaption.textContent = schema.caption;
  }
  if (elements.queryTableHead) {
    const row = document.createElement("tr");
    schema.columns.forEach((label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      row.appendChild(th);
    });
    elements.queryTableHead.replaceChildren(row);
  }
  syncResponsiveTable(elements.queryTable);
}

function clearTable(message) {
  renderEmptyTableRow(elements.queryRowsBody, message);
}

function createInterpretationCard(label, value) {
  const article = document.createElement("article");
  article.className = "interpretation-card";

  const labelElement = document.createElement("span");
  labelElement.className = "interpretation-card__label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "interpretation-card__value";
  valueElement.textContent = value || "--";

  article.append(labelElement, valueElement);
  return article;
}

function setSummaryCards(questionType = "--", matchCount = "--", stat = "--", status = "Ready") {
  elements.summaryQuestionType.textContent = questionType;
  elements.summaryMatchCount.textContent = matchCount;
  elements.summaryStat.textContent = stat;
  elements.summaryStatus.textContent = status;
}

function renderQueryState({ title, description, items = [], extraParagraphs = [] }) {
  elements.queryState.replaceChildren();

  const titleElement = document.createElement("strong");
  titleElement.textContent = title;
  elements.queryState.appendChild(titleElement);

  if (description) {
    const descriptionElement = document.createElement("p");
    descriptionElement.textContent = description;
    elements.queryState.appendChild(descriptionElement);
  }

  extraParagraphs.forEach((paragraph) => {
    if (!paragraph) {
      return;
    }

    const paragraphElement = document.createElement("p");
    paragraphElement.textContent = paragraph;
    elements.queryState.appendChild(paragraphElement);
  });

  if (items.length) {
    const list = document.createElement("ul");
    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });
    elements.queryState.appendChild(list);
  }
}

function renderDefaultQueryState() {
  renderQueryState(DEFAULT_QUERY_STATE);
  if (elements.queryHelpSummary) {
    elements.queryHelpSummary.textContent = "Questions that work well";
  }
}

function setStepState(element, stepState) {
  if (element) {
    element.setAttribute("data-step-state", stepState);
  }
}

function containsTemplatePlaceholders(value = "") {
  return /\[[^\]]+\]/.test(value);
}

function updateQuestionWorkflowState(value = "") {
  const trimmed = value.trim();
  const hasText = Boolean(trimmed);
  const hasPlaceholders = containsTemplatePlaceholders(value);

  setStepState(elements.queryStepCompose, hasText ? "ready" : "active");
  setStepState(elements.queryStepShape, hasPlaceholders ? "ready" : "active");
  setStepState(elements.queryStepRun, hasText && !hasPlaceholders ? "active" : "pending");

  if (!elements.queryRunwayHint) {
    return;
  }

  if (!hasText) {
    elements.queryRunwayHint.textContent = "Write a question or start from a prompt.";
    return;
  }

  if (hasPlaceholders) {
    elements.queryRunwayHint.textContent = "Replace the bracketed placeholders before you run it.";
    return;
  }

  elements.queryRunwayHint.textContent = "Ready to run. The answer and rows will update together.";
}

function updateQuestionComposerState(value = "") {
  const trimmed = value.trim();
  const hasPlaceholders = containsTemplatePlaceholders(value);

  if (elements.questionCharacterCount) {
    elements.questionCharacterCount.textContent = `${value.length} / 220 characters`;
  }

  elements.clearQuestion.disabled = trimmed.length === 0;

  exampleButtons.forEach((button) => {
    const isActive = button.getAttribute("data-example") === value;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  templateButtons.forEach((button) => {
    const templateValue = button.getAttribute("data-template") || "";
    const isActive = templateValue === value;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (elements.submitButton && !questionRunning) {
    elements.submitButton.disabled = trimmed.length === 0 || hasPlaceholders;
  }

  updateQuestionWorkflowState(value);
}

function applyQuestionText(question, { focus = true } = {}) {
  elements.questionInput.value = question;
  updateQuestionComposerState(question);
  if (focus) {
    elements.questionInput.focus();
    elements.questionInput.setSelectionRange(question.length, question.length);
  }
}

function setIdleState() {
  hideErrorBanner();
  setTableSchema("player");
  elements.answerHeadline.textContent = "Ask about a player, team, or stat.";
  elements.answerMeta.textContent = "The answer appears first, with the matching evidence underneath.";
  elements.interpretationGrid.replaceChildren();
  renderDefaultQueryState();
  if (elements.queryPulseSection) {
    elements.queryPulseSection.hidden = true;
  }
  if (elements.queryHelp) {
    elements.queryHelp.hidden = true;
    elements.queryHelp.open = false;
  }
  elements.tableMeta.textContent = "";
  clearTable("Run a question to load the matching rows.");
  hideQueryCitation();
  updateQuestionComposerState(elements.questionInput.value);
}

function renderMeta(meta) {
  if (!meta || !Array.isArray(meta.seasons) || !meta.seasons.length) {
    elements.querySeasonSummary.textContent = "Questions work across the archive.";
    if (elements.queryHeroAside) {
      elements.queryHeroAside.hidden = false;
    }
    return;
  }

  const seasons = [...meta.seasons].sort((left, right) => left - right);
  const firstFullSeason = seasons.length > 1 ? seasons[1] : seasons[0];
  if (elements.heroSeasonRange) elements.heroSeasonRange.textContent = `${seasons[0]} finals + ${firstFullSeason}\u2013${seasons[seasons.length - 1]}`;
  elements.querySeasonSummary.textContent = `${seasons[0]} finals only · full seasons ${firstFullSeason}-${seasons[seasons.length - 1]} · ${meta.player_stats.length} player stats · ${meta.team_stats.length} team stats.`;
  if (elements.queryHeroAside) {
    elements.queryHeroAside.hidden = false;
  }
}

function renderInterpretation(parsed = {}) {
  elements.interpretationGrid.replaceChildren();
  const seasonValue = Array.isArray(parsed.seasons) && parsed.seasons.length
    ? parsed.seasons.join(", ")
    : (parsed.season || "All seasons");
  const subjectType = normalizeQuerySubjectType(parsed.subject_type);
  const subjectValue = parsed.subject_label
    || parsed.player_name
    || parsed.team_name
    || (parsed.subject_type === "players" ? "Players" : (parsed.subject_type === "teams" ? "Teams" : "--"));
  const statValue = parsed.stat ? formatStatLabel(parsed.stat) : (parsed.stat_label || "--");

  const cards = [
    ["Question type", QUERY_STATUS_LABELS[parsed.intent_type] || "--"],
    ["Subject", subjectValue],
    ["Subject type", subjectType === "team" ? "Team" : "Player"],
    ["Stat", statValue],
    ["Filter", parsed.filter_label
      || (parsed.comparison_label && parsed.threshold !== undefined && parsed.threshold !== null
        ? `${parsed.comparison_label} ${formatNumber(parsed.threshold)}`
        : "None")],
    ["Opponent", parsed.opponent_name || "Any"],
    ["Season", seasonValue]
  ];

  cards.forEach(([label, value]) => {
    elements.interpretationGrid.appendChild(createInterpretationCard(label, `${value}`));
  });
}

function formatSignedValue(value, suffix = "") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }
  return `${numericValue > 0 ? "+" : ""}${formatNumber(numericValue)}${suffix}`;
}

function normalizeLegacySupportedResult(result) {
  const summary = result.summary || {};
  const parsed = result.parsed || {};
  const subjectType = normalizeQuerySubjectType(parsed.subject_type);
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const matchCount = summary.match_count ?? rows.length;

  return {
    answer: result.answer || "No answer.",
    answerMeta: "Transparent answer with the matching evidence table below.",
    summary: {
      questionType: QUERY_STATUS_LABELS[summary.question_type] || "--",
      matchCount: formatNumber(matchCount),
      stat: parsed.stat ? formatStatLabel(parsed.stat) : (summary.stat_label || "--"),
      status: "Supported"
    },
    parsed,
    tableKind: subjectType,
    rows,
    tableMeta: rows.length
      ? `Showing ${rows.length} row${rows.length === 1 ? "" : "s"} from ${formatNumber(matchCount)} matching performance${matchCount === 1 ? "" : "s"}.`
      : "No matching records."
  };
}

function normalizeTrendResult(result) {
  const rows = Array.isArray(result.results) ? result.results : [];
  const subjectType = normalizeQuerySubjectType(result.subject_type);
  const statLabel = result.stat_label || formatStatLabel(result.stat);
  const totalGames = rows.reduce((sum, entry) => sum + (Number(entry.games) || 0), 0);
  const first = rows[0];
  const last = rows[rows.length - 1];

  let answer = `${result.subject} recorded ${formatNumber(last?.total || 0)} ${statLabel.toLowerCase()} in ${last?.season || "the selected season"}.`;
  if (first && last && rows.length > 1) {
    const firstTotal = Number(first.total) || 0;
    const lastTotal = Number(last.total) || 0;
    const direction = lastTotal > firstTotal ? "rose" : (lastTotal < firstTotal ? "fell" : "held steady");
    answer = `${result.subject}'s ${statLabel.toLowerCase()} ${direction} from ${formatNumber(firstTotal)} in ${first.season} to ${formatNumber(lastTotal)} in ${last.season}.`;
  }

  return {
    answer,
    answerMeta: "Season-by-season totals with per-game averages and year-over-year change.",
    summary: {
      questionType: QUERY_STATUS_LABELS.trend,
      matchCount: formatNumber(totalGames),
      stat: statLabel,
      status: "Supported"
    },
    parsed: {
      intent_type: "trend",
      subject_type: subjectType,
      stat: result.stat,
      stat_label: statLabel,
      seasons: Array.isArray(result.seasons) ? result.seasons : [],
      ...(subjectType === "team" ? { team_name: result.subject } : { player_name: result.subject })
    },
    tableKind: "trend",
    rows: rows.map((entry) => ({
      season: entry.season,
      games: entry.games,
      total: entry.total,
      average: entry.average,
      change: entry.yoy_change_label || (entry.yoy_change != null ? formatSignedValue(entry.yoy_change, "%") : "Baseline")
    })),
    tableMeta: rows.length
      ? `Showing ${rows.length} season row${rows.length === 1 ? "" : "s"} across ${formatNumber(totalGames)} matches.`
      : "No trend data found."
  };
}

function normalizeComparisonResult(result) {
  const rows = Array.isArray(result.results) ? result.results : [];
  const firstType = rows[0]?.subject_type || "player";
  const subjectType = normalizeQuerySubjectType(firstType);
  const statLabel = result.stat_label || formatStatLabel(result.stat);
  const leader = result.comparison?.leader;
  const difference = result.comparison?.difference;
  const percentageAhead = result.comparison?.percentage_ahead;
  const subjectLabel = Array.isArray(result.subjects) && result.subjects.length
    ? result.subjects.join(" vs ")
    : "Comparison";

  return {
    answer: leader
      ? `${leader} led by ${formatNumber(difference)} ${statLabel.toLowerCase()} in ${result.season}.`
      : `${subjectLabel} comparison ready for ${result.season}.`,
    answerMeta: percentageAhead != null
      ? `${leader} finished ${formatNumber(percentageAhead)}% ahead over the selected season.`
      : "Season totals and per-game rates for each subject.",
    summary: {
      questionType: QUERY_STATUS_LABELS.comparison,
      matchCount: formatNumber(rows.length),
      stat: statLabel,
      status: "Supported"
    },
    parsed: {
      intent_type: "comparison",
      subject_type: subjectType,
      subject_label: subjectLabel,
      stat: result.stat,
      stat_label: statLabel,
      season: result.season
    },
    tableKind: "comparison",
    rows: rows.map((entry) => ({
      subject: entry.subject,
      subject_type: normalizeQuerySubjectType(entry.subject_type),
      games: entry.games,
      total: entry.total,
      average_per_game: entry.average_per_game
    })),
    tableMeta: rows.length
      ? `Showing ${rows.length} compared subject${rows.length === 1 ? "" : "s"} for ${result.season}.`
      : "No comparison data found."
  };
}

function normalizeRecordResult(result) {
  const record = result.record || null;
  const rows = Array.isArray(result.context) ? result.context : [];
  const subjectType = record?.team ? "team" : "player";
  const subjectName = record?.player || record?.team || "--";
  const statLabel = result.stat_label || formatStatLabel(result.stat);
  const scopeLabel = result.scope === "seasonal" && record?.season ? `the ${record.season} season` : "all time";

  return {
    answer: record
      ? `${subjectName} holds the ${scopeLabel} ${statLabel.toLowerCase()} record with ${formatNumber(record.value)}.`
      : `No ${statLabel.toLowerCase()} record was found.`,
    answerMeta: record
      ? `${record.opponent ? `Set against ${record.opponent}` : "Record performance"}${record.round ? ` in round ${record.round}` : ""}.`
      : "No matching record context is available.",
    summary: {
      questionType: QUERY_STATUS_LABELS.record,
      matchCount: formatNumber(rows.length || (record ? 1 : 0)),
      stat: statLabel,
      status: "Supported"
    },
    parsed: {
      intent_type: "record",
      subject_type: subjectType,
      stat: result.stat,
      stat_label: statLabel,
      season: record?.season || null,
      ...(subjectType === "team" ? { team_name: subjectName } : { player_name: subjectName })
    },
    tableKind: "record",
    rows: rows.map((entry) => ({
      rank: entry.rank,
      subject: entry.player || entry.team || "--",
      season: entry.season,
      value: entry.value,
      date: entry.date
    })),
    tableMeta: rows.length
      ? `Showing ${rows.length} top record row${rows.length === 1 ? "" : "s"} for context.`
      : "No record context found."
  };
}

function normalizeCombinationResult(result) {
  const rows = Array.isArray(result.results) ? result.results : [];
  const filters = Array.isArray(result.filters) ? result.filters : [];
  const operator = result.logical_operator || "AND";
  const filterSummary = filters.map((filter) => {
    const statLabel = filter.stat_label || formatStatLabel(filter.stat);
    return `${statLabel} ${filter.operator} ${formatNumber(filter.threshold)}`;
  }).join(` ${operator} `);
  const statSummary = filters.map((filter) => filter.stat_label || formatStatLabel(filter.stat)).join(" + ") || "--";

  return {
    answer: rows.length
      ? `${formatNumber(result.total_matches ?? rows.length)} matches met ${filterSummary}${result.season ? ` in ${result.season}` : ""}.`
      : `No matches met ${filterSummary}${result.season ? ` in ${result.season}` : ""}.`,
    answerMeta: "Each row shows the performance that satisfied the requested stat thresholds.",
    summary: {
      questionType: QUERY_STATUS_LABELS.combination,
      matchCount: formatNumber(result.total_matches ?? rows.length),
      stat: statSummary,
      status: "Supported"
    },
    parsed: {
      intent_type: "combination",
      subject_type: "players",
      subject_label: "Matching players",
      filter_label: filterSummary,
      season: result.season || null,
      stat_label: statSummary
    },
    tableKind: "combination",
    rows: rows.map((entry) => ({
      player: entry.player,
      team: entry.team,
      opponent: entry.opponent,
      season: entry.season,
      date: entry.date,
      matched_stats: filters.map((filter) => {
        const statLabel = filter.stat_label || formatStatLabel(filter.stat);
        const value = entry[filter.stat] ?? entry.value;
        return `${statLabel} ${formatNumber(value)}`;
      }).join(" · ")
    })),
    tableMeta: rows.length
      ? `Showing ${rows.length} matched performance${rows.length === 1 ? "" : "s"}.`
      : "No matching records."
  };
}

function normalizeSupportedResult(result) {
  if (!result || result.status !== "supported") {
    return null;
  }

  switch (result.intent_type) {
    case "trend":
      return normalizeTrendResult(result);
    case "comparison":
      return normalizeComparisonResult(result);
    case "record":
      return normalizeRecordResult(result);
    case "combination":
      return normalizeCombinationResult(result);
    default:
      return normalizeLegacySupportedResult(result);
  }
}

function renderRows(rows, subjectType = "player") {
  if (!Array.isArray(rows) || !rows.length) {
    clearTable("No matching records found.");
    return;
  }

  const normalizedSubjectType = normalizeQuerySubjectType(subjectType);
  clearEmptyTableState(elements.queryRowsBody);
  const fragment = document.createDocumentFragment();
  rows.forEach((entry) => {
    const row = document.createElement("tr");

    let cells;
    if (subjectType === "trend") {
      cells = [
        entry.season != null ? String(entry.season) : "--",
        formatNumber(entry.games),
        formatNumber(entry.total),
        formatNumber(entry.average),
        entry.change || "--"
      ];
    } else if (subjectType === "comparison") {
      cells = [
        entry.subject || "--",
        entry.subject_type === "team" ? "Team" : "Player",
        formatNumber(entry.games),
        formatNumber(entry.total),
        formatNumber(entry.average_per_game)
      ];
    } else if (subjectType === "record") {
      cells = [
        formatNumber(entry.rank),
        entry.subject || "--",
        entry.season != null ? String(entry.season) : "--",
        formatNumber(entry.value),
        formatDate(entry.date)
      ];
    } else if (subjectType === "combination") {
      cells = [
        entry.player || "--",
        entry.team || "--",
        entry.opponent || "--",
        entry.season != null ? String(entry.season) : "--",
        formatDate(entry.date),
        entry.matched_stats || "--"
      ];
    } else if (normalizedSubjectType === "team") {
      cells = [
        entry.squad_name || entry.team_name || "Unknown team",
        entry.opponent || "--",
        entry.season != null ? String(entry.season) : "--",
        formatNumber(entry.round_number),
        formatNumber(entry.total_value),
        formatDate(entry.local_start_time, { includeTime: true })
      ];
    } else {
      const playerCell = document.createElement("td");
      if (entry.player_id) {
        const link = document.createElement("a");
        link.className = "table-link";
        link.href = playerProfileUrl(entry.player_id);
        link.textContent = entry.player_name || "Unknown player";
        playerCell.appendChild(link);
      } else {
        playerCell.textContent = entry.player_name || "Unknown player";
      }

      cells = [
        playerCell,
        entry.squad_name || "--",
        entry.opponent || "--",
        entry.season != null ? String(entry.season) : "--",
        formatNumber(entry.round_number),
        formatNumber(entry.total_value),
        formatDate(entry.local_start_time, { includeTime: true })
      ];
    }

    cells.forEach((cell) => {
      if (cell instanceof HTMLElement) {
        row.appendChild(cell);
      } else {
        const td = document.createElement("td");
        td.textContent = cell;
        row.appendChild(td);
      }
    });

    fragment.appendChild(row);
  });
  elements.queryRowsBody.replaceChildren(fragment);
  syncResponsiveTable(elements.queryRowsBody.closest("table"));
}

function renderUnsupported(result) {
  const reason = result.reason || "That wording is not supported yet.";
  setTableSchema("player");
  setSummaryCards("--", "--", "--", result.status === "ambiguous" ? "Ambiguous" : "Unsupported");
  if (elements.queryPulseSection) {
    elements.queryPulseSection.hidden = false;
  }
  elements.answerHeadline.textContent = reason;
  elements.answerMeta.textContent = "Try one of the working shapes below, or open the builder to assemble it piece by piece.";
  elements.interpretationGrid.replaceChildren();
  if (elements.queryHelpSummary) {
    elements.queryHelpSummary.textContent = result.status === "ambiguous"
      ? "Need a clearer version?"
      : "Try one of these shapes";
  }
  renderQueryState({
    title: result.status === "ambiguous" ? "Tighten the question" : "Use one working question shape",
    description: reason,
    extraParagraphs: Array.isArray(result.candidates) && result.candidates.length
      ? [`Closest matches: ${result.candidates.join(", ")}`]
      : [],
    items: Array.isArray(result.examples) && result.examples.length ? result.examples : FALLBACK_EXAMPLES
  });
  if (elements.queryHelp) {
    elements.queryHelp.hidden = false;
    elements.queryHelp.open = true;
  }

  elements.tableMeta.textContent = "";
  clearTable("Rewrite the question, or open the builder to load matching rows.");
  hideQueryCitation();
}

function renderParserGuidance({ message, confidence = "LOW", examples = FALLBACK_EXAMPLES, builderPrefill = null } = {}) {
  const guidance = message || "That wording does not give the parser a clear subject, stat, and question shape yet.";
  hideErrorBanner();
  showErrorBanner(guidance);
  if (hasBuilderPrefill(builderPrefill)) {
    showBuilderButton(builderPrefill);
    openBuilderModal(builderPrefill);
  }
  setTableSchema("player");
  setSummaryCards("--", "--", "--", PARSER_CONFIDENCE_COPY[confidence] || "Need help");
  if (elements.queryPulseSection) {
    elements.queryPulseSection.hidden = false;
  }
  elements.answerHeadline.textContent = "The parser needs a clearer question.";
  elements.answerMeta.textContent = "Start with the subject, then the stat, then the kind of answer you want. You can also open the builder.";
  elements.interpretationGrid.replaceChildren();
  renderQueryState({
    title: confidence === "LOW" ? "Try one of these working questions" : "Tighten the question",
    description: guidance,
    items: Array.isArray(examples) && examples.length ? examples : FALLBACK_EXAMPLES
  });
  if (elements.queryHelp) {
    elements.queryHelp.hidden = false;
    elements.queryHelp.open = true;
  }
  elements.tableMeta.textContent = "";
  clearTable("Pick a working example, or open the builder to keep going.");
  hideQueryCitation();
}

function renderResult(result) {
  hideErrorBanner();

  if (!result) {
    renderUnsupported({});
    return;
  }

  if (result.status === "parse_help_needed") {
    const message = result.error_message || "I couldn't match all the parts of that question. Try rephrasing it, or open the builder to fill in the missing pieces.";
    showErrorBanner(message);

    const actions = elements.errorBannerActions;
    if (actions) {
      actions.replaceChildren();
    }

    if (result.suggestion) {
      if (actions) {
        const suggestionLink = document.createElement("button");
        suggestionLink.type = "button";
        suggestionLink.className = "button button--ghost";
        suggestionLink.textContent = `Try: "${result.suggestion}"`;
        suggestionLink.addEventListener("click", () => {
          rephraseSuggestion(result.suggestion);
        });

        actions.appendChild(suggestionLink);
      }
    }

    if (result.builder_prefill) {
      showBuilderButton(result.builder_prefill);
      openBuilderModal(result.builder_prefill);
    }

    setTableSchema("player");
    setSummaryCards("--", "--", "--", "Help needed");
    if (elements.queryPulseSection) {
      elements.queryPulseSection.hidden = false;
    }
    if (elements.queryHelp) {
      elements.queryHelp.hidden = false;
      elements.queryHelp.open = true;
    }
    elements.answerHeadline.textContent = "The parser needs a clearer version of that question.";
    elements.answerMeta.textContent = "Try the suggested rewrite, or open the builder if you want to build it piece by piece.";
    elements.interpretationGrid.replaceChildren();
    clearTable("No rows yet. Try the rewrite, or open the builder to continue.");
    hideQueryCitation();
    return;
  }

  if (result.status !== "supported") {
    renderUnsupported(result || {});
    return;
  }

  const normalized = normalizeSupportedResult(result);
  const parsed = normalized?.parsed || {};
  const tableKind = normalized?.tableKind || normalizeQuerySubjectType(parsed.subject_type);

  setSummaryCards(
    normalized?.summary?.questionType || "--",
    normalized?.summary?.matchCount || "--",
    normalized?.summary?.stat || "--",
    normalized?.summary?.status || "Supported"
  );
  if (elements.queryPulseSection) {
    elements.queryPulseSection.hidden = false;
  }
  elements.answerHeadline.textContent = normalized?.answer || "No answer.";
  elements.answerMeta.textContent = normalized?.answerMeta || "Transparent answer with the matching evidence table below.";
  if (elements.queryHelp) {
    elements.queryHelp.hidden = false;
    elements.queryHelp.open = false;
  }
  setTableSchema(tableKind);
  renderInterpretation(parsed);
  renderRows(normalized?.rows || [], tableKind);
  elements.tableMeta.textContent = normalized?.tableMeta || "No matching records.";
  renderQueryCitation({
    question: elements.questionInput.value.trim().slice(0, 120),
    segments: [
      normalized?.summary?.questionType ? `Shape: ${normalized.summary.questionType}` : "",
      normalized?.summary?.stat ? `Stat: ${normalized.summary.stat}` : "",
      normalized?.tableMeta || ""
    ].filter(Boolean),
    visible: true
  });
}

function updateUrl(question) {
  const url = new URL(window.location.href);
  if (question) {
    url.searchParams.set("q", question);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState({}, "", url);
}

let questionRunning = false;

async function tryParseQuestion(question) {
  try {
    const response = await fetch(buildUrl("/query/parse"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      return { success: false, error: "Parser request failed", confidence: "LOW" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message || "Parse request error", confidence: "LOW" };
  }
}

async function runQuestion(question, source = "manual") {
  if (questionRunning) return;

  const trimmed = question.trim();
  if (!trimmed) {
    showStatus("Enter a question first.", "error");
    setIdleState();
    return;
  }

  if (containsTemplatePlaceholders(trimmed)) {
    showStatus("Replace the bracketed placeholders before running the question.", "error", { kicker: "Template incomplete" });
    updateQuestionComposerState(trimmed);
    return;
  }

  hideErrorBanner();

  questionRunning = true;
  const submitBtn = elements.submitButton;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.textContent = "Running…";
  }

  showLoadingStatus(QUERY_LOADING_MESSAGES, "Reading archive");
  if (elements.queryPulseSection) {
    elements.queryPulseSection.hidden = false;
  }
  setSummaryCards("…", "…", "…", "Running");
  trackEvent("ask_stats_submitted", {
    source,
    question_length_bucket: bucketCount(trimmed.length, [0, 20, 40, 80, 120, 180])
  });

  try {
    const parseResult = await tryParseQuestion(trimmed);

    if (!parseResult.success) {
      if (parseResult.status === "parse_help_needed") {
        renderResult(parseResult);
        updateUrl(trimmed);
        trackEvent("ask_stats_completed", {
          source,
          outcome: "parse_help_needed",
          parser_confidence: parseResult.confidence || "LOW"
        });
      showStatus("Use the builder or tighten the wording.", "error", {
          kicker: parseResult.confidence === "LOW" ? "Prompt suggested" : "Need help"
        });
        return;
      }

      renderParserGuidance({
        message: parseResult.error_message || parseResult.error || "We couldn't match that wording.",
        confidence: parseResult.confidence || "LOW",
        builderPrefill: hasBuilderPrefill(parseResult.builder_prefill) ? parseResult.builder_prefill : null
      });
      updateUrl(trimmed);
      trackEvent("ask_stats_completed", {
        source,
        outcome: "parse_failed",
        parser_confidence: parseResult.confidence || "LOW"
      });
      showStatus("Use a prompt or tighten the wording.", "error", { kicker: "Need help" });
      return;
    }

    if (parseResult.confidence === "LOW") {
      renderParserGuidance({
        message: "We found some of it, but not enough to run that question safely yet.",
        confidence: "LOW",
        builderPrefill: hasBuilderPrefill(parseResult.builder_prefill) ? parseResult.builder_prefill : null
      });
      updateUrl(trimmed);
      trackEvent("ask_stats_completed", {
        source,
        outcome: "parse_low_confidence",
        parser_confidence: "LOW"
      });
      showStatus("Use a prompt or tighten the wording.", "error", { kicker: "Prompt suggested" });
      return;
    }

    const result = await fetchJson("/query", { question: trimmed, limit: 12 });
    renderResult(result);
    updateUrl(trimmed);
    trackEvent("ask_stats_completed", {
      source,
      outcome: result.status === "supported" ? "supported" : (result.status || "unsupported"),
      question_type: result.summary?.question_type || result.parsed?.intent_type || "unknown",
      stat: result.parsed?.stat || result.summary?.stat_label || "unknown",
      subject_type: result.parsed?.subject_type || "unknown",
      parser_confidence: parseResult.confidence || "unknown",
      has_opponent_filter: Boolean(result.parsed?.opponent_name),
      season_count_bucket: Array.isArray(result.parsed?.seasons)
        ? bucketCount(result.parsed.seasons.length, [0, 1, 2, 3, 5])
        : "all_or_unspecified",
      match_count_bucket: bucketCount(result.summary?.match_count, [0, 1, 2, 5, 10, 25, 50, 100])
    });
    showStatus(
      result.status === "supported"
        ? (parseResult.confidence === "MEDIUM"
          ? "Answer ready. Double-check the wording if the match set looks off."
          : "Answer ready.")
        : (result.status === "parse_help_needed" ? "I need clarification." : "That wording is not supported yet."),
      result.status === "supported" ? "success" : "error",
      result.status === "supported"
        ? {
          kicker: parseResult.confidence === "MEDIUM" ? "Medium confidence" : "Ready",
          autoHideMs: parseResult.confidence === "MEDIUM" ? 3200 : 2200
        }
        : { kicker: result.status === "parse_help_needed" ? "Need help" : "Not supported yet" }
    );
  } catch (error) {
    renderUnsupported({
      status: "unsupported",
      reason: error.message || "Something went wrong.",
      examples: [
        "How many times has Fowler scored 50 points or more against the Vixens?",
        "What is Liz Watson's highest goal assist total against the Firebirds?",
        "Which teams had the lowest general play turnovers in 2025?"
      ]
    });
    trackEvent("ask_stats_completed", {
      source,
      outcome: "error"
    });
    showStatus(error.message || "Something went wrong. Try again.", "error", { kicker: "Question interrupted" });
  } finally {
    questionRunning = false;
    if (submitBtn) {
      submitBtn.removeAttribute("aria-busy");
      submitBtn.textContent = submitButtonDefaultLabel;
    }
    updateQuestionComposerState(elements.questionInput.value);
  }
}

// ============================================================================
// Builder Modal Functions
// ============================================================================

function resetBuilderState() {
  const existingSeasons = Array.isArray(builderState.availableSeasons) ? [...builderState.availableSeasons] : [];
  const existingSubjects = Array.isArray(builderState.availableSubjects) ? [...builderState.availableSubjects] : [];
  const existingTeams = Array.isArray(builderState.availableTeams) ? [...builderState.availableTeams] : [];
  builderState = {
    currentStep: 1,
    shape: null,
    subjects: [],
    stat: null,
    filters: [],
    logicalOperator: "AND",
    timeframe: null,
    seasonSingle: null,
    seasonRange: null,
    availableSeasons: existingSeasons,
    availableSubjects: existingSubjects,
    availableTeams: existingTeams
  };
}

function showBuilderStep(stepNum) {
  const steps = [
    builderElements.stepShape,
    builderElements.stepSubjects,
    builderElements.stepStat,
    builderElements.stepTimeframe
  ];

  steps.forEach((step, idx) => {
    if (step) {
      step.hidden = idx !== stepNum - 1;
    }
  });

  builderState.currentStep = stepNum;
  if (stepNum === 2) {
    updateBuilderSubjectHint();
    renderBuilderSubjectChips();
    renderBuilderSubjectOptions();
  }
  if (stepNum === 3) {
    renderBuilderStatOptions();
  }
  updateBuilderFooter();
  updateBuilderPreview();
}

function updateBuilderSubjectHint() {
  if (!builderElements.subjectHint) return;
  builderElements.subjectHint.textContent = builderState.shape === "comparison"
    ? "Search and pick two players or teams to compare."
    : builderState.shape === "record" || builderState.shape === "combination"
      ? "Subjects are optional for this question shape."
      : "Search for a player or team name.";
}

function updateBuilderFooter() {
  const isFirstStep = builderState.currentStep === 1;
  const isLastStep = builderState.currentStep === BUILDER_STEP_COUNT;

  if (builderElements.stepProgress) {
    builderElements.stepProgress.textContent = `Step ${builderState.currentStep} of ${BUILDER_STEP_COUNT}`;
  }
  if (builderElements.prevBtn) {
    builderElements.prevBtn.hidden = isFirstStep;
  }
  if (builderElements.nextBtn) {
    builderElements.nextBtn.hidden = isLastStep;
  }
  if (builderElements.submitBtn) {
    builderElements.submitBtn.hidden = !isLastStep;
  }
}

function formatBuilderTimeframePhrase() {
  if (!builderState.timeframe) {
    return "";
  }
  if (builderState.timeframe === "alltime") {
    return "all-time";
  }
  if (builderState.timeframe === "single" && builderState.seasonSingle) {
    return `in ${builderState.seasonSingle}`;
  }
  if (builderState.timeframe === "range" && builderState.seasonRange?.from && builderState.seasonRange?.to) {
    return `from ${builderState.seasonRange.from} to ${builderState.seasonRange.to}`;
  }
  return "";
}

function buildBuilderPreviewText() {
  const shape = builderState.shape;
  if (!shape) {
    return "Your question will appear here as you build it.";
  }

  const subjects = builderState.subjects || [];
  const subjectPhrase = subjects.length
    ? (subjects.length === 2 ? `${subjects[0]} and ${subjects[1]}` : subjects[0])
    : "[subject]";
  const statPhrase = builderState.stat ? formatStatLabel(builderState.stat) : "[stat]";
  const timeframePhrase = formatBuilderTimeframePhrase();
  const timeframeSuffix = timeframePhrase ? ` ${timeframePhrase}` : "";

  switch (shape) {
    case "count":
      return `How many times has ${subjectPhrase} recorded ${statPhrase}${timeframeSuffix}?`;
    case "highest":
      return `What is ${subjectPhrase}'s highest ${statPhrase}${timeframeSuffix}?`;
    case "lowest":
      return `What is ${subjectPhrase}'s lowest ${statPhrase}${timeframeSuffix}?`;
    case "comparison":
      return `Compare ${subjectPhrase} on ${statPhrase}${timeframeSuffix}.`;
    case "trend":
      return `${subjectPhrase} ${statPhrase} across seasons${timeframeSuffix}.`;
    case "list":
      return `Which players or teams had ${statPhrase}${timeframeSuffix}?`;
    case "record":
      return `What is the all-time record for ${statPhrase}?`;
    case "combination":
      return `Combine conditions on ${statPhrase}${timeframeSuffix}.`;
    default:
      return BUILDER_SHAPE_PREVIEW[shape] || "Your question will appear here as you build it.";
  }
}

function updateBuilderPreview() {
  if (!builderElements.questionPreview) return;
  builderElements.questionPreview.textContent = buildBuilderPreviewText();
}

function validateBuilderStep(stepNum) {
  switch (stepNum) {
    case 1:
      return !!builderState.shape;
    case 2:
      if (builderState.shape === "combination" || builderState.shape === "record") {
        return true;
      }
      if ((!builderState.subjects || !builderState.subjects.length) && builderElements.subjectSearch?.value.trim()) {
        builderState.subjects = builderState.shape === "comparison"
          ? builderElements.subjectSearch.value.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 2)
          : [builderElements.subjectSearch.value.trim()];
        renderBuilderSubjectChips();
        updateBuilderPreview();
      }
      if (builderState.shape === "comparison") {
        return builderState.subjects && builderState.subjects.length === 2;
      }
      return builderState.subjects && builderState.subjects.length > 0;
    case 3:
      if (builderState.shape === "combination") {
        return true;
      }
      return !!builderState.stat;
    case 4:
      if (!builderState.timeframe) return false;
      if (builderState.timeframe === "single") {
        return !!builderState.seasonSingle;
      }
      if (builderState.timeframe === "range") {
        return !!(builderState.seasonRange && builderState.seasonRange.from && builderState.seasonRange.to);
      }
      return true;
    default:
      return false;
  }
}

function getValidationErrorMessage(step) {
  switch (step) {
    case 1: return "Pick a question shape to continue.";
    case 2: return builderState.shape === "comparison"
      ? "Pick two subjects to compare."
      : "Pick at least one subject to continue.";
    case 3: return "Pick a stat to continue.";
    case 4: return "Pick a timeframe to continue.";
    default: return "Complete this step to continue.";
  }
}

function showBuilderValidationError(message) {
  const errorRegion = document.getElementById("builder-validation-errors");
  if (!errorRegion || !message) return;
  errorRegion.textContent = message;
  errorRegion.hidden = false;
  setTimeout(() => {
    errorRegion.textContent = "";
    errorRegion.hidden = true;
  }, 5000);
}

function nextBuilderStep() {
  if (!validateBuilderStep(builderState.currentStep)) {
    showBuilderValidationError(getValidationErrorMessage(builderState.currentStep));
    return;
  }
  if (builderState.currentStep < BUILDER_STEP_COUNT) {
    showBuilderStep(builderState.currentStep + 1);
  }
}

function prevBuilderStep() {
  if (builderState.currentStep > 1) {
    showBuilderStep(builderState.currentStep - 1);
  }
}

function getMatchDerivedTeamStats() {
  return window.NetballStatsUI?.MATCH_DERIVED_TEAM_STATS || [
    "wins",
    "losses",
    "draws",
    "pointsAgainst",
    "ladderPosition"
  ];
}

function builderSubjectsAreTeams() {
  const subjects = (builderState.subjects || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
  if (!subjects.length) {
    return false;
  }
  const teamNames = new Set(
    (builderState.availableTeams || [])
      .map((team) => String(team?.squad_name || team || "").trim().toLowerCase())
      .filter(Boolean)
  );
  if (!teamNames.size) {
    return false;
  }
  return subjects.every((subject) => {
    if (teamNames.has(subject)) {
      return true;
    }
    for (const teamName of teamNames) {
      if (teamName.includes(subject) || subject.includes(teamName.replace(/^.*\b/, ""))) {
        // Allow short nicknames like "Vixens" against "Melbourne Vixens"
        const tokens = teamName.split(/\s+/);
        if (tokens.some((token) => token === subject)) {
          return true;
        }
      }
    }
    return false;
  });
}

function getStatsList() {
  const stats = window.NetballStatsUI?.STAT_LABEL_OVERRIDES || {};
  const keys = Object.keys(stats);
  const matchDerived = new Set(getMatchDerivedTeamStats());
  if (builderSubjectsAreTeams()) {
    return keys;
  }
  return keys.filter((key) => !matchDerived.has(key));
}

function getSuggestedSubjects() {
  const teamNames = (builderState.availableTeams || [])
    .map((team) => String(team?.squad_name || team || "").trim())
    .filter(Boolean);
  const playerNames = (builderState.availableSubjects || [])
    .filter((name) => !teamNames.includes(name));
  const suggestedPlayers = BUILDER_SUGGESTED_PLAYERS.filter((name) => playerNames.includes(name));
  const extraPlayers = playerNames.filter((name) => !suggestedPlayers.includes(name)).slice(0, 4);
  return [...new Set([...teamNames.slice(0, 6), ...suggestedPlayers, ...extraPlayers])];
}

function getSuggestedStats() {
  const stats = getStatsList();
  const common = BUILDER_COMMON_STATS.filter((key) => stats.includes(key));
  const remainder = stats.filter((key) => !common.includes(key));
  return [...common, ...remainder.slice(0, 6)];
}

function renderBuilderShapeOptions() {
  const radios = builderElements.stepShape.querySelectorAll('input[name="shape"]');

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      builderState.shape = radio.value;
      updateBuilderSubjectHint();
      updateBuilderPreview();
      nextBuilderStep();
    });
  });
}

function renderBuilderSubjectChips() {
  if (!builderElements.subjectChips) return;
  builderElements.subjectChips.replaceChildren();

  (builderState.subjects || []).forEach((subject) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "builder-subject-chip";
    chip.textContent = subject;
    chip.setAttribute("aria-label", `Remove ${subject}`);
    chip.addEventListener("click", () => {
      builderState.subjects = builderState.subjects.filter((entry) => entry !== subject);
      renderBuilderSubjectChips();
      renderBuilderSubjectOptions();
      updateBuilderPreview();
    });
    builderElements.subjectChips.appendChild(chip);
  });
}

function selectBuilderSubject(subject) {
  const isComparison = builderState.shape === "comparison";
  if (isComparison) {
    if (!builderState.subjects.includes(subject)) {
      if (builderState.subjects.length >= 2) {
        builderState.subjects = [builderState.subjects[1], subject];
      } else {
        builderState.subjects.push(subject);
      }
    }
  } else {
    builderState.subjects = [subject];
  }
  if (builderElements.subjectSearch) {
    builderElements.subjectSearch.value = "";
  }
  renderBuilderSubjectChips();
  renderBuilderSubjectOptions();
  updateBuilderPreview();
}

function renderBuilderSubjectOptions() {
  if (!builderElements.subjectList) return;

  const query = (builderElements.subjectSearch?.value || "").trim().toLowerCase();
  const allSubjects = builderState.availableSubjects || [];
  const pool = query
    ? allSubjects.filter((subject) => subject.toLowerCase().includes(query))
    : getSuggestedSubjects();
  const matched = pool.slice(0, query ? 12 : 10);

  builderElements.subjectList.replaceChildren();

  if (!matched.length) {
    const empty = document.createElement("p");
    empty.className = "builder-picker-empty";
    empty.textContent = query ? "No matching players or teams." : "Start typing to search the archive.";
    builderElements.subjectList.appendChild(empty);
    return;
  }

  matched.forEach((subject) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "builder-picker-row";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", builderState.subjects.includes(subject) ? "true" : "false");
    button.textContent = subject;
    if (builderState.subjects.includes(subject)) {
      button.classList.add("is-selected");
    }
    button.addEventListener("click", () => selectBuilderSubject(subject));
    builderElements.subjectList.appendChild(button);
  });
}

function selectBuilderStat(stat) {
  builderState.stat = stat;
  if (builderElements.statSearch) {
    builderElements.statSearch.value = formatStatLabel(stat);
  }
  renderBuilderStatOptions();
  updateBuilderPreview();
}

function renderBuilderStatOptions() {
  if (!builderElements.statList) return;

  const stats = getStatsList();
  const query = (builderElements.statSearch?.value || "").trim().toLowerCase();
  const pool = query
    ? stats.filter((stat) => stat.toLowerCase().includes(query) || formatStatLabel(stat).toLowerCase().includes(query))
    : getSuggestedStats();
  const matched = pool.slice(0, query ? 12 : 10);

  builderElements.statList.replaceChildren();

  if (!matched.length) {
    const empty = document.createElement("p");
    empty.className = "builder-picker-empty";
    empty.textContent = query ? "No matching stats." : "Start typing to search stats.";
    builderElements.statList.appendChild(empty);
    return;
  }

  matched.forEach((stat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "builder-picker-row";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", builderState.stat === stat ? "true" : "false");
    button.textContent = formatStatLabel(stat);
    if (builderState.stat === stat) {
      button.classList.add("is-selected");
    }
    button.addEventListener("click", () => selectBuilderStat(stat));
    builderElements.statList.appendChild(button);
  });
}

function setupBuilderFilterListeners() {
  const filterCheckboxes = builderElements.form.querySelectorAll('[name^="filter-"]');
  
  filterCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const filterType = checkbox.value;
      
      if (checkbox.checked) {
        const filterInput = document.getElementById(`builder-filter-${filterType}`);
        if (filterInput) filterInput.hidden = false;
      } else {
        const filterInput = document.getElementById(`builder-filter-${filterType}`);
        if (filterInput) {
          filterInput.hidden = true;
          // Clear value
          const input = filterInput.querySelector("input, select");
          if (input) input.value = "";
        }
        delete builderState.filters[filterType];
      }
    });
  });
}

function setupBuilderTimeframeListeners() {
  const timeframeRadios = builderElements.form.querySelectorAll('[name="timeframe"]');

  timeframeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      builderState.timeframe = radio.value;

      if (builderElements.timeframeSingle) {
        builderElements.timeframeSingle.hidden = radio.value !== "single";
      }
      if (builderElements.timeframeRange) {
        builderElements.timeframeRange.hidden = radio.value !== "range";
      }
      updateBuilderPreview();
    });
  });

  if (builderElements.seasonSingle) {
    builderElements.seasonSingle.addEventListener("change", () => {
      builderState.seasonSingle = builderElements.seasonSingle.value ? parseInt(builderElements.seasonSingle.value, 10) : null;
      updateBuilderPreview();
    });
  }

  if (builderElements.seasonFrom) {
    builderElements.seasonFrom.addEventListener("change", () => {
      if (!builderState.seasonRange) builderState.seasonRange = {};
      builderState.seasonRange.from = builderElements.seasonFrom.value ? parseInt(builderElements.seasonFrom.value, 10) : null;
      updateBuilderPreview();
    });
  }
  if (builderElements.seasonTo) {
    builderElements.seasonTo.addEventListener("change", () => {
      if (!builderState.seasonRange) builderState.seasonRange = {};
      builderState.seasonRange.to = builderElements.seasonTo.value ? parseInt(builderElements.seasonTo.value, 10) : null;
      updateBuilderPreview();
    });
  }
}

function populateBuilderSeasonSelects() {
  const seasons = builderState.availableSeasons.sort((a, b) => b - a); // Descending

  [builderElements.seasonSingle, builderElements.seasonFrom, builderElements.seasonTo].forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    select.replaceChildren();

    if (select === builderElements.seasonSingle) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Select season…";
      select.appendChild(option);
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = select.id.includes("from") ? "From season…" : "To season…";
      select.appendChild(option);
    }

    seasons.forEach((season) => {
      const option = document.createElement("option");
      option.value = season;
      option.textContent = season;
      select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
  });
}

async function submitBuilderQuery() {
  if (!validateBuilderStep(BUILDER_STEP_COUNT)) {
    showBuilderValidationError(getValidationErrorMessage(BUILDER_STEP_COUNT));
    return;
  }

  const formData = {
    shape: builderState.shape,
    subjects: builderState.subjects,
    stat: builderState.stat,
    filters: builderState.filters,
    logical_operator: builderState.logicalOperator,
    timeframe: builderState.timeframe
  };

  if (builderState.timeframe === "single") {
    formData.seasons = builderState.seasonSingle ? [builderState.seasonSingle] : [];
  } else if (builderState.timeframe === "range") {
    const from = builderState.seasonRange?.from || 0;
    const to = builderState.seasonRange?.to || 0;
    formData.seasons = [];
    for (let i = from; i <= to; i++) {
      formData.seasons.push(i);
    }
  } else {
    formData.seasons = null;
  }

  try {
    showLoadingStatus(QUERY_LOADING_MESSAGES, "Building query");

    const requestBody = {
      builder_source: true,
      shape: formData.shape,
      subjects: formData.subjects,
      subject: formData.subjects?.[0] || null,
      stat: formData.stat,
      filters: formData.filters,
      logical_operator: formData.logical_operator,
      seasons: formData.seasons,
      limit: 12
    };

    const result = await fetchJson("/query", requestBody);

    renderResult(result);
    closeBuilderModal();
  } catch (error) {
    renderUnsupported({
      status: "error",
      reason: error.message || "Builder query failed"
    });
    showStatus(error.message || "Builder query failed.", "error");
  }
}

function closeBuilderModal() {
  if (builderElements.modal) {
    builderElements.modal.close();
  }
}

function openBuilderModalUI(prefill = {}) {
  if (!builderElements.modal) return;

  resetBuilderState();
  const prefillSubjects = Array.isArray(prefill.subjects)
    ? prefill.subjects
    : (prefill.subject ? [prefill.subject] : []);
  const prefillSeasons = Array.isArray(prefill.seasons)
    ? prefill.seasons
    : (prefill.seasons ? [prefill.seasons] : []);

  // Prefill if provided
  if (prefill.shape) {
    builderState.shape = prefill.shape;
    const shapeRadio = builderElements.stepShape.querySelector(`input[value="${prefill.shape}"]`);
    if (shapeRadio) shapeRadio.checked = true;
  }

  if (prefillSubjects.length) {
    builderState.subjects = [...prefillSubjects];
  }

  if (prefill.stat) {
    builderState.stat = prefill.stat;
  }

  if (prefill.filters && Array.isArray(prefill.filters)) {
    builderState.filters = [...prefill.filters];
  }

  if (prefill.logical_operator) {
    builderState.logicalOperator = prefill.logical_operator;
  }

  if (prefill.scope === "all_time" || prefill.scope === "alltime") {
    builderState.timeframe = "alltime";
  }

  if (prefillSeasons.length) {
    if (prefillSeasons.length === 1) {
      builderState.timeframe = "single";
      builderState.seasonSingle = prefillSeasons[0];
    } else {
      builderState.timeframe = "range";
      builderState.seasonRange = {
        from: Math.min(...prefillSeasons),
        to: Math.max(...prefillSeasons)
      };
    }
  }

  if (builderElements.subjectSearch) {
    builderElements.subjectSearch.value = "";
  }
  if (builderElements.statSearch && builderState.stat) {
    builderElements.statSearch.value = formatStatLabel(builderState.stat);
  }

  populateBuilderSeasonSelects();
  updateBuilderSubjectHint();
  renderBuilderSubjectChips();
  renderBuilderSubjectOptions();
  renderBuilderStatOptions();

  if (builderElements.seasonSingle && builderState.seasonSingle) {
    builderElements.seasonSingle.value = String(builderState.seasonSingle);
  }
  if (builderElements.seasonFrom && builderState.seasonRange?.from) {
    builderElements.seasonFrom.value = String(builderState.seasonRange.from);
  }
  if (builderElements.seasonTo && builderState.seasonRange?.to) {
    builderElements.seasonTo.value = String(builderState.seasonRange.to);
  }
  if (builderElements.timeframeSingle) {
    builderElements.timeframeSingle.hidden = builderState.timeframe !== "single";
  }
  if (builderElements.timeframeRange) {
    builderElements.timeframeRange.hidden = builderState.timeframe !== "range";
  }
  if (builderElements.form) {
    const timeframeRadio = builderElements.form.querySelector(`[name="timeframe"][value="${builderState.timeframe}"]`);
    if (timeframeRadio) {
      timeframeRadio.checked = true;
    }
  }

  const initialStep = !builderState.shape
    ? 1
    : (!validateBuilderStep(2) ? 2
      : (!validateBuilderStep(3) ? 3
        : (!validateBuilderStep(4) ? 4 : 4)));
  showBuilderStep(initialStep);
  updateBuilderPreview();
  builderElements.modal.showModal();
}

function setupBuilderEventListeners() {
  if (!builderElements.modal) return;

  // Close button
  if (builderElements.closeBtn) {
    builderElements.closeBtn.addEventListener("click", closeBuilderModal);
  }

  // Navigation buttons
  if (builderElements.nextBtn) {
    builderElements.nextBtn.addEventListener("click", nextBuilderStep);
  }
  if (builderElements.prevBtn) {
    builderElements.prevBtn.addEventListener("click", prevBuilderStep);
  }

  // Form submission
  if (builderElements.form) {
    builderElements.form.addEventListener("submit", (e) => {
      e.preventDefault();
      void submitBuilderQuery();
    });
  }

  // Subject search
  if (builderElements.subjectSearch) {
    builderElements.subjectSearch.addEventListener("input", renderBuilderSubjectOptions);
  }

  // Stat search
  if (builderElements.statSearch) {
    builderElements.statSearch.addEventListener("input", () => {
      const query = builderElements.statSearch.value.trim().toLowerCase();
      const stats = getStatsList();
      const exact = stats.find((stat) => formatStatLabel(stat).toLowerCase() === query);
      if (exact) {
        builderState.stat = exact;
      } else if (builderState.stat && !query) {
        builderState.stat = null;
      }
      renderBuilderStatOptions();
      updateBuilderPreview();
    });
  }

  // Shape options
  renderBuilderShapeOptions();

  // Filters
  setupBuilderFilterListeners();

  // Timeframe
  setupBuilderTimeframeListeners();

  // Listen for custom event from error banner
  window.addEventListener("open-builder-modal", (event) => {
    const prefill = event.detail?.prefill || {};
    openBuilderModalUI(prefill);
  });

  // Close modal on Escape
  builderElements.modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeBuilderModal();
    }
  });
}

async function loadBuilderMetadata(meta) {
  if (meta.seasons && Array.isArray(meta.seasons)) {
    builderState.availableSeasons = meta.seasons;
    populateBuilderSeasonSelects();
  }
  if (Array.isArray(meta.teams)) {
    builderState.availableTeams = meta.teams;
  }
  const teamNames = (meta.teams || []).map((team) => team.squad_name).filter(Boolean);
  if (meta.players && Array.isArray(meta.players)) {
    builderState.availableSubjects = [...new Set([...teamNames, ...meta.players])];
  } else if (meta.subjects && Array.isArray(meta.subjects)) {
    builderState.availableSubjects = [...new Set([...teamNames, ...meta.subjects])];
  } else if (teamNames.length) {
    builderState.availableSubjects = teamNames;
  }
}

async function init() {
  setIdleState();

  try {
    const meta = await getMeta({ retries: 1 });
    applyMetaConfig(meta);
    renderMeta(meta);
    await loadBuilderMetadata(meta);
  } catch (error) {
    elements.querySeasonSummary.textContent = "Archive metadata is unavailable right now. Questions may still work.";
    if (elements.queryHeroAside) {
      elements.queryHeroAside.hidden = false;
    }
    try {
      await loadBuilderMetadata({});
    } catch (builderError) {
      console.error("Failed to load builder metadata:", builderError);
    }
  }

  // Initialize builder modal
  setupBuilderEventListeners();

  const params = new URLSearchParams(window.location.search);
  const initialQuestion = params.get("q");
  if (initialQuestion) {
    applyQuestionText(initialQuestion, { focus: false });
    await runQuestion(initialQuestion, "url");
    return;
  }

  updateQuestionComposerState(elements.questionInput.value);
}

elements.queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runQuestion(elements.questionInput.value, "manual");
});

elements.questionInput.addEventListener("input", () => {
  updateQuestionComposerState(elements.questionInput.value);
});

elements.clearQuestion.addEventListener("click", () => {
  const previousQuestion = elements.questionInput.value || "";
  showStatus("");
  updateUrl("");
  applyQuestionText("", { focus: true });
  setIdleState();
  trackEvent("ask_stats_cleared", {
    previous_question_length_bucket: bucketCount(previousQuestion.length, [0, 20, 40, 80, 120, 180])
  });
});

if (elements.openBuilderTrigger) {
  elements.openBuilderTrigger.addEventListener("click", () => {
    openBuilderModal({});
  });
}

if (elements.queryTemplateStrip) {
  elements.queryTemplateStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template]");
    if (!button) {
      return;
    }

    const template = button.getAttribute("data-template") || "";
    applyQuestionText(template);
    trackEvent("ask_stats_template_selected", {
      template: button.querySelector(".query-template-button__label")?.textContent || "template"
    });
  });
}

elements.exampleStrip.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-example]");
  if (!button) {
    return;
  }

  const example = button.getAttribute("data-example") || "";
  applyQuestionText(example, { focus: false });
  await runQuestion(example, "example");
});

bindSurfaceCitationCopy(
  elements.queryCitationCopy,
  buildQueryCitationText,
  {
    onSuccess: () => showStatus("Citation copied.", "success", { autoHideMs: 2200 }),
    onError: () => showStatus("Couldn't copy citation.", "error", { kicker: "Copy failed" })
  }
);

void init();
