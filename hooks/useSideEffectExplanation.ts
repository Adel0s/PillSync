import { supabase } from "../lib/supabase";

const openai_api_key = process.env.EXPO_PUBLIC_OPENAI_API_KEY as string;

export const explainSideEffects = async (medication: any) => {
    const hasSideEffects = medication?.side_effect?.trim()?.length > 0;

    // Already cached?
    if (medication.side_effect_summary && medication.side_effect_severity) {
        return {
            summary: medication.side_effect_summary,
            safetyTips: medication.safety_tips || "No special tips.",
            severity: medication.side_effect_severity,
        };
    }

    if (!hasSideEffects) {
        const no_side_effect_medicine = {
            summary: "This medication is not known to have any significant side effects. 😊",
            safetyTips: "No special precautions needed. Take as prescribed. ✅",
            severity: "None",
        };

        // Save to Supabase
        await supabase.from("medication").update(no_side_effect_medicine).eq("id", medication.id);
        return no_side_effect_medicine;
    }

    // Build prompt
    const prompt = `
These are medication side effects (some may be in Romanian): ${medication.side_effect}
Please:
1. Translate them if needed.
2. Explain them in friendly, simple language.
3. Suggest safety tips if any (e.g. avoid driving if sleepy).
4. Classify overall severity as one of: "None", "Mild", "Moderate", or "Severe".

Reply in this format:
Summary: ...
Safety Tips: ...
Severity: ...
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openai_api_key}`,
        },
        body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        }),
    });

    console.info("Response from OpenAI:", response.status, response.statusText);
    console.info("Response body:", await response.text());
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || "";

    const summary = content.match(/Summary:\s*(.*?)\s*Safety Tips:/s)?.[1]?.trim() || "";
    const safetyTips = content.match(/Safety Tips:\s*(.*?)\s*Severity:/s)?.[1]?.trim() || "";
    const severity = content.match(/Severity:\s*(.*)/)?.[1]?.trim() || "Unknown";

    // Save to Supabase
    await supabase.from("medication").update({
        side_effect_summary: summary,
        safety_tips: safetyTips,
        side_effect_severity: severity,
    }).eq("id", medication.id);

    return { summary, safetyTips, severity };
};
