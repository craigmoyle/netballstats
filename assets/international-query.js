const {
  buildUrl,
  fetchJson,
  formatNumber,
  formatStatLabel = (stat) => stat,
  showElementLoadingStatus = () => {},
  showElementStatus = () => {}
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

// DOM Elements
const elements = {
  form: document.getElementById("query-form"),
  input: document.getElementById("question-input"),
  status: document.getElementById("query-status"),
  help: document.getElementById("query-help"),
  results: document.getElementById("query-results"),
  resultsQuestion: document.getElementById("results-question"),
  resultsContent: document.getElementById("results-content"),
  builder: document.getElementById("query-builder"),
  builderContent: document.getElementById("query-builder-content")
};

// State
const state = {
  currentQuestion: ""
};

// Show status message
function showStatus(message, tone = "neutral", options = {}) {
  if (elements.status) {
    elements.status.textContent = message;
    elements.status.className = `status-banner status-banner--${tone}`;
    elements.status.hidden = false;
    
    if (options.autoHideMs) {
      setTimeout(() => {
        elements.status.hidden = true;
      }, options.autoHideMs);
    }
  }
}

// Hide status message
function hideStatus() {
  if (elements.status) {
    elements.status.hidden = true;
  }
}

// Show loading status
function showLoadingStatus(messages, kicker) {
  showElementLoadingStatus(elements.status, messages, kicker);
}

// Show results
function showResults(question, content) {
  if (elements.resultsQuestion) {
    elements.resultsQuestion.textContent = question;
  }
  
  if (elements.resultsContent) {
    elements.resultsContent.innerHTML = content;
  }
  
  if (elements.results) {
    elements.results.hidden = false;
  }
  
  if (elements.builder) {
    elements.builder.hidden = true;
  }
  
  if (elements.help) {
    elements.help.hidden = true;
  }
}

// Show query builder
function showQueryBuilder(content) {
  if (elements.builderContent) {
    elements.builderContent.innerHTML = content;
  }
  
  if (elements.builder) {
    elements.builder.hidden = false;
  }
  
  if (elements.results) {
    elements.results.hidden = true;
  }
  
  if (elements.help) {
    elements.help.hidden = true;
  }
}

// Show help
function showHelp() {
  if (elements.help) {
    elements.help.hidden = false;
  }
  
  if (elements.results) {
    elements.results.hidden = true;
  }
  
  if (elements.builder) {
    elements.builder.hidden = true;
  }
}

// Format simple list of items
function formatSimpleList(items, label = "Result") {
  if (!items || !items.length) {
    return `<p>No ${label.toLowerCase()} found.</p>`;
  }
  
  if (items.length === 1) {
    return `<p>${items[0]}</p>`;
  }
  
  const listItems = items.map(item => `<li>${item}</li>`).join("");
  return `
    <p>Found ${items.length} ${label.toLowerCase()}${items.length > 1 ? "s" : ""}:</p>
    <ul class="results-list">${listItems}</ul>
  `;
}

// Format player list with links
function formatPlayerList(players) {
  if (!players || !players.length) {
    return "<p>No players found.</p>";
  }
  
  if (players.length === 1) {
    const player = players[0];
    return `<p><a href="/international/player/?player_id=${player.player_id}">${player.player_name}</a></p>`;
  }
  
  const listItems = players.map(player => 
    `<li><a href="/international/player/?player_id=${player.player_id}">${player.player_name}</a></li>`
  ).join("");
  
  return `
    <p>Found ${players.length} players:</p>
    <ul class="results-list">${listItems}</ul>
  `;
}

// Format stat result
function formatStatResult(value, stat, context = "") {
  const formattedValue = formatNumber(value);
  const statLabel = formatStatLabel(stat);
  return `<p class="result-highlight">${formattedValue} ${statLabel}${context ? ` ${context}` : ""}</p>`;
}

// Handle successful parse result
function handleParseSuccess(result) {
  const { parsed } = result;
  
  if (!parsed) {
    showResults(state.currentQuestion, "<p>Sorry, I couldn't understand that question.</p>");
    return;
  }
  
  // Handle different types of parsed questions
  if (parsed.subjects && parsed.subjects.length > 0) {
    // Question about specific players/teams
    if (parsed.operator === "highest" || parsed.operator === "lowest") {
      // Leaderboard-type question
      showResults(state.currentQuestion, formatStatResult(
        parsed.value || 0, 
        parsed.stat || "points",
        `by ${parsed.subjects.join(", ")}`
      ));
    } else if (parsed.operator === "list") {
      // List-type question
      showResults(state.currentQuestion, formatSimpleList(parsed.subjects, "Item"));
    } else {
      // Other player questions
      showResults(state.currentQuestion, formatSimpleList(parsed.subjects, "Result"));
    }
  } else if (parsed.stat && parsed.value !== undefined) {
    // Direct stat question
    showResults(state.currentQuestion, formatStatResult(parsed.value, parsed.stat));
  } else {
    // Generic success
    showResults(state.currentQuestion, "<p>I found an answer to your question.</p>");
  }
}

// Handle parse guidance (when question needs refinement)
function handleParseGuidance(result) {
  const { builder_prefill } = result;
  
  if (!builder_prefill) {
    showResults(state.currentQuestion, "<p>I'm not sure how to answer that. Try rephrasing your question.</p>");
    return;
  }
  
  // For now, just show help
  showHelp();
}

// Parse question
async function parseQuestion(question) {
  try {
    const result = await fetchJson("/api/query/parse", { 
      question: question,
      mode: "international" // This would need to be implemented in the API
    });
    
    return result;
  } catch (error) {
    console.error("Error parsing question:", error);
    throw new Error("Unable to process your question right now.");
  }
}

// Submit query
async function submitQuery(question) {
  if (!question.trim()) {
    showStatus("Please enter a question.", "error");
    return;
  }
  
  state.currentQuestion = question;
  showLoadingStatus(["Thinking...", "Analyzing statistics...", "Preparing answer..."], "Processing");
  
  try {
    // In a real implementation, we would call the international query API
    // For now, we'll simulate some responses
    
    // Simple keyword matching for demo purposes
    if (question.toLowerCase().includes("who has the most")) {
      showResults(question, formatPlayerList([
        { player_id: 123, player_name: "Susannah PAWI" },
        { player_id: 456, player_name: "Matilda WOOLLEY" },
        { player_id: 789, player_name: "Joanna ADAMSKA" }
      ]));
    } else if (question.toLowerCase().includes("how many goals") && question.toLowerCase().includes("diamonds")) {
      showResults(question, formatStatResult(2847, "goals", "scored by Australian Diamonds"));
    } else if (question.toLowerCase().includes("world cup") && question.toLowerCase().includes("win")) {
      showResults(question, "<p>Australia has won 11 World Cups in netball.</p>");
    } else {
      // Default response
      showResults(question, "<p>I found some information related to your question about international netball.</p><p>This is a demonstration interface - a full implementation would connect to the international statistics database.</p>");
    }
    
    trackEvent("international_query_submitted", {
      question_length: question.length,
      had_results: true
    });
  } catch (error) {
    showStatus(error.message || "Unable to process your question right now.", "error");
    trackEvent("international_query_error", {
      question_length: question.length,
      error_type: error.name || "unknown"
    });
  }
}

// Handle form submission
function handleSubmit(event) {
  event.preventDefault();
  
  const question = elements.input.value.trim();
  if (!question) {
    showStatus("Please enter a question.", "error");
    return;
  }
  
  submitQuery(question);
}

// Initialize
function initialize() {
  // Set up form submission
  if (elements.form && elements.input) {
    elements.form.addEventListener("submit", handleSubmit);
    
    // Focus the input field
    elements.input.focus();
  }
  
  // Show help initially
  showHelp();
  
  // Track page view
  trackEvent("international_query_viewed");
}

// Start initialization when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}