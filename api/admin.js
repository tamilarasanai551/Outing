const fs = require("fs");
const path = require("path");

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

async function fetchFromRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/lrange/outing_submissions/0/-1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.result)) {
        return data.result.map(item => typeof item === "string" ? JSON.parse(item) : item);
      }
    }
  } catch (err) {
    console.error("Redis fetch error:", err);
  }
  return null;
}

async function fetchFromGitHub() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "tamilarasanai551/Outing";
  if (!token) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/submissions.json`, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Outing-App"
      }
    });
    if (res.ok) {
      const fileData = await res.json();
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("GitHub fetch error:", err);
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const expectedPassword = process.env.ADMIN_PASSWORD || "tamizh2026";
  const authHeader = req.headers.authorization || "";
  const providedPassword = authHeader.replace(/^Bearer\s+/i, "") || req.query.password || (req.body && req.body.password);

  if (!providedPassword || providedPassword !== expectedPassword) {
    return res.status(401).json({ error: "Unauthorized. Incorrect admin credentials." });
  }

  try {
    // 1. Try Redis first
    let submissions = await fetchFromRedis();

    // 2. Try GitHub backup if Redis has no data
    if (!submissions || submissions.length === 0) {
      submissions = await fetchFromGitHub();
    }

    // 3. Fallback to local container cache
    if (!submissions || submissions.length === 0) {
      submissions = readLocalSubmissions();
    }

    return res.status(200).json({
      success: true,
      submissions: submissions || []
    });
  } catch (err) {
    console.error("Admin handler error:", err);
    return res.status(500).json({ error: "Failed to retrieve submissions." });
  }
};
