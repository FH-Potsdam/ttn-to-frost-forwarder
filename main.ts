import { Buffer } from 'node:buffer';

const FROST_URL = Deno.env.get("FROST_URL")!;
const FROST_USER = Deno.env.get("FROST_USER")!;
const FROST_PASS = Deno.env.get("FROST_PASS")!;
const FROST_AUTH = Buffer.from(`${FROST_USER}:${FROST_PASS}`).toString('base64');

const TEMP_STREAM_ID = Number(Deno.env.get("TEMP_STREAM_ID") || "1");
const HUM_STREAM_ID = Number(Deno.env.get("HUM_STREAM_ID") || "2");

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  console.log("received POST");
  if (req.method !== "POST") return new Response("Only POST allowed", { status: 405 });

  const payload = await req.json();
  const decoded = payload?.uplink_message?.decoded_payload;
  
  const observations = [
    {
        "Datastream": {
            "@iot.id": TEMP_STREAM_ID
        },
        "components": [
            "result"
        ],
        "dataArray@iot.count": 1,
        "dataArray": [
            [
                decoded?.TempC_SHT
            ]
        ]
    },
    {
        "Datastream": {
            "@iot.id": HUM_STREAM_ID
        },
        "components": [
            "result"
        ],
        "dataArray@iot.count": 1,
        "dataArray": [
            [
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
