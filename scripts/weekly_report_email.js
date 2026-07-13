/**
 * Build the editorial HTML body for the Statsball weekly usage email.
 * Keep layout in sync with infra/weekly-usage-report.json Compose_* actions.
 * Uses inline styles and table rows for broad email-client support.
 */

const STAT_LABEL_STYLE =
  "font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#6b7280;margin:0;";
const STAT_VALUE_STYLE =
  "font:700 24px/1.1 ui-sans-serif,system-ui,sans-serif;color:#0d7377;margin:6px 0 4px;";
const STAT_DETAIL_STYLE =
  "font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#6b7280;margin:0;";
const STAT_CELL_STYLE =
  "background:#fff;border:1px solid #e8dcc8;border-radius:8px;padding:14px 16px;vertical-align:top;width:25%;";
const ROW_LABEL_STYLE =
  "padding:10px 0;font:16px/1.4 Georgia,'Times New Roman',serif;color:#1f2933;";
const ROW_VALUE_STYLE =
  "padding:10px 8px;font:600 15px/1.4 ui-sans-serif,system-ui,sans-serif;color:#0d7377;text-align:right;white-space:nowrap;";
const ROW_DETAIL_STYLE =
  "padding:10px 0;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#6b7280;text-align:right;white-space:nowrap;";
const IDEA_HEADER_STYLE =
  "margin:0 0 6px;font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.04em;text-transform:uppercase;color:#92400e;";
const IDEA_MESSAGE_STYLE =
  "margin:0;font:15px/1.55 Georgia,'Times New Roman',serif;color:#1f2933;";
const IDEA_ITEM_STYLE =
  "margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #eadfce;";

function escapeHtml(value) {
  return `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowsByBlock(rows, block) {
  return rows.filter((row) => row.Block === block);
}

function firstRow(rows, block) {
  return rowsByBlock(rows, block)[0] || null;
}

function renderListItems(rows, valueSuffix = "") {
  if (!rows.length) {
    return `<p style="margin:0;padding:10px 0;color:#6b7280;font-style:italic;">Nothing notable this week.</p>`;
  }

  return rows.map((row) => {
    const detailCell = row.Detail
      ? `<td style="${ROW_DETAIL_STYLE}">${escapeHtml(row.Detail)}</td>`
      : `<td style="${ROW_DETAIL_STYLE}"></td>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #eadfce;">
      <tr>
        <td style="${ROW_LABEL_STYLE}">${escapeHtml(row.Label)}</td>
        <td style="${ROW_VALUE_STYLE}">${escapeHtml(row.Value)}${escapeHtml(valueSuffix)}</td>
        ${detailCell}
      </tr>
    </table>`;
  }).join("");
}

function renderIdeaItems(rows) {
  if (!rows.length) {
    return `<p style="margin:0;padding:10px 0;color:#6b7280;font-style:italic;">No ideas submitted this week.</p>`;
  }

  return rows.map((row) => `
    <div style="${IDEA_ITEM_STYLE}">
      <p style="${IDEA_HEADER_STYLE}">${escapeHtml(row.Label)} · ${escapeHtml(row.Detail)}</p>
      <p style="${IDEA_MESSAGE_STYLE}">${escapeHtml(row.Value)}</p>
    </div>`).join("");
}

function renderStatCards(rows) {
  return rows.map((row) => `
    <td style="${STAT_CELL_STYLE}">
      <p style="${STAT_LABEL_STYLE}">${escapeHtml(row.Label)}</p>
      <p style="${STAT_VALUE_STYLE}">${escapeHtml(row.Value)}</p>
      ${row.Detail ? `<p style="${STAT_DETAIL_STYLE}">${escapeHtml(row.Detail)}</p>` : ""}
    </td>`).join("");
}

function buildWeeklyReportEmailHtml(rows, options = {}) {
  const periodLabel = options.periodLabel || "Last 7 days · public traffic only";
  const headline = firstRow(rows, "headline");
  const stats = rowsByBlock(rows, "stat");
  const pages = rowsByBlock(rows, "page");
  const events = rowsByBlock(rows, "event");
  const audience = rowsByBlock(rows, "audience");
  const referrers = rowsByBlock(rows, "referrer");
  const ideas = rowsByBlock(rows, "idea");
  const notes = rowsByBlock(rows, "note");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Statsball weekly read</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1e8;color:#1f2933;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:620px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 8px;font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#0d7377;">Statsball · weekly read</p>
      <h1 style="margin:0 0 12px;font:700 30px/1.15 Georgia,'Times New Roman',serif;color:#1f2933;">The archive this week</h1>
      <p style="margin:0 0 8px;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;color:#6b7280;">${escapeHtml(periodLabel)}</p>
      <p style="margin:0 0 28px;font:18px/1.55 Georgia,'Times New Roman',serif;color:#1f2933;">${escapeHtml(headline?.Value || "The archive had a quiet week.")}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:12px 12px;margin:0 0 8px;">
        <tr>${renderStatCards(stats)}</tr>
      </table>
      <div style="margin-top:28px;padding-top:8px;border-top:1px solid #dccfb8;">
        <h2 style="margin:0 0 12px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">What they opened</h2>
        ${renderListItems(pages, " views")}
      </div>
      <div style="margin-top:28px;padding-top:8px;border-top:1px solid #dccfb8;">
        <h2 style="margin:0 0 12px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">What they did</h2>
        ${renderListItems(events)}
      </div>
      <div style="margin-top:28px;padding-top:8px;border-top:1px solid #dccfb8;">
        <h2 style="margin:0 0 12px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">Who came</h2>
        ${renderListItems(audience)}
      </div>
      <div style="margin-top:28px;padding-top:8px;border-top:1px solid #dccfb8;">
        <h2 style="margin:0 0 12px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">How they arrived</h2>
        ${renderListItems(referrers, " views")}
      </div>
      <div style="margin-top:28px;padding:18px 20px;background:#fff;border:1px solid #e8dcc8;border-radius:8px;">
        <h2 style="margin:0 0 10px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">Ideas inbox</h2>
        ${renderIdeaItems(ideas)}
      </div>
      <div style="margin-top:28px;padding:18px 20px;background:#fff;border:1px solid #e8dcc8;border-radius:8px;">
        <h2 style="margin:0 0 10px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#92400e;">Notes</h2>
        ${renderListItems(notes)}
      </div>
      <p style="margin:28px 0 0;font:13px/1.5 ui-sans-serif,system-ui,sans-serif;color:#6b7280;">Generated from Statsball usage telemetry and Ideas inbox. Internal and testing traffic excluded.</p>
    </div>
  </body>
</html>`;
}

module.exports = {
  buildWeeklyReportEmailHtml,
  escapeHtml,
  rowsByBlock,
  renderIdeaItems
};
