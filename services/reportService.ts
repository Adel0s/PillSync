import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { DayStats } from "./calendarService";

interface ReportData {
  monthTitle: string;
  statsByDay: Record<string, DayStats>;
}

export async function exportCalendarReport(data: ReportData) {
  const { monthTitle, statsByDay } = data;

  // — Prepare ordered days and percentages for sparkline chart —
  const orderedDays = Object.keys(statsByDay).sort();
  const pctData = orderedDays.map(day => {
    const { taken, totalPlanned } = statsByDay[day];
    return totalPlanned > 0 ? Math.round((taken / totalPlanned) * 100) : 0;
  });

  const chartConfig = {
    type: "line",
    data: {
      labels: orderedDays,
      datasets: [{
        label: "Progress (%)",
        data: pctData,
        fill: false,
        borderColor: "#20A0D8",
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top"
        },
        title: {
          display: true,
          text: "Daily Adherence Trend"
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          display: true,
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            stepSize: 20
          }
        }
      },
      layout: {
        padding: 8
      },
      responsive: true
    }
  };

  const chartUrl =
    "https://quickchart.io/chart?c=" +
    encodeURIComponent(JSON.stringify(chartConfig)) +
    "&width=600&height=150";

  // — Calculate summary metrics exactly like in CalendarView —
  const allStats = Object.values(statsByDay);
  const ratios = allStats.map(s => s.taken / (s.totalPlanned || 1));
  const avgCur = ratios.length
    ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    : 0;
  const mediaAderare = Math.round(avgCur * 100);

  const totalPlannedSum = allStats.reduce((sum, s) => sum + s.totalPlanned, 0);
  const totalTakenSum = allStats.reduce((sum, s) => sum + s.taken, 0);
  const mprTotal =
    totalPlannedSum > 0
      ? Math.round((totalTakenSum / totalPlannedSum) * 100)
      : 0;

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

  // — Compose final HTML with summary block, table, and sparkline chart on a new page —
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Calendar Report</title>
        <style>
          /* ensure page breaks for PDF */
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body style="font-family: sans-serif; padding: 16px;">
        <h1 style="text-align:center; margin-bottom: 24px;">${monthTitle}</h1>

        <!-- Summary block -->
        <div style="margin-bottom: 24px; border: 1px solid #ccc; padding: 12px; border-radius: 4px;">
          <p><strong>Treatment Days:</strong> ${daysWithPlan}</p>
          <p><strong>Average Adherence:</strong> ${mediaAderare}%</p>
          <p><strong>MPR:</strong> ${mprTotal}%</p>
          <p><strong>PDC:</strong> ${pdcTotal}%</p>
        </div>

        <!-- Detailed table -->
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:left;">Date</th>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:center;">Doses/Taken</th>
              <th style="border-bottom: 1px solid #333; padding:8px; text-align:center;">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Force new page for trend chart -->
        <div class="page-break"></div>

        <!-- Sparkline chart page -->
        <h2 style="text-align:center; margin-bottom: 16px;">Daily Progress Trend</h2>
        <img src="${chartUrl}" style="width:100%; height:auto;"/>

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
