// services/interactionService.ts
import { supabase } from "../lib/supabase";
import OpenAI from "openai";

const openai_api_key = process.env.EXPO_PUBLIC_OPENAI_API_KEY as string;

const openai = new OpenAI({ apiKey: openai_api_key });

export type Interaction = {
    severity: string;
    summary: string;
    details: string;
};

export async function getDrugDrugInteraction(
    medA: number,
    medB: number
): Promise<Array<{ severity: string; summary: string; details: string }>> {
    const [a, b] = medA < medB ? [medA, medB] : [medB, medA];
    console.log(`Fetching interaction for: ${a} ${b}`);

    // check the cache (database)
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

    // 3) If not in cache, get names
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

    // 4) build promp
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
    console.log("OpenAI Drug-Drug prompt:", userPrompt);

    // 5) call OpenAI
    let raw: string;
    try {
        const chat = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful medical pharmacist. Output JSON only." },
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

export async function getDrugFoodInteraction(
    medId: number,
    food: string
): Promise<Interaction[]> {
    const item = food.trim().toLowerCase();
    console.log(`Fetching DF interaction for: ${medId} + "${item}"`);

    // 1) cache check
    const { data: cache } = await supabase
        .from("medication_food_interactions")
        .select("result")
        .eq("medication_id", medId)
        .eq("food_item", item)
        .single();
    if (cache?.result) {
        console.log(`DF cache hit for ${medId}-${item}`, cache.result);
        return cache.result;
    }

    // 2) fetch med name
    const { data: medRow, error: medErr } = await supabase
        .from("medication")
        .select("name")
        .eq("id", medId)
        .single();
    if (medErr || !medRow?.name) {
        console.error("Error fetching medication name:", medErr);
        return [];
    }
    const medName = medRow.name;
    console.log(`Med name DF: ${medName}`);

    // 3) build prompt
    const userPrompt = `
Ești farmacist. Răspunde STRICT cu un JSON valid, fără text adițional.
Care sunt interacțiunile dintre medicamentul "${medName}" și alimentul/băutura "${item}"?
Format:
[
  { "severity": "string", "summary": "string", "details": "string" }
]
  `.trim();
    console.log("DF prompt:", userPrompt);

    // 4) call OpenAI
    let raw = "";
    try {
        const chat = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a knowledgeable pharmacist." },
                { role: "user", content: userPrompt },
            ],
            temperature: 0,
        });
        raw = chat.choices?.[0]?.message?.content ?? "";
        console.log("DF OpenAI response:", raw);
    } catch (err) {
        console.error("DF OpenAI error:", err);
        return [];
    }

    // 5) parse & cache
    let result: Interaction[] = [];
    try {
        result = JSON.parse(raw);
        if (!Array.isArray(result)) throw new Error("Not an array");
    } catch (err) {
        console.error("DF JSON parse error:", err, "raw:", raw);
        return [];
    }

    await supabase.from("medication_food_interactions").upsert(
        {
            medication_id: medId,
            food_item: item,
            result,
        },
        { onConflict: "medication_id,food_item" }
    );
    console.log(`DF cached for ${medId}-${item}`);

    return result;
}
