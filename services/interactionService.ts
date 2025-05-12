// services/interactionService.ts
import { supabase } from "../lib/supabase";
import OpenAI from "openai";

const openai_api_key = process.env.EXPO_PUBLIC_OPENAI_API_KEY as string;

const openai = new OpenAI({ apiKey: openai_api_key });

export async function getDrugDrugInteraction(
    medA: number,
    medB: number
): Promise<Array<{ severity: string; summary: string; details: string }>> {
    // 1) Normalizează ordinea
    const [a, b] = medA < medB ? [medA, medB] : [medB, medA];
    console.log(`Fetching interaction for: ${a} ${b}`);

    // 2) Încearcă cache-ul
    const { data: cache, error: cacheErr } = await supabase
        .from("medication_interactions")
        .select("result")
        .eq("medication_a_id", a)
        .eq("medication_b_id", b)
        .eq("interaction_type", "drug-drug")
        .single();

    if (cache && cache.result) {
        console.log(`Cache hit for ${a}-${b}`, cache.result);
        return cache.result;
    }

    // 3) Dacă nu e în cache, preia numele
    const { data: meds, error: medsErr } = await supabase
        .from("medication")
        .select("id, name")
        .in("id", [a, b]);
    if (medsErr || !meds) {
        console.error("Error fetching medication names:", medsErr);
        return [];
    }
    // Asigurăm ordinea [a, b]
    const nameMap = Object.fromEntries(meds.map((m) => [m.id, m.name]));
    const orderedNames = [a, b].map((id) => nameMap[id]).filter(Boolean) as string[];
    const namesList = orderedNames.join(" și ");
    console.log(`Meds names: ${namesList}`);

    // 4) Construim un prompt clar
    const userPrompt = `
Ești un farmacist. Răspunde STRICT cu un JSON valid, fără niciun alt text.
Listează toate interacțiunile dintre medicamentele ${namesList}.
Formatul trebuie să fie:
[
  {
    "severity": "string",
    "summary": "string",
    "details": "string"
  },
  …
]
  `.trim();
    console.log("OpenAI prompt:", userPrompt);

    // 5) Apelează OpenAI
    let raw: string;
    try {
        const chat = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a medical pharmacist. Output JSON only." },
                { role: "user", content: userPrompt },
            ],
            temperature: 0,
        });
        raw = chat.choices?.[0]?.message?.content ?? "";
        console.log("OpenAI response:", raw);
    } catch (err) {
        console.error("OpenAI API error:", err);
        raw = "";
    }

    // 6) Încearcă JSON.parse și fallback
    let result: Array<{ severity: string; summary: string; details: string }>;
    try {
        result = JSON.parse(raw);
        if (!Array.isArray(result)) throw new Error("Response is not an array");
    } catch (err) {
        console.error("Failed to parse JSON:", err);
        console.error("Raw response was:", raw);
        result = [];
    }

    // 7) Salvează în cache (upsert)
    await supabase.from("medication_interactions").upsert(
        {
            medication_a_id: a,
            medication_b_id: b,
            interaction_type: "drug-drug",
            result,
        },
        { onConflict: "medication_a_id,medication_b_id,interaction_type" }
    );
    console.log(`Saved cache for ${a}-${b}`);

    return result;
}
