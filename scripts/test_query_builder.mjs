import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

class MockElement {}

class ElementStub extends MockElement {
  constructor(id = "") {
    super();
    this.id = id;
    this.textContent = "";
    this.hidden = false;
    this.open = false;
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.className = "";
    this.parentElement = null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  append(...items) {
    items.forEach((item) => {
      if (item instanceof ElementStub) {
        this.appendChild(item);
      } else {
        const textNode = new ElementStub();
        textNode.textContent = String(item);
        this.appendChild(textNode);
      }
    });
  }

  replaceChildren(...items) {
    this.children = [];
    items.forEach((item) => this.appendChild(item));
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  addEventListener() {}
  removeAttribute(name) { this.attributes.delete(name); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  focus() {}
  setSelectionRange() {}
  close() { this.open = false; }
  showModal() { this.open = true; }
  closest() { return new ElementStub("closest"); }
  remove() {}
}

const ids = [
  "api-base", "hero-season-range", "query-season-summary", "query-status", "query-form",
  "query-step-shape", "query-step-compose", "query-step-run", "query-template-strip",
  "query-runway-hint", "question-input", "question-character-count", "clear-question",
  "example-strip", "summary-question-type", "summary-match-count", "summary-stat",
  "summary-status", "answer-headline", "answer-meta", "interpretation-grid", "query-help",
  "query-help-summary", "query-state", "table-meta", "query-table", "query-table-caption",
  "query-table-head", "query-rows-body", "error-banner", "error-banner-message",
  "error-banner-actions", "query-builder-modal", "builder-form", "builder-next", "builder-prev",
  "builder-submit", "builder-add-subject", "builder-step-shape", "builder-step-subjects",
  "builder-step-stat", "builder-step-filters", "builder-step-timeframe", "builder-subject-search",
  "builder-subject-list", "builder-stat-search", "builder-stat-list", "builder-filter-opponent",
  "builder-filter-location", "builder-filter-games", "builder-timeframe-single",
  "builder-timeframe-range", "builder-season-single", "builder-season-from", "builder-season-to",
  "builder-validation-errors"
];

const elements = Object.fromEntries(ids.map((id) => [id, new ElementStub(id)]));
elements["query-form"].querySelector = () => new ElementStub("submit-button");
elements["example-strip"].querySelectorAll = () => [];
elements["query-template-strip"].querySelectorAll = () => [];
elements["builder-form"].querySelectorAll = () => [];
elements["builder-step-shape"].querySelector = () => null;
elements["error-banner-actions"].querySelector = () => null;

const documentStub = {
  getElementById(id) {
    return elements[id] || new ElementStub(id);
  },
  querySelector() {
    return new ElementStub("query-selector");
  },
  createElement(tagName) {
    return new ElementStub(tagName);
  },
  createDocumentFragment() {
    return new ElementStub("fragment");
  }
};

const fetchCalls = [];

const context = {
  console,
  document: documentStub,
  window: {
    location: { href: "https://example.com/query/", search: "" },
    history: { replaceState() {} },
    addEventListener() {},
    dispatchEvent(event) {
      if (event.type === "open-builder-modal") {
        context.window.__openBuilderModal(event.detail?.prefill || {});
      }
    },
    NETBALL_STATS_CONFIG: {},
    NetballStatsUI: {
      buildUrl: (input) => input,
      fetchJson: async (url, payload) => {
        fetchCalls.push({ url, payload });
        if (url === "/meta") {
          return {
            seasons: [2026, 2025, 2024, 2023],
            player_stats: ["goalAssists", "intercepts"],
            team_stats: ["goalAssists", "intercepts"]
          };
        }
        if (url === "/query") {
          return {
            status: "supported",
            summary: { question_type: "record", match_count: 1, stat_label: "Intercepts" },
            parsed: { intent_type: "record", stat: "intercepts", subject_type: "player" },
            answer: "Sharni Layton holds the record.",
            rows: []
          };
        }
        throw new Error(`Unexpected fetchJson call to ${url}`);
      },
      formatDate: (value) => value || "--",
      formatNumber: (value) => value == null ? "--" : String(value),
      formatStatLabel: (value) => ({
        goalAssists: "Goal Assists",
        intercepts: "Intercepts"
      })[value] || String(value || "--"),
      playerProfileUrl: (playerId) => `/player/${playerId}/`,
      renderEmptyTableRow: (tbody, message) => { tbody.textContent = message; },
      clearEmptyTableState: () => {},
      showElementLoadingStatus: () => {},
      showElementStatus: () => {},
      syncResponsiveTable: () => {}
    },
    NetballStatsTelemetry: {
      applyMetaConfig: () => {},
      bucketCount: () => "bucket",
      trackEvent: () => {}
    }
  },
  CustomEvent: class {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  },
  HTMLElement: MockElement,
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
  Array,
  Promise
};

vm.createContext(context);

const source = readFileSync(path.join(process.cwd(), "assets", "query.js"), "utf8");
vm.runInContext(`${source}
;window.__queryBuilderHooks = {
  renderResult,
  submitBuilderQuery,
  getBuilderState: () => builderState,
  getBuilderElements: () => builderElements,
  openBuilderModalUI
};`, context);

const hooks = context.window.__queryBuilderHooks;
context.window.__openBuilderModal = hooks.openBuilderModalUI;

hooks.renderResult({
  status: "parse_help_needed",
  error_message: "I couldn't match all the parts of that question.",
  builder_prefill: {
    shape: "record",
    stat: "intercepts",
    scope: "all_time"
  }
});

assert.equal(
  hooks.getBuilderElements().modal.open,
  true,
  "Expected parse_help_needed results to open the builder wizard automatically."
);

hooks.openBuilderModalUI({
  shape: "record",
  stat: "intercepts",
  scope: "all_time"
});

assert.equal(
  hooks.getBuilderState().timeframe,
  "alltime",
  "Expected all-time record prefills to keep the builder in all-time mode."
);

await hooks.submitBuilderQuery();

const queryCall = fetchCalls.find((call) => call.url === "/query" && call.payload?.builder_source);
assert.ok(queryCall, "Expected builder submission to call /query with builder_source.");
assert.equal(
  queryCall.payload.seasons ?? null,
  null,
  "Expected all-time record submissions to omit seasons so the API stays all-time."
);

console.log("Query builder checks passed.");
