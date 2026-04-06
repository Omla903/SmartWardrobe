// Vercel serverless function — remove.bg background removal proxy
// Keeps REMOVE_BG_API_KEY server-side; never exposed to the client.
//
// POST /api/remove-bg
// Body JSON: { image: "data:image/jpeg;base64,..." }
// Returns: PNG binary with transparent background, or JSON error

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Background removal not configured on server." });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: "Missing image field." });
  }

  // Strip the data URL prefix (e.g. "data:image/jpeg;base64,") to get raw base64
  const base64 = image.replace(/^data:image\/[a-z]+;base64,/, "");

  try {
    const params = new URLSearchParams();
    params.append("image_base64", base64);
    params.append("size", "auto");

    const upstream = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text });
    }

    const buffer = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).json({ error: "Background removal failed: " + err.message });
  }
}
