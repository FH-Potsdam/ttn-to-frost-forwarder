const FROST_URL = Deno.env.get("FROST_URL")!;
const FROST_AUTH = Deno.env.get("FROST_AUTH")!;

const TEMP_STREAM_ID = Number(Deno.env.get("TEMP_STREAM_ID") || "1");
const HUM_STREAM_ID = Number(Deno.env.get("HUM_STREAM_ID") || "2");

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Only POST allowed", { status: 405 });

  const payload = await req.json();
  const decoded = payload?.uplink_message?.decoded_payload;

  const time = new Date().toISOString();

  const observations = [
    {
      result: decoded?.temperature,
      phenomenonTime: time,
      Datastream: { "@iot.id": TEMP_STREAM_ID }
    },
    {
      result: decoded?.humidity,
      phenomenonTime: time,
      Datastream: { "@iot.id": HUM_STREAM_ID }
    }
  ];

  const res = await fetch(`${FROST_URL}/CreateObservations`, {
    method: "POST",
    headers: {
      "Authorization": FROST_AUTH,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(observations)
  });

  if (!res.ok) {
    return new Response("Failed: " + await res.text(), { status: 500 });
  }

  return new Response("Forwarded", { status: 200 });
});
