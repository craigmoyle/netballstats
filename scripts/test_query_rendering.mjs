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
    return new ElementStub();
  }

  querySelectorAll() {
    return [];
  }

  addEventListener() {}
  closest() { return new ElementStub("closest"); }
  removeAttribute(name) { this.attributes.delete(name); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  focus() {}
  setSelectionRange() {}
  close() { this.open = false; }
  showModal() { this.open = true; }
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
  "builder-timeframe-range", "builder-season-single", "builder-season-from", "builder-season-to"
];

const elements = Object.fromEntries(ids.map((id) => [id, new ElementStub(id)]));
elements["query-form"].querySelector = () => new ElementStub("submit-button");
elements["example-strip"].querySelectorAll = () => [];
elements["query-template-strip"].querySelectorAll = () => [];

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

const context = {
  console,
  document: documentStub,
  window: {
    location: { href: "https://example.com/query/" },
    history: { replaceState() {} },
    addEventListener() {},
    dispatchEvent() {},
    NETBALL_STATS_CONFIG: {},
    NetballStatsUI: {
      buildUrl: (input) => input,
      fetchJson: () => new Promise(() => {}),
      formatDate: (value) => value || "--",
      formatNumber: (value) => value == null ? "--" : String(value),
      formatStatLabel: (value) => value === "goalAssists" ? "Goal Assists" : String(value || "--"),
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
  Array,
  Promise
};

vm.createContext(context);

const source = readFileSync(path.join(process.cwd(), "assets", "query.js"), "utf8");
vm.runInContext(`${source}\n;window.__queryTestHooks = { renderResult, elements };`, context);

const { renderResult, elements: renderedElements } = context.window.__queryTestHooks;

renderResult({
  status: "supported",
  intent_type: "trend",
  subject: "Grace Nweke",
  subject_type: "player",
  stat: "goalAssists",
  stat_label: "Goal Assists",
  seasons: [2023, 2024, 2025],
  results: [
    { season: 2023, total: 12, games: 10, average: 1.2 },
    { season: 2024, total: 18, games: 14, average: 1.29, yoy_change: 50, yoy_change_label: "+6 assists" },
    { season: 2025, total: 26, games: 16, average: 1.62, yoy_change: 44.4, yoy_change_label: "+8 assists" }
  ]
});

assert.notEqual(renderedElements.answerHeadline.textContent, "No answer.", "Expected supported trend results to render a real headline.");
assert.notEqual(renderedElements.summaryQuestionType.textContent, "--", "Expected supported trend results to show the trend question type.");
assert.notEqual(renderedElements.summaryStat.textContent, "--", "Expected supported trend results to show the stat label.");

console.log("Query rendering checks passed.");
