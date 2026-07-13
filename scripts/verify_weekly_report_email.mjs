import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildWeeklyReportEmailHtml } = require("./weekly_report_email.js");

const sampleRows = [
  {
    Block: "headline",
    Label: "Weekly read",
    Value:
      "The public archive drew 124 page views from 47 visitors across 57 sessions. Up 18 views on the prior week.",
    Detail: "",
    SortKey: 1,
  },
  { Block: "stat", Label: "Page views", Value: "124", Detail: "Up 18 views on the prior week.", SortKey: 10 },
  { Block: "stat", Label: "Visitors", Value: "47", Detail: "+5 vs prior week", SortKey: 11 },
  { Block: "stat", Label: "Sessions", Value: "57", Detail: "52 prior week", SortKey: 12 },
  { Block: "stat", Label: "Returning", Value: "0", Detail: "Seen in the prior week", SortKey: 13 },
  { Block: "page", Label: "Archive home", Value: "67", Detail: "54.0% of views", SortKey: 101 },
  { Block: "page", Label: "International archive", Value: "17", Detail: "13.7% of views", SortKey: 102 },
  { Block: "page", Label: "Player directory", Value: "9", Detail: "7.3% of views", SortKey: 103 },
  { Block: "page", Label: "Player dossier", Value: "7", Detail: "5.6% of views", SortKey: 104 },
  { Block: "page", Label: "Ask the Stats", Value: "5", Detail: "4.0% of views", SortKey: 105 },
  { Block: "event", Label: "Archive filters applied", Value: "25", Detail: "interactions", SortKey: 201 },
  { Block: "event", Label: "International home opened", Value: "12", Detail: "interactions", SortKey: 202 },
  { Block: "event", Label: "Ask the Stats completed", Value: "11", Detail: "interactions", SortKey: 203 },
  { Block: "audience", Label: "Australia", Value: "4", Detail: "visitors", SortKey: 301 },
  {
    Block: "audience",
    Label: "Archive mode",
    Value: "Super Netball 47 · International 1",
    Detail: "unique visitors",
    SortKey: 340,
  },
  { Block: "referrer", Label: "In-site navigation", Value: "61", Detail: "49.2% of views", SortKey: 401 },
  { Block: "referrer", Label: "Direct / bookmark", Value: "46", Detail: "37.1% of views", SortKey: 402 },
  { Block: "referrer", Label: "bing.com", Value: "5", Detail: "4.0% of views", SortKey: 403 },
  { Block: "referrer", Label: "facebook.com", Value: "3", Detail: "2.4% of views", SortKey: 404 },
  {
    Block: "idea",
    Label: "Idea",
    Value: "A round-by-round momentum chart for each team would help compare comebacks across seasons.",
    Detail: "Sat 12 Jul · 09:14 UTC",
    SortKey: 601,
  },
  {
    Block: "idea",
    Label: "Data question",
    Value: "Does the archive include ANZ Championship centre-pass stats before 2010?",
    Detail: "Sun 13 Jul · 11:02 UTC",
    SortKey: 602,
  },
  {
    Block: "note",
    Label: "Busiest hour (UTC)",
    Value: "Tue 01 Jul · 08:00",
    Detail: "25 views",
    SortKey: 500,
  },
  {
    Block: "note",
    Label: "Geo coverage",
    Value: "4 of 47 visitors geolocated",
    Detail: "Country fills in as new visits arrive with client IP forwarding.",
    SortKey: 510,
  },
];

const html = buildWeeklyReportEmailHtml(sampleRows);
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "weekly-report-preview.html");
writeFileSync(outputPath, html, "utf8");

if (!html.includes("The archive this week")) {
  throw new Error("Weekly report HTML missing expected headline section.");
}

if (!html.includes("Archive home")) {
  throw new Error("Weekly report HTML missing page list items.");
}

if (!html.includes("Ideas inbox")) {
  throw new Error("Weekly report HTML missing ideas inbox section.");
}

if (!html.includes("round-by-round momentum chart")) {
  throw new Error("Weekly report HTML missing idea message content.");
}

console.log(`Weekly report preview written to ${outputPath}`);
