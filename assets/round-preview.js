(function () {
  const {
    showStatusBanner = () => {},
    cycleStatusBanner = () => {},
    fetchJson,
    formatDate,
    formatNumber = (v) => (v == null ? "--" : String(v))
  } = window.NetballStatsUI || {};

  const elements = {
    status: document.querySelector("#round-preview-status"),
    heroLabel: document.querySelector("#round-preview-hero-label"),
    heroSummary: document.querySelector("#round-preview-hero-summary"),
    heading: document.querySelector("#round-preview-heading"),
    meta: document.querySelector("#round-preview-meta"),
    intro: document.querySelector("#round-preview-intro"),
    summaryBand: document.querySelector("#round-preview-summary-band"),
    matchGrid: document.querySelector("#round-preview-match-grid")
  };

  if (!elements.status || !elements.matchGrid) {
    return;
  }

  const loadingMessages = [
    "Loading upcoming fixtures\u2026",
    "Fetching head-to-head records\u2026",
    "Checking recent form\u2026"
  ];

  function createSummaryCard(card, accent) {
    const article = document.createElement("article");
    article.className = accent ? "summary-card summary-card--accent" : "summary-card";

    const label = document.createElement("span");
    label.className = "summary-card__label";
    label.textContent = card.label || "";

    const value = document.createElement("span");
    value.className = "summary-card__value";
    value.textContent = card.value || "--";

    article.append(label, value);
    return article;
  }

  function createTeamHeading(fixture, side) {
    const teamName = side === "home" ? fixture.home_team : fixture.away_team;
    const logoUrl = side === "home" ? fixture.home_logo_url : fixture.away_logo_url;

    const div = document.createElement("div");
    div.className = "round-preview-team";

    if (logoUrl) {
      const img = document.createElement("img");
      img.className = "round-preview-team__logo";
      img.src = logoUrl;
      img.alt = teamName || "";
      img.width = 32;
      img.height = 32;
      div.appendChild(img);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "round-preview-team__logo round-preview-team__logo--fallback";
      fallback.textContent = teamName ? teamName.slice(0, 2).toUpperCase() : "?";
      fallback.setAttribute("aria-hidden", "true");
      div.appendChild(fallback);
    }

    const name = document.createElement("span");
    name.textContent = teamName || "Team";
    div.appendChild(name);
    return div;
  }

  function renderMatches(matches) {
    elements.matchGrid.replaceChildren();

    if (!Array.isArray(matches) || !matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const text = document.createTextNode("No upcoming fixtures are available. ");
      const link = document.createElement("a");
      link.href = "/round/";
      link.className = "table-link";
      link.textContent = "See the latest completed round.";
      empty.append(text, link);
      elements.matchGrid.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    matches.forEach((match) => {
      const fixture = match.fixture || {};

      const article = document.createElement("article");
      article.className = "round-preview-card";

      const header = document.createElement("div");
      header.className = "round-preview-card__header";

      header.appendChild(createTeamHeading(fixture, "home"));

      const vs = document.createElement("div");
      vs.className = "round-preview-card__vs";
      const vsText = document.createElement("span");
      vsText.textContent = "vs";
      const timeEl = document.createElement("span");
      timeEl.className = "round-preview-card__time";
      timeEl.textContent = formatDate
        ? formatDate(fixture.local_start_time, { includeTime: true, includeYear: false }) || "TBC"
        : fixture.local_start_time || "TBC";
      vs.append(vsText, timeEl);

      header.appendChild(vs);
      header.appendChild(createTeamHeading(fixture, "away"));
      article.appendChild(header);

      const meta = document.createElement("ul");
      meta.className = "round-preview-card__meta";

      if (fixture.venue) {
        const venueItem = document.createElement("li");
        venueItem.textContent = fixture.venue;
        meta.appendChild(venueItem);
      }

      const h2h = match.head_to_head;
      if (h2h && h2h.summary) {
        const h2hItem = document.createElement("li");
        h2hItem.textContent = h2h.summary;
        meta.appendChild(h2hItem);
      }

      const lastMeeting = match.last_meeting;
      if (lastMeeting && lastMeeting.summary) {
        const lmItem = document.createElement("li");
        lmItem.textContent = lastMeeting.summary;
        meta.appendChild(lmItem);
      }

      const recentForm = match.recent_form;
      if (recentForm && recentForm.summary) {
        const rfItem = document.createElement("li");
        rfItem.textContent = recentForm.summary;
        meta.appendChild(rfItem);
      }

      const streaks = match.streaks;
      if (streaks) {
        if (streaks.home && streaks.home.summary) {
          const shItem = document.createElement("li");
          shItem.textContent = streaks.home.summary;
          meta.appendChild(shItem);
        }
        if (streaks.away && streaks.away.summary) {
          const saItem = document.createElement("li");
          saItem.textContent = streaks.away.summary;
          meta.appendChild(saItem);
        }
      }

      if (meta.children.length) {
        article.appendChild(meta);
      }

      if (Array.isArray(match.fact_cards) && match.fact_cards.length) {
        const facts = document.createElement("div");
        facts.className = "round-preview-card__fact";
        match.fact_cards.forEach((factText) => {
          if (!factText) return;
          const p = document.createElement("p");
          p.textContent = factText;
          facts.appendChild(p);
        });
        if (facts.children.length) {
          article.appendChild(facts);
        }
      }

      if (Array.isArray(match.player_watch) && match.player_watch.length) {
        const watchList = document.createElement("ul");
        watchList.className = "round-preview-card__watch-list";
        match.player_watch.forEach((note) => {
          if (!note || !note.summary) return;
          const item = document.createElement("li");
          item.textContent = note.summary;
          watchList.appendChild(item);
        });
        if (watchList.children.length) {
          article.appendChild(watchList);
        }
      }

      fragment.appendChild(article);
    });

    elements.matchGrid.appendChild(fragment);
  }

  async function loadRoundPreview() {
    cycleStatusBanner(elements.status, loadingMessages, {
      kicker: "Loading preview",
      tone: "loading"
    });

    try {
      const params = {};
      const source = new URLSearchParams(window.location.search);
      const season = source.get("season");
      if (season) {
        params.season = season;
      }

      const payload = await fetchJson("/round-preview-summary", params);

      const roundLabel = payload.round_label || "Upcoming round";
      const seasonLabel = payload.season ? `${roundLabel}, ${payload.season}` : roundLabel;

      if (elements.heroLabel) {
        elements.heroLabel.textContent = seasonLabel;
      }
      if (elements.heading) {
        elements.heading.textContent = seasonLabel;
      }
      if (elements.meta) {
        elements.meta.textContent = payload.round_intro || "Upcoming fixtures and archive context.";
      }
      if (elements.heroSummary) {
        elements.heroSummary.textContent = payload.round_intro || "Fixtures and context for the next round.";
      }
      if (elements.intro) {
        elements.intro.textContent = payload.round_intro || "";
      }

      if (elements.summaryBand && Array.isArray(payload.summary_cards) && payload.summary_cards.length) {
        elements.summaryBand.replaceChildren();
        payload.summary_cards.forEach((card, i) => {
          elements.summaryBand.appendChild(createSummaryCard(card, i === 0));
        });
      }

      renderMatches(payload.matches || []);

      showStatusBanner(elements.status, "Round preview ready.", "success", {
        kicker: "Ready",
        autoHideMs: 2200
      });
    } catch (error) {
      const message = error.message || "Couldn't load the round preview.";

      if (elements.heroLabel) {
        elements.heroLabel.textContent = "Unavailable";
      }
      if (elements.heroSummary) {
        elements.heroSummary.textContent = message;
      }
      if (elements.heading) {
        elements.heading.textContent = "Round preview unavailable";
      }
      if (elements.meta) {
        elements.meta.textContent = "Try again shortly.";
      }

      renderMatches([]);

      showStatusBanner(elements.status, message, "error", {
        kicker: "Preview unavailable"
      });
    }
  }

  loadRoundPreview();
})();
