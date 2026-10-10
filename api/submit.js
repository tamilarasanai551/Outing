const https = require("https");
const fs = require("fs");
const path = require("path");

// In-memory / temp fallback storage for serverless runtime
const TMP_FILE = path.join("/tmp", "submissions.json");

function readLocalSubmissions() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading tmp submissions:", e);
  }
  return [];
}

function saveLocalSubmission(sub) {
  try {
    const list = readLocalSubmissions();
    list.unshift(sub);
    fs.writeFileSync(TMP_FILE, JSON.stringify(list.slice(0, 50)), "utf-8");
  } catch (e) {
    console.error("Error saving tmp submission:", e);
  }
}

// Persist to Upstash / Vercel KV if available
async function saveToRedis(sub) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/lpush/outing_submissions/${encodeURIComponent(JSON.stringify(sub))}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.error("Redis save error:", err);
    return false;
  }
}

// Persist to GitHub repo as backup if GITHUB_TOKEN is available
async function saveToGitHub(sub) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "tamilarasanai551/Outing";
  if (!token) return false;

  try {
    const filePath = "data/submissions.json";
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Outing-App"
      }
    });

    let sha = null;
    let list = [];
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      list = JSON.parse(content || "[]");
    }

    list.unshift(sub);
    const updatedContent = Buffer.from(JSON.stringify(list, null, 2)).toString("base64");

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Outing-App",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `New date acceptance recorded - ${sub.date}`,
        content: updatedContent,
        sha: sha || undefined
      })
    });
    return putRes.ok;
  } catch (err) {
    console.error("GitHub storage error:", err);
    return false;
  }
}

// Send automated WhatsApp via CallMeBot
async function sendWhatsAppMessage(sub) {
  const phone = process.env.WHATSAPP_PHONE || "918610003803";
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    console.warn("CALLMEBOT_API_KEY is not set. Skipping CallMeBot WhatsApp dispatch.");
    return { sent: false, reason: "CALLMEBOT_API_KEY not configured" };
  }

  const message = [
    "🌸 *Ashika accepted your date!* 💗",
    "",
    `📅 *Date:* ${sub.date}`,
    `⏰ *Time:* ${sub.startTime} – ${sub.endTime}`,
    `📍 *Place:* ${sub.place}`,
    `🍽️ *Food:* ${sub.food}`,
    `🍰 *Dessert:* ${sub.dessert}`,
    `🧃 *Juice:* ${sub.juice}`,
    "",
    `🕒 *Submitted:* ${sub.submittedAt}`,
    "🎉 *She said YES!*"
  ].join("\n");

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("CallMeBot response:", text);
    return { sent: true, response: text };
  } catch (err) {
    console.error("CallMeBot dispatch error:", err);
    return { sent: false, error: err.message };
  }
}

// Send Instant Email to tamilarasanai551@gmail.com
async function sendInstantEmail(sub) {
  const email = process.env.NOTIFICATION_EMAIL || "tamilarasanai551@gmail.com";
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${email}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://outing.vercel.app",
        "Origin": "https://outing.vercel.app"
      },
      body: JSON.stringify({
        _subject: "🌸 Ashika accepted your date! 💗 (She said YES! 🥳)",
        _template: "table",
        Date: sub.date,
        "Time Slot": `${sub.startTime} – ${sub.endTime}`,
        Location: sub.place,
        Food: sub.food,
        Dessert: sub.dessert,
        Drink: sub.juice,
        "Submitted At": sub.submittedAt,
        _captcha: "false"
      })
    });
    const result = await res.json();
    console.log("Email dispatch result:", result);
    return { sent: res.ok, result };
  } catch (err) {
    console.error("Email dispatch error:", err);
    return { sent: false, error: err.message };
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST is supported." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { date, startTime, endTime, place, food, dessert, juice } = body;

    // Server-side validation
    if (!date || !startTime || !endTime || !place || !food || !dessert || !juice) {
      return res.status(400).json({
        error: "Missing required fields. Please ensure all options are selected."
      });
    }

    const submission = {
      id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      date: String(date).trim(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      place: String(place).trim(),
      food: String(food).trim(),
      dessert: String(dessert).trim(),
      juice: String(juice).trim(),
      submittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      timestamp: Date.now()
    };

    // 1. Save locally (warm container)
    saveLocalSubmission(submission);

    // 2. Save to cloud storage (Upstash Redis or GitHub repo if configured)
    await Promise.allSettled([
      saveToRedis(submission),
      saveToGitHub(submission)
    ]);

    // 3. Dispatch WhatsApp alert & Instant Email in parallel
    const [waResult, emailResult] = await Promise.allSettled([
      sendWhatsAppMessage(submission),
      sendInstantEmail(submission)
    ]);

    return res.status(200).json({
      success: true,
      message: "Submission processed successfully",
      whatsAppDelivered: waResult.status === "fulfilled" && waResult.value.sent,
      emailDelivered: emailResult.status === "fulfilled" && emailResult.value.sent
    });
  } catch (error) {
    console.error("Submission processing failed:", error);
    return res.status(500).json({
      error: "An internal server error occurred while processing the submission."
    });
  }
};
