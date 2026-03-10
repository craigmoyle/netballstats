(function () {
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const configuredApiBaseUrl = localHosts.has(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://netballstats-api.onrender.com";

  window.NETBALL_STATS_CONFIG = Object.assign(
    {
      apiBaseUrl: configuredApiBaseUrl
    },
    window.NETBALL_STATS_CONFIG || {}
  );
})();
