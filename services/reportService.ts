import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { DayStats } from "./calendarService";

interface ReportData {
  monthTitle: string;
  statsByDay: Record<string, DayStats>;
}

export async function exportCalendarReport(data: ReportData) {
  // 1) Template HTML
  const { monthTitle, statsByDay } = data;
  // Make a table with 3 columns: Day, Taken, %
  const rows = Object.entries(statsByDay)
    .map(([day, { taken, totalPlanned }]) => {
      const pct = Math.round((taken / totalPlanned) * 100);
      return `<tr>
        <td style="padding:4px;">${day}</td>
        <td style="padding:4px; text-align:center;">${taken}/${totalPlanned}</td>
        <td style="padding:4px; text-align:center;">${pct}%</td>
      </tr>`;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Raport Calendar</title>
      </head>
      <body>
        <h1 style="text-align:center;">${monthTitle}</h1>
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:left;">Zi</th>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:center;">Luate</th>
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
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

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
