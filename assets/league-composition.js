const { showStatusBanner = () => {} } = window.NetballStatsUI || {};
showStatusBanner(document.getElementById("league-composition-status"), "Loading league composition…", "loading");
