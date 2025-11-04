const FROST_URL = Deno.env.get("FROST_URL")!;
const FROST_USER = Deno.env.get("FROST_USER")!;
const FROST_PASS = Deno.env.get("FROST_PASS")!;
const FROST_AUTH = Buffer.from(`${username}:${password}`).toString('base64');

const TEMP_STREAM_ID = Number(Deno.env.get("TEMP_STREAM_ID") || "1");
const HUM_STREAM_ID = Number(Deno.env.get("HUM_STREAM_ID") || "2");

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  console.log("received POST");
  if (req.method !== "POST") return new Response("Only POST allowed", { status: 405 });

  const payload = await req.json();
  const decoded = payload?.uplink_message?.decoded_payload;

  const now = new Date();

  // Get Berlin date parts
  const berlinParts = now.toLocaleString('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Manually compute milliseconds in Berlin time
  const berlinDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const milliseconds = berlinDate.getMilliseconds().toString().padStart(3, '0');

  // Get the timezone offset for Europe/Berlin in +HH:MM format
  const offsetMatch = now.toLocaleString('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'shortOffset'
  }).match(/GMT([+-]\d{2})(\d{2})/);

  const offset = offsetMatch ? `${offsetMatch[1]}:${offsetMatch[2]}` : '+01:00';

  // Combine everything to ISO 8601
  const time = berlinParts.replace(' ', 'T') + `.${milliseconds}${offset}`;

  const observations = [
    {
        "Datastream": {
            "@iot.id": TEMP_STREAM_ID
        },
        "components": [
            "phenomenonTime",
            "result"
        ],
        "dataArray@iot.count": 1,
        "dataArray": [
            [
                time,
                decoded?.TempC_SHT
            ]
        ]
    },
    {
        "Datastream": {
            "@iot.id": HUM_STREAM_ID
        },
        "components": [
            "phenomenonTime",
            "result"
        ],
        "dataArray@iot.count": 1,
        "dataArray": [
            [
                time,
                decoded?.Hum_SHT
            ]
        ]
    }
];

  console.log(observations);

  const res = await fetch(`${FROST_URL}/CreateObservations`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${FROST_AUTH}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(observations)
  });

  console.log(res);

  if (!res.ok) {
    return new Response("Failed: " + await res.text(), { status: 500 });
  }

  return new Response("Forwarded", { status: 200 });
});
