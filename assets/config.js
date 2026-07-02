(function () {
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const configuredApiBaseUrl = localHosts.has(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "/api";

  window.NETBALL_STATS_CONFIG = Object.assign(
    {
      apiBaseUrl: configuredApiBaseUrl
    },
    window.NETBALL_STATS_CONFIG || {}
  );

  function cleanLabel(text) {
    return `${text || ""}`.replace(/\s+/g, " ").trim();
  }

  const SITE_BRAND = Object.freeze({
    domestic: "Statsball",
    international: "Statsball International"
  });

  function formatPageTitle(pageTitle, scope = "domestic") {
    const brand = scope === "international" ? SITE_BRAND.international : SITE_BRAND.domestic;
    const clean = cleanLabel(pageTitle);
    return clean ? `${clean} · ${brand}` : brand;
  }

  const STAT_LABEL_OVERRIDES = Object.freeze({
    attempt_from_zone1: "Zone 1 Attempts",
    attempt_from_zone2: "Zone 2 Attempts",
    attempts1: "1 Point Goal Attempts",
    attempts2: "Super Shot Attempts",
    centrePassReceives: "Centre Pass Receives",
    contactPenalties: "Contacts",
    defensiveRebounds: "Defensive Rebounds",
    deflectionPossessionGain: "Deflection Possession Gains",
    deflectionWithGain: "Deflections (with Gain)",
    deflectionWithNoGain: "Deflections (no Gain)",
    disposals: "Disposals",
    feedWithAttempt: "Feeds with Attempt",
    feeds: "Feeds into Circle",
    gain: "Gains",
    gamesPlayed: "Games Played",
    generalPlayTurnovers: "General Play Turnovers",
    goal1: "1 Point Goals",
    goal2: "Super Shots",
    goal_from_zone1: "Zone 1 Goals",
    goal_from_zone2: "Zone 2 Goals",
    goalAssists: "Goal Assists",
    goalAttempts: "Goal Attempts",
    goals1: "1 Point Goals",
    goals2: "Super Goals",
    goalsFromCentrePass: "Goals from Centre Pass",
    goalsFromGain: "Goals from Gain",
    goalsFromTurnovers: "Goals from Turnovers",
    interceptPassThrown: "Intercept Passes Thrown",
    missedGoalTurnover: "Missed Goal Turnovers",
    netPoints: "Net Points",
    obstructionPenalties: "Obstructions",
    offensiveRebounds: "Offensive Rebounds",
    points: "Points",
    possessionChanges: "Possession Changes",
    possessions: "Possessions",
    secondPhaseReceive: "Second Phase Receives",
    timeInPossession: "Time in Possession",
    tossUpWin: "Toss Up Wins",
    turnoverHeld: "Turnovers Held",
    unforcedTurnovers: "Unforced Turnovers"
  });

  const STAT_ABBREV_OVERRIDES = Object.freeze({
    attempt_from_zone1: "Z1 Att",
    attempt_from_zone2: "Z2 Att",
    attempts1: "1Pt Att",
    attempts2: "SS Att",
    centrePassReceives: "CPR",
    contactPenalties: "Contacts",
    defensiveRebounds: "Def Reb",
    deflectionPossessionGain: "DPG",
    deflectionWithGain: "DWG",
    deflectionWithNoGain: "DWNG",
    deflections: "Defl",
    disposals: "Disp",
    feedWithAttempt: "FwA",
    feeds: "Feeds",
    gain: "Gains",
    gamesPlayed: "GP",
    generalPlayTurnovers: "GPT",
    goal1: "1Pt G",
    goal2: "SS",
    goal_from_zone1: "Z1 G",
    goal_from_zone2: "Z2 G",
    goalAssists: "G Ast",
    goalAttempts: "G Att",
    goalMisses: "G Miss",
    goals: "Points",
    goals1: "1Pt G",
    goals2: "SS",
    goalsFromCentrePass: "GfCP",
    goalsFromGain: "GfG",
    goalsFromTurnovers: "GfTO",
    intercepts: "INT",
    interceptPassThrown: "IPT",
    missedGoalTurnover: "MGT",
    netPoints: "Net Pts",
    obstructionPenalties: "OBS",
    offensiveRebounds: "Off Reb",
    penalties: "Pen",
    pickups: "PKU",
    points: "Pts",
    possessionChanges: "PC",
    possessions: "Poss",
    rebounds: "Reb",
    secondPhaseReceive: "2P Rec",
    timeInPossession: "TiP",
    tossUpWin: "Toss",
    turnoverHeld: "TO Held",
    turnovers: "TO",
    unforcedTurnovers: "UTO",
  });

  const LOW_IS_BETTER_STATS = new Set([
    "contactPenalties",
    "generalPlayTurnovers",
    "interceptPassThrown",
    "obstructionPenalties",
    "unforcedTurnovers"
  ]);

  function formatStatLabel(stat) {
    const normalized = cleanLabel(stat);
    if (!normalized) {
      return "";
    }

    if (STAT_LABEL_OVERRIDES[normalized]) {
      return STAT_LABEL_OVERRIDES[normalized];
    }

    const spaced = normalized
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ");

    return cleanLabel(spaced.replace(/\b[a-z]/g, (match) => match.toUpperCase()));
  }

  function formatStatAbbrev(stat) {
    const normalized = cleanLabel(stat);
    if (!normalized) {
      return "";
    }
    return STAT_ABBREV_OVERRIDES[normalized] || formatStatLabel(normalized);
  }

  function statPrefersLowerValue(stat) {
    return LOW_IS_BETTER_STATS.has(cleanLabel(stat));
  }

  function unwrapValue(value) {
    if (Array.isArray(value)) {
      if (!value.length) {
        return null;
      }
      return value.length === 1 ? unwrapValue(value[0]) : value;
    }

    if (value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) {
      return null;
    }

    return value;
  }

  const statusState = new WeakMap();

  function clearStatusTimers(element) {
    const activeState = statusState.get(element);
    if (!activeState) {
      return;
    }
    if (activeState.intervalId) {
      window.clearInterval(activeState.intervalId);
    }
    if (activeState.timeoutId) {
      window.clearTimeout(activeState.timeoutId);
    }
    statusState.delete(element);
  }

  function renderStatusBanner(element, message, tone = "neutral", options = {}) {
    if (!element) {
      return;
    }
    element.textContent = message || "";
    if (message) {
      element.dataset.tone = tone;
      if (options.kicker) {
        element.dataset.kicker = options.kicker;
      } else {
        element.removeAttribute("data-kicker");
      }
      element.role = tone === "error" ? "alert" : "status";
      element.hidden = false;
    } else {
      element.hidden = true;
      element.removeAttribute("data-kicker");
      element.removeAttribute("data-tone");
    }
  }

  function showStatusBanner(element, message, tone = "neutral", options = {}) {
    clearStatusTimers(element);
    renderStatusBanner(element, message, tone, options);

    if (!element || !message || !options.autoHideMs) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      renderStatusBanner(element, "");
      clearStatusTimers(element);
    }, options.autoHideMs);

    statusState.set(element, { timeoutId });
  }

  function cycleStatusBanner(element, messages, options = {}) {
    if (!element) {
      return;
    }

    const sequence = (messages || []).map((message) => `${message || ""}`.trim()).filter(Boolean);
    if (!sequence.length) {
      showStatusBanner(element, options.fallbackMessage || "", options.tone || "neutral", options);
      return;
    }

    clearStatusTimers(element);

    let index = 0;
    renderStatusBanner(element, sequence[index], options.tone || "loading", options);

    if (sequence.length === 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      index = (index + 1) % sequence.length;
      renderStatusBanner(element, sequence[index], options.tone || "loading", options);
    }, options.intervalMs || 1800);

    statusState.set(element, { intervalId });
  }

  function showElementStatus(element, message, tone = "neutral", options = {}) {
    showStatusBanner(element, message || "", tone, options);
  }

  function showElementLoadingStatus(element, messages, kicker, options = {}) {
    cycleStatusBanner(element, messages, {
      ...options,
      tone: "loading",
      kicker
    });
  }

  function syncResponsiveTable(table) {
    if (!table) {
      return;
    }

    const labels = Array.from(table.querySelectorAll("thead tr:first-child > th, thead tr:first-child > td"))
      .map((cell) => cleanLabel(cell.textContent));

    ["tbody", "tfoot"].forEach((section) => {
      table.querySelectorAll(`${section} tr`).forEach((row) => {
        const cells = Array.from(row.children).filter((cell) => cell.matches("th, td"));
        const hasManualPrimary = cells.some((cell) => cell.dataset.stackPrimary === "true");

        cells.forEach((cell, index) => {
          const colSpan = Number(cell.getAttribute("colspan") || 1);
          if (colSpan > 1) {
            cell.removeAttribute("data-label");
            cell.removeAttribute("data-stack-primary");
            return;
          }

          const label = labels[index];
          if (label) {
            cell.dataset.label = label;
          } else {
            cell.removeAttribute("data-label");
          }

          if (hasManualPrimary) {
            if (cell.dataset.stackPrimary !== "true") {
              cell.removeAttribute("data-stack-primary");
            }
            return;
          }

          if (index === 0) {
            cell.dataset.stackPrimary = "true";
          } else {
            cell.removeAttribute("data-stack-primary");
          }
        });
      });
    });
  }

  const apiBaseUrl = (window.NETBALL_STATS_CONFIG.apiBaseUrl || "/api").replace(/\/$/, "");
  const defaultTimeoutMs = 30000;
  const fmtInt = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });
  const fmtDecimal = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const dateTimeFormatterNoYear = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });

  function buildUrl(path, params = {}) {
    const url = new URL(`${apiBaseUrl}${path}`, window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length) {
          url.searchParams.set(key, value.join(","));
        }
        return;
      }

      if (value !== undefined && value !== null && `${value}`.trim() !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url;
  }

  async function fetchJson(path, params = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), defaultTimeoutMs);

    try {
      const response = await fetch(buildUrl(path, params), {
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({ error: "Unexpected server response." }));
      if (!response.ok) {
        const message = Array.isArray(payload.error) ? payload.error.join(" ") : payload.error;
        throw new Error(message || `Request failed with status ${response.status}.`);
      }

      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The request timed out.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  let metaPromise = null;

  async function getMeta({ retries = 0 } = {}) {
    if (metaPromise) {
      return metaPromise;
    }

    metaPromise = (async () => {
      let attempt = 0;
      let lastError = null;

      while (attempt <= retries) {
        try {
          return await fetchJson("/meta");
        } catch (error) {
          lastError = error;
          if (attempt >= retries) {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * (attempt + 1)));
          attempt += 1;
        }
      }

      metaPromise = null;
      throw lastError;
    })();

    return metaPromise;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return value;
    }

    return (Number.isInteger(numeric) ? fmtInt : fmtDecimal).format(numeric);
  }

  function formatDate(value, { includeTime = false, includeYear = true } = {}) {
    value = unwrapValue(value);

    if (!value) {
      return "--";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return `${value}`;
    }

    if (includeTime) {
      return (includeYear ? dateTimeFormatter : dateTimeFormatterNoYear).format(date);
    }

    return dateFormatter.format(date);
  }

  function playerProfileUrl(playerId) {
    playerId = unwrapValue(playerId);
    return `/player/${encodeURIComponent(playerId)}/`;
  }

  function debounce(fn, delay = 200) {
    let timeoutId = null;
    const debounced = function (...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        fn.apply(this, args);
      }, delay);
    };
    debounced.cancel = function () {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    };
    return debounced;
  }

  function buildSurfaceCitationText(options = {}) {
    const {
      scope = "domestic",
      segments = [],
      refreshed = "",
      url = typeof window !== "undefined" ? window.location.href : ""
    } = options;
    const brandLead = scope === "international"
      ? "Statsball International archive."
      : "Statsball Super Netball & ANZ Championship archive.";
    const parts = [brandLead];
    const cleanSegments = (segments || []).filter(Boolean);
    if (cleanSegments.length) {
      parts.push(`${cleanSegments.join("; ")}.`);
    }
    const refreshedNote = `${refreshed || ""}`.trim();
    if (refreshedNote && !/^Loading/i.test(refreshedNote)) {
      parts.push(`${refreshedNote}.`);
    }
    if (url) {
      parts.push(url);
    }
    return parts.join(" ");
  }

  function updateSurfaceCitation(container, textElement, text, options = {}) {
    const visible = options.visible !== false && Boolean(text);
    if (textElement) {
      textElement.textContent = text || "";
    }
    if (container) {
      container.hidden = !visible;
    }
  }

  function bindSurfaceCitationCopy(button, getText, options = {}) {
    if (!button || typeof getText !== "function") {
      return;
    }

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(getText());
        if (typeof options.onSuccess === "function") {
          options.onSuccess();
        }
      } catch (_) {
        if (typeof options.onError === "function") {
          options.onError();
        }
      }
    });
  }

  function getCheckedValues(container) {
    if (!container) {
      return [];
    }

    return [...container.querySelectorAll("input[type='checkbox']:checked")]
      .map((input) => input.value);
  }

  function setCheckedValues(container, values) {
    if (!container) {
      return;
    }

    const selected = new Set((values || []).map((value) => `${value}`));
    container.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function syncArchiveFilterRail(options = {}) {
    const {
      rail,
      summaryElement,
      filterDesk,
      getSummaryText = () => "",
      isReady = () => true
    } = options;

    if (!rail) {
      return;
    }

    if (summaryElement) {
      summaryElement.textContent = getSummaryText();
    }

    rail.hidden = !isReady();
  }

  function bindArchiveFilterRailOpen(openButton, filterDesk) {
    if (!openButton || !filterDesk) {
      return;
    }

    openButton.addEventListener("click", () => {
      filterDesk.open = true;
      filterDesk.scrollIntoView({ behavior: "smooth", block: "start" });
      openButton.blur();
    });
  }

  function bindSeasonChoiceKeyboard(container) {
    if (!container || container.dataset.seasonKeyboardBound === "true") {
      return;
    }

    container.dataset.seasonKeyboardBound = "true";

    const getLabels = () => [...container.querySelectorAll("label.season-choice")];

    const syncTabIndices = (focusIndex = 0) => {
      const labels = getLabels();
      labels.forEach((label, index) => {
        label.tabIndex = index === focusIndex ? 0 : -1;
      });
    };

    const focusLabel = (index) => {
      const labels = getLabels();
      if (!labels.length) {
        return;
      }
      const nextIndex = ((index % labels.length) + labels.length) % labels.length;
      syncTabIndices(nextIndex);
      labels[nextIndex].focus();
    };

    const toggleLabel = (label) => {
      const input = label?.querySelector("input[type='checkbox']");
      if (!input) {
        return;
      }
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    container.addEventListener("keydown", (event) => {
      const labels = getLabels();
      if (!labels.length) {
        return;
      }

      const currentIndex = labels.findIndex((label) => label === document.activeElement);
      if (currentIndex === -1) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusLabel(currentIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusLabel(currentIndex - 1);
          break;
        case "Home":
          event.preventDefault();
          focusLabel(0);
          break;
        case "End":
          event.preventDefault();
          focusLabel(labels.length - 1);
          break;
        case " ":
        case "Spacebar":
          event.preventDefault();
          toggleLabel(labels[currentIndex]);
          break;
        default:
          break;
      }
    });

    syncTabIndices(0);
  }

  function renderCheckboxChoices(container, values = [], {
    className = "season-choice",
    inputName = "",
    selectedValues = [],
    onChange = null,
    renderLabel = (value) => `${value}`
  } = {}) {
    if (!container) {
      return;
    }

    const selected = new Set((selectedValues || []).map((value) => `${value}`));
    container.replaceChildren();
    const fragment = document.createDocumentFragment();

    values.forEach((value, index) => {
      const label = document.createElement("label");
      label.className = className;

      const input = document.createElement("input");
      input.type = "checkbox";
      if (inputName) {
        input.name = inputName;
      }
      input.value = `${value}`;
      input.checked = selected.has(input.value);

      const text = document.createElement("span");
      text.textContent = renderLabel(value, index);

      label.append(input, text);
      fragment.appendChild(label);

      if (onChange) {
        input.addEventListener("change", onChange);
      }
    });

    container.appendChild(fragment);
    bindSeasonChoiceKeyboard(container);
  }

  function renderSeasonCheckboxes(container, seasons = [], options = {}) {
    renderCheckboxChoices(container, seasons, {
      className: "season-choice",
      ...options
    });
  }

  function normalisePathname(pathname = "/") {
    const raw = `${pathname || "/"}`.trim() || "/";
    if (raw === "/") {
      return raw;
    }
    const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
  }

  function navRouteForPath(pathname = "/") {
    const normalized = normalisePathname(pathname);
    if (normalized.startsWith("/player/")) {
      return "/players/";
    }
    if (normalized.startsWith("/international/player/")) {
      return "/international/players/";
    }
    return normalized;
  }

  const SITE_MODE_STORAGE_KEY = "ns-site-mode";

  const INTERNATIONAL_FEATURE_LINKS = Object.freeze([
    { href: "/international/", label: "Archive" },
    { href: "/international/players/", label: "Players" },
    { href: "/international/query/", label: "Ask the stats" },
    { href: "/international/compare/", label: "Compare" }
  ]);

  function getSiteMode(pathname = window.location.pathname) {
    return normalisePathname(pathname).startsWith("/international/")
      ? "international"
      : "domestic";
  }

  function readStoredSiteMode() {
    try {
      const stored = window.localStorage?.getItem(SITE_MODE_STORAGE_KEY);
      if (stored === "international" || stored === "domestic") {
        return stored;
      }
    } catch (_) {}
    return null;
  }

  function persistSiteMode(mode) {
    if (mode !== "domestic" && mode !== "international") {
      return;
    }
    try {
      window.localStorage?.setItem(SITE_MODE_STORAGE_KEY, mode);
    } catch (_) {}
  }

  function mapRouteAcrossModes(pathname = "/", targetMode = "domestic") {
    const normalized = normalisePathname(pathname);
    if (targetMode === "international") {
      if (normalized === "/") {
        return "/international/";
      }
      if (normalized.startsWith("/player/") || normalized === "/players/") {
        return "/international/players/";
      }
      if (normalized.startsWith("/query/")) {
        return "/international/query/";
      }
      if (normalized.startsWith("/compare/")) {
        return "/international/compare/";
      }
      return "/international/";
    }

    if (normalized === "/international/") {
      return "/";
    }
    if (normalized.startsWith("/international/player/") || normalized === "/international/players/") {
      return "/players/";
    }
    if (normalized.startsWith("/international/query/")) {
      return "/query/";
    }
    if (normalized.startsWith("/international/compare/")) {
      return "/compare/";
    }
    return "/";
  }

  function hasDirectCrossModeRoute(pathname = "/", targetMode = "domestic") {
    const normalized = normalisePathname(pathname);
    if (targetMode === "international") {
      if (normalized === "/") {
        return true;
      }
      if (normalized.startsWith("/player/") || normalized === "/players/") {
        return true;
      }
      if (normalized.startsWith("/query/")) {
        return true;
      }
      if (normalized.startsWith("/compare/")) {
        return true;
      }
      return false;
    }

    if (normalized === "/international/") {
      return true;
    }
    if (normalized.startsWith("/international/player/") || normalized === "/international/players/") {
      return true;
    }
    if (normalized.startsWith("/international/query/")) {
      return true;
    }
    if (normalized.startsWith("/international/compare/")) {
      return true;
    }
    return false;
  }

  function ensureModeFallbackNote(nav) {
    if (!nav) {
      return null;
    }

    let note = nav.querySelector(".page-nav__mode-fallback");
    if (!note) {
      note = document.createElement("p");
      note.className = "page-nav__mode-fallback";
      note.hidden = true;
      const modeGroup = nav.querySelector(".page-nav__mode");
      if (modeGroup) {
        modeGroup.insertAdjacentElement("afterend", note);
      } else {
        nav.prepend(note);
      }
    }
    return note;
  }

  function prepareChangelogNav(nav) {
    if (!nav || nav.dataset.siteNavPrepared === "true") {
      return;
    }

    const dividers = nav.querySelectorAll(".page-nav__divider");
    if (dividers.length < 2) {
      return;
    }

    const featureDivider = dividers[0];
    const tailDivider = dividers[1];
    const domesticContainer = document.createElement("div");
    domesticContainer.className = "page-nav__links page-nav__links--domestic";
    domesticContainer.dataset.siteModeLinks = "domestic";

    let node = featureDivider.nextSibling;
    while (node && node !== tailDivider) {
      const next = node.nextSibling;
      if (
        node.nodeType === Node.ELEMENT_NODE
        && (node.classList.contains("page-nav__link") || node.classList.contains("page-nav__more"))
      ) {
        domesticContainer.appendChild(node);
      }
      node = next;
    }

    nav.insertBefore(domesticContainer, tailDivider);

    const internationalContainer = document.createElement("div");
    internationalContainer.className = "page-nav__links page-nav__links--international";
    internationalContainer.dataset.siteModeLinks = "international";
    internationalContainer.hidden = true;

    INTERNATIONAL_FEATURE_LINKS.forEach(({ href, label }) => {
      const link = document.createElement("a");
      link.className = "page-nav__link";
      link.href = href;
      link.textContent = label;
      internationalContainer.appendChild(link);
    });

    nav.insertBefore(internationalContainer, tailDivider);
    nav.dataset.siteNavPrepared = "true";
  }

  function setChangelogNavMode(nav, mode) {
    prepareChangelogNav(nav);
    const domesticLinks = nav.querySelector('[data-site-mode-links="domestic"]');
    const internationalLinks = nav.querySelector('[data-site-mode-links="international"]');
    if (!domesticLinks || !internationalLinks) {
      return;
    }

    const isInternational = mode === "international";
    domesticLinks.hidden = isInternational;
    internationalLinks.hidden = !isInternational;
  }

  function syncSiteModeNav(root = document) {
    const nav = root.querySelector(".page-nav");
    if (!nav) {
      return;
    }

    const currentRoute = navRouteForPath(window.location.pathname);
    const routeMode = getSiteMode(window.location.pathname);
    let activeMode = routeMode;

    if (currentRoute === "/changelog/") {
      activeMode = readStoredSiteMode() || routeMode;
    } else {
      persistSiteMode(routeMode);
    }

    prepareChangelogNav(nav);
    setChangelogNavMode(nav, activeMode);

    document.documentElement.dataset.siteMode = activeMode;
    nav.dataset.siteMode = activeMode;
    nav.setAttribute(
      "aria-label",
      activeMode === "international" ? "International netball archive" : "Super Netball archive"
    );

    nav.querySelectorAll(".page-nav__mode-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      let linkMode = "domestic";
      try {
        linkMode = getSiteMode(new URL(href, window.location.origin).pathname);
      } catch (_) {}

      const isActive = linkMode === activeMode;
      link.classList.toggle("page-nav__mode-link--active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }

      if (currentRoute === "/changelog/") {
        link.href = "/changelog/";
        link.classList.remove("page-nav__mode-link--fallback");
        link.removeAttribute("title");
        if (isActive) {
          link.removeAttribute("data-site-mode-target");
        } else {
          link.dataset.siteModeTarget = linkMode;
        }
        return;
      }

      link.removeAttribute("data-site-mode-target");
      link.href = mapRouteAcrossModes(window.location.pathname, linkMode);

      const hasDirectRoute = hasDirectCrossModeRoute(window.location.pathname, linkMode);
      link.classList.toggle("page-nav__mode-link--fallback", !isActive && !hasDirectRoute);
      if (!isActive && !hasDirectRoute) {
        link.setAttribute(
          "title",
          linkMode === "international"
            ? "This Super Netball page has no International equivalent — opens the International archive home."
            : "This International page has no Super Netball equivalent — opens the Super Netball archive home."
        );
      } else {
        link.removeAttribute("title");
      }
    });

    const fallbackNote = ensureModeFallbackNote(nav);
    if (fallbackNote) {
      if (currentRoute === "/changelog/") {
        fallbackNote.hidden = true;
        fallbackNote.textContent = "";
      } else {
        const otherMode = activeMode === "international" ? "domestic" : "international";
        const canCrossDirectly = hasDirectCrossModeRoute(window.location.pathname, otherMode);
        fallbackNote.hidden = canCrossDirectly;
        fallbackNote.textContent = canCrossDirectly
          ? ""
          : activeMode === "international"
            ? "Switch to Super Netball opens the archive home — this International page has no direct match."
            : "Switch to International opens the archive home — this Super Netball page has no direct match.";
      }
    }
  }

  function initSiteModeNav(root = document) {
    const nav = root.querySelector(".page-nav");
    if (!nav) {
      return;
    }

    if (nav.dataset.siteModeInit !== "true") {
      nav.dataset.siteModeInit = "true";
      nav.addEventListener("click", (event) => {
        const link = event.target.closest(".page-nav__mode-link[data-site-mode-target]");
        if (!link) {
          return;
        }

        event.preventDefault();
        const targetMode = link.dataset.siteModeTarget;
        if (targetMode !== "domestic" && targetMode !== "international") {
          return;
        }

        persistSiteMode(targetMode);
        syncSiteModeNav(root);
        markCurrentNavLinks(root);
      });
    }

    syncSiteModeNav(root);
  }

  const DOMESTIC_MORE_ROUTES = new Set([
    "/league-composition/",
    "/scoreflow/",
    "/home-court-advantage/",
    "/nwar/"
  ]);

  function markCurrentNavLinks(root = document) {
    if (!root?.querySelectorAll || !window.location) {
      return;
    }

    const currentRoute = navRouteForPath(window.location.pathname);
    root.querySelectorAll(".page-nav__link").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        link.removeAttribute("aria-current");
        return;
      }

      let targetRoute = "";
      try {
        targetRoute = navRouteForPath(new URL(href, window.location.origin).pathname);
      } catch {
        link.removeAttribute("aria-current");
        return;
      }

      if (targetRoute === currentRoute) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    root.querySelectorAll(".page-nav__more").forEach((details) => {
      const isMoreRoute = DOMESTIC_MORE_ROUTES.has(currentRoute);
      details.open = isMoreRoute;
      details.classList.toggle("page-nav__more--active", isMoreRoute);
    });
  }

  function clearEmptyTableState(tableBody) {
    if (!tableBody) {
      return;
    }

    const table = tableBody.closest("table");
    const wrapper = tableBody.closest(".table-wrapper");
    table?.classList.remove("is-empty");
    wrapper?.classList.remove("is-empty");
  }

  function renderEmptyTableRow(tableBody, message, {
    colSpan,
    kicker = "",
    rowClassName = ""
  } = {}) {
    if (!tableBody) {
      return;
    }

    const table = tableBody.closest("table");
    const wrapper = tableBody.closest(".table-wrapper");
    table?.classList.add("is-empty");
    wrapper?.classList.add("is-empty");

    const row = document.createElement("tr");
    if (rowClassName) {
      row.className = rowClassName;
    }

    const cell = document.createElement("td");
    cell.colSpan = colSpan || tableBody.parentElement?.querySelectorAll("thead th").length || 1;
    cell.className = "empty-state";
    if (kicker) {
      cell.dataset.kicker = kicker;
    }
    cell.textContent = message;
    row.appendChild(cell);
    tableBody.replaceChildren(row);
    syncResponsiveTable(table || tableBody.closest("table"));
  }

  function resolveChartsScriptUrl() {
    const appScript = document.querySelector('script[src*="app.js"]');
    if (appScript?.src) {
      return appScript.src.replace(/app(\.[a-f0-9]{10})?\.js(\?.*)?$/, 'charts$1.js$2');
    }
    return 'assets/charts.js';
  }

  let chartsModulePromise = null;

  function ensureChartsModule() {
    if (window.NetballCharts) {
      return Promise.resolve(window.NetballCharts);
    }
    if (!chartsModulePromise) {
      chartsModulePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = resolveChartsScriptUrl();
        script.async = true;
        script.onload = () => {
          if (window.NetballCharts) {
            resolve(window.NetballCharts);
            return;
          }
          reject(new Error('NetballCharts unavailable'));
        };
        script.onerror = () => reject(new Error('Failed to load charts'));
        document.head.appendChild(script);
      });
    }
    return chartsModulePromise;
  }

  function setChartPlaceholder(container, message) {
    if (!container) {
      return;
    }
    container.replaceChildren();
    container.dataset.state = 'empty';
    container.removeAttribute('role');
    container.removeAttribute('aria-label');
    container.removeAttribute('aria-describedby');
    container.setAttribute('aria-live', 'polite');
    const empty = document.createElement('p');
    empty.className = 'chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
  }

  function getThemePalette(fallback = []) {
    if (!window.getComputedStyle || !document?.documentElement) {
      return Array.isArray(fallback) ? [...fallback] : [];
    }

    const style = window.getComputedStyle(document.documentElement);
    const palette = [];
    for (let index = 1; index <= 8; index += 1) {
      const value = style.getPropertyValue(`--chart-palette-${index}`).trim();
      if (value) {
        palette.push(value);
      }
    }

    if (palette.length) {
      return palette;
    }

    return Array.isArray(fallback) ? [...fallback] : [];
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSiteModeNav();
    markCurrentNavLinks();
    document.querySelectorAll(".stack-table").forEach((table) => {
      syncResponsiveTable(table);
    });
  });

  window.NetballStatsUI = Object.assign(
    {},
    window.NetballStatsUI || {},
    {
      buildUrl,
      buildSurfaceCitationText,
      bindSurfaceCitationCopy,
      bindArchiveFilterRailOpen,
      clearEmptyTableState,
      clearStatusTimers,
      cycleStatusBanner,
      debounce,
      fetchJson,
      formatPageTitle,
      getMeta,
      formatDate,
      formatNumber,
      formatStatAbbrev,
      formatStatLabel,
      getSiteMode,
      initSiteModeNav,
      unwrapValue,
      getThemePalette,
      getCheckedValues,
      markCurrentNavLinks,
      mapRouteAcrossModes,
      hasDirectCrossModeRoute,
      showStatusBanner,
      showElementLoadingStatus,
      showElementStatus,
      playerProfileUrl,
      renderCheckboxChoices,
      renderEmptyTableRow,
      renderSeasonCheckboxes,
      setCheckedValues,
      ensureChartsModule,
      setChartPlaceholder,
      statPrefersLowerValue,
      syncArchiveFilterRail,
      syncResponsiveTable,
      syncSiteModeNav,
      updateSurfaceCitation,
      SITE_BRAND
    }
  );
})();
