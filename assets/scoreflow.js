const {
  buildUrl,
  cycleStatusBanner = () => {},
  fetchJson,
  formatNumber,
  syncResponsiveTable = () => {}
} = window.NetballStatsUI || {};

const state = {
  meta: null,
  gameRecords: null,
  teamSummary: null,
  filters: {
    seasons: [],
    teamId: "",
    opponentId: "",
    scenario: "all",
    metric: "comeback_deficit_points"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  void initScoreflowPage();
});
