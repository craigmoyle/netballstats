(function () {
  const renderedAt = Date.now();

  function getUi() {
    return window.NetballStatsUI || {};
  }

  async function submitFeedback(form, statusElement, submitButton) {
    const { buildUrl, showStatusBanner } = getUi();
    const category = form.category.value;
    const message = form.message.value.trim();
    const company = form.company.value;

    if (message.length < 10) {
      showStatusBanner(statusElement, "Add at least 10 characters so the note has enough context.", "error");
      return;
    }

    submitButton.disabled = true;
    showStatusBanner(statusElement, "Sending your note…", "loading", { kicker: "Feedback desk" });

    try {
      const response = await fetch(buildUrl("/feedback"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          category,
          message,
          company,
          rendered_at: renderedAt
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 429) {
        showStatusBanner(
          statusElement,
          payload.error || "Too many notes sent recently. Try again in an hour.",
          "error"
        );
        return;
      }

      if (!response.ok) {
        showStatusBanner(
          statusElement,
          payload.error || "Could not send that note. Check the fields and try again.",
          "error"
        );
        return;
      }

      form.reset();
      form.category.value = "idea";
      showStatusBanner(
        statusElement,
        "Thanks — your note is in. Feature ideas and data questions help set what gets built next.",
        "success",
        { autoHideMs: 8000 }
      );

      if (window.NetballStatsTelemetry?.trackEvent) {
        window.NetballStatsTelemetry.trackEvent("feedback_submitted", {
          category,
          message_length_bucket: String(message.length <= 50
            ? "short"
            : message.length <= 200
              ? "medium"
              : "long")
        });
      }
    } catch (error) {
      showStatusBanner(
        statusElement,
        "Could not reach the feedback desk. Check your connection and try again.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("ideas-form");
    const statusElement = document.getElementById("ideas-status");
    const submitButton = document.getElementById("ideas-submit");

    if (!form || !statusElement || !submitButton) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitFeedback(form, statusElement, submitButton);
    });
  });
})();
