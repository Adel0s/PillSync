import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { DayStats } from "./calendarService";

interface ReportData {
  monthTitle: string;
  statsByDay: Record<string, DayStats>;
}

export async function exportCalendarReport(data: ReportData) {
  const { monthTitle, statsByDay } = data;

  // — Calculate summary metrics exactly like in CalendarView —
  const allStats = Object.values(statsByDay);

  // Daily medication adherence (include days with 0 planned doses via (totalPlanned || 1))
  const ratios = allStats.map(s => s.taken / (s.totalPlanned || 1));
  const avgCur = ratios.length
    ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    : 0;
  const mediaAderare = Math.round(avgCur * 100);

  // MPR = totalTaken / totalPlanned × 100
  const totalPlannedSum = allStats.reduce((sum, s) => sum + s.totalPlanned, 0);
  const totalTakenSum = allStats.reduce((sum, s) => sum + s.taken, 0);
  const mprTotal =
    totalPlannedSum > 0
      ? Math.round((totalTakenSum / totalPlannedSum) * 100)
      : 0;

  // PDC = days with 100% taken / days with any planned × 100
  const daysWithPlan = allStats.filter(s => s.totalPlanned > 0).length;
  const daysCovered = allStats.filter(
    s => s.totalPlanned > 0 && s.taken >= s.totalPlanned
  ).length;
  const pdcTotal =
    daysWithPlan > 0
      ? Math.round((daysCovered / daysWithPlan) * 100)
      : 0;

  // — Build table rows only for days with >0 planned doses —
  const rows = Object.entries(statsByDay)
    .filter(([_, { totalPlanned }]) => totalPlanned > 0)
    .map(([day, { taken, totalPlanned }]) => {
      const pct = Math.round((taken / totalPlanned) * 100);
      return `<tr>
        <td style="padding:4px;">${day}</td>
        <td style="padding:4px; text-align:center;">${taken}/${totalPlanned}</td>
        <td style="padding:4px; text-align:center;">${pct}%</td>
      </tr>`;
    })
    .join("");

  // — Compose final HTML with summary block —
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Calendar Report</title>
      </head>
      <body style="font-family: sans-serif; padding: 16px;">
        <h1 style="text-align:center; margin-bottom: 24px;">${monthTitle}</h1>

        <!-- Summary block -->
        <div style="margin-bottom: 24px; border: 1px solid #ccc; padding: 12px; border-radius: 4px;">
          <p><strong>Treatment Days:</strong> ${daysWithPlan}</p>
          <p><strong>Average Daily Adherence Percentage:</strong> ${mediaAderare}%</p>
          <p><strong>MPR:</strong> ${mprTotal}%</p>
          <p><strong>PDC:</strong> ${pdcTotal}%</p>
        </div>

        <!-- Detailed table -->
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:left;">Date</th>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:center;">Total Doses/Taken</th>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:center;">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // 2) Generate PDF
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // 3) Share PDF
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Export calendar ca PDF",
      UTI: "com.adobe.pdf",
    });
  } else {
    alert("Sharing nu este disponibil pe acest dispozitiv.");
  }
}
