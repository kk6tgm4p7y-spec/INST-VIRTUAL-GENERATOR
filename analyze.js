// Vercel serverless function.

// Set OPENAI_API_KEY in Vercel Project Settings -> Environment Variables.

// Never put the API key in index.html.

export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});

  try {

    const { image } = req.body || {};

    if (!image || typeof image !== "string") return res.status(400).json({error:"No image supplied"});

    if (!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Server is missing OPENAI_API_KEY"});

    const response = await fetch("https://api.openai.com/v1/responses", {

      method: "POST",

      headers: {

        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,

        "Content-Type": "application/json"

      },

      body: JSON.stringify({

        model: "gpt-4.1-mini",

        input: [{

          role: "user",

          content: [

            {

              type: "input_text",

              text:

`Read this Instant Football screenshot. Extract ONLY the match code and the 1st Half 1X2 and 2nd Half 1X2 odds.

Ignore account balance, time, O/U markets, double chance and other numbers.

Return ONLY valid JSON with this exact shape:

{"match":"AAA vs BBB","odds":{"h1":2.46,"d1":2.30,"a1":4.79,"h2":2.20,"d2":2.60,"a2":3.20}}

If a value cannot be read, use null. Do not guess.`

            },

            { type: "input_image", image_url: image }

          ]

        }],

        text: { format: { type: "json_object" } }

      })

    });

    const raw = await response.json();

    if (!response.ok) return res.status(response.status).json({error: raw?.error?.message || "Vision API error"});

    const out = raw.output_text || "";

    let parsed;

    try { parsed = JSON.parse(out); } catch { return res.status(502).json({error:"The OCR service returned invalid JSON"}); }

    const clean = {

      match: typeof parsed.match === "string" ? parsed.match : "",

      odds: {

        h1: num(parsed?.odds?.h1), d1: num(parsed?.odds?.d1), a1: num(parsed?.odds?.a1),

        h2: num(parsed?.odds?.h2), d2: num(parsed?.odds?.d2), a2: num(parsed?.odds?.a2)

      }

    };

    return res.status(200).json(clean);

  } catch (e) {

    return res.status(500).json({error:e?.message || "Unexpected server error"});

  }

}

function num(x) {

  const n = Number(x);

  return Number.isFinite(n) && n > 1 ? n : null;

}