const GEMINI_API_KEY = "AIzaSyCsPuyVVZpmuVISMdgU6uV2B7Ea0vslqWM"; // ← paste your Gemini API key here

async function analyze() {
  const input = document.getElementById("input").value.trim();
  const resultDiv = document.getElementById("result");
  const btn = document.getElementById("analyzeBtn");

  if (!input) {
    alert("Please paste a message or URL first.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Analyzing...";
  resultDiv.className = "result";
  resultDiv.innerHTML = `<div class="loading">🔍 Scanning for scam signals...</div>`;

  try {
    const prompt = buildPrompt(input);
    const response = await callGemini(prompt);
    const parsed = parseResponse(response);
    displayResult(parsed);
  } catch (err) {
    resultDiv.innerHTML = `<div class="loading">❌ Error: ${err.message}</div>`;
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze Now";
  }
}

function buildPrompt(userInput) {
  return `You are ScamRadar, an expert scam detection AI. Analyze the following message or URL and determine if it is a scam, suspicious, or safe.

Check for these scam signals:
1. Urgency or pressure tactics ("Act now!", "Limited time!")
2. Too-good-to-be-true offers (prizes, huge salaries, lottery wins)
3. Fake authority (pretending to be a bank, government, or famous company)
4. Suspicious links or misspelled domains
5. Requests for personal info, passwords, or money
6. Emotional manipulation (fear, greed, sympathy)
7. Poor grammar or unusual phrasing
8. Unsolicited contact from unknown sender
9. Job offers with no interview or upfront payment requests
10. Threats or consequences for not responding

Respond ONLY in this exact JSON format with absolutely no extra text, no markdown, no code blocks, no explanation:
{
  "verdict": "SAFE",
  "title": "One short sentence summary",
  "explanation": "2-3 sentences explaining your verdict in plain language.",
  "flags": ["flag 1", "flag 2"]
}

Rules:
- verdict must be exactly one of: SAFE, SUSPICIOUS, or SCAM
- If safe, flags must be an empty array []
- Explanation must be in the same language as the input message
- Return raw JSON only, nothing else

Message to analyze:
"""
${userInput}
"""`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500
      }
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP error ${res.status}`);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No response from Gemini. Try again.");
  }

  return data.candidates[0].content.parts[0].text;
}

function parseResponse(text) {
  let clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Invalid response format from AI.");
  }

  clean = clean.substring(start, end + 1);
  return JSON.parse(clean);
}

function displayResult(data) {
  const resultDiv = document.getElementById("result");
  const verdictClass = data.verdict.toLowerCase();

  const verdictEmoji = { safe: "✅", suspicious: "⚠️", scam: "🚨" };
  const verdictLabel = { safe: "SAFE", suspicious: "SUSPICIOUS", scam: "SCAM DETECTED" };

  const flagsHTML = data.flags && data.flags.length
    ? `<div class="flags-title">Red flags found</div>
       ${data.flags.map(f => `<div class="flag-item">${f}</div>`).join("")}`
    : `<div class="flags-title">No red flags detected</div>`;

  resultDiv.className = `result ${verdictClass}`;
  resultDiv.innerHTML = `
    <span class="verdict-badge">
      ${verdictEmoji[verdictClass] || "🔍"} ${verdictLabel[verdictClass] || data.verdict}
    </span>
    <div class="verdict-title">${data.title}</div>
    <div class="verdict-explanation">${data.explanation}</div>
    ${flagsHTML}
  `;
}