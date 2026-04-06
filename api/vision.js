// Vercel serverless function — Groq vision proxy
// Keeps GROQ_API_KEY server-side; never exposed to the client.
//
// POST /api/vision
// Body: { messages: [...], model: "..." }  (same shape as Groq's API, with image_url content)
// Returns: Groq chat completion response

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI vision not configured on server." });
  }

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || "Groq vision error" });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: "Vision request failed: " + err.message });
  }
}
