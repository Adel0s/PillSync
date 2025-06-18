import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { DayStats } from "./calendarService";
import logo from "@/assets/images/logo.png";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

interface ReportData {
  monthTitle: string;
  statsByDay: Record<string, DayStats>;
}

export async function exportCalendarReport(data: ReportData) {
  const { monthTitle, statsByDay } = data;

  const asset = await Asset.fromModule(logo as number).downloadAsync();
  const fileUri = asset.localUri ?? asset.uri;
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const logoData = `data:image/png;base64,${base64}`;

  // Prepare ordered days and percentages for sparkline chart
  const orderedDays = Object.keys(statsByDay).sort();
  const pctData = orderedDays.map(day => {
    const { taken, totalPlanned } = statsByDay[day];
    return totalPlanned > 0 ? Math.round((taken / totalPlanned) * 100) : 0;
  });

  // Chart.js config
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
          ticks: { stepSize: 20 }
        }
      },
      layout: { padding: 8 },
      responsive: true
    }
  };

  const chartUrl =
    "https://quickchart.io/chart?c=" +
    encodeURIComponent(JSON.stringify(chartConfig)) +
    "&width=600&height=300";

  // Calculate summary metrics exactly like in CalendarView
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

  // Build table rows only for days with >0 planned doses
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

  // Compose final HTML with summary block, table, and sparkline chart on a new page
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Calendar Report</title>
        <style>
          @page {
            margin: 0px 20px 60px 20px;
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 12px;
              color: #666;
            }
          }
          .page-break { page-break-before: always; }
          /* smaller header */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 20px;
            border-bottom: 1px solid #ccc;
          }
          .header img {
            height: 64px;
          }
          .header h2 {
            margin: 0;
            font-size: 16px;
          }
        </style>
      </head>
      <body style="font-family: sans-serif; padding: 0; margin: 0;">

        <!-- Inline header -->
        <div class="header">
          <img src="${logoData}" alt="Clinic Logo"/>
          <h2>Pill Sync Reminder App</h2>
        </div>

        <!-- Page 1 content -->
        <div style="padding: 20px;">
          <h1 style="text-align:center; margin-bottom:24px;">${monthTitle}</h1>
          <div style="margin-bottom:24px; border:1px solid #ccc; padding:12px; border-radius:4px;">
            <p><strong>Treatment Days:</strong> ${daysWithPlan}</p>
            <p><strong>Average Adherence:</strong> ${mediaAderare}%</p>
            <p><strong>MPR:</strong> ${mprTotal}%</p>
            <p><strong>PDC:</strong> ${pdcTotal}%</p>
          </div>
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border-bottom:1px solid #333; padding:8px; text-align:left;">Date</th>
                <th style="border-bottom:1px solid #333; padding:8px; text-align:center;">Doses/Taken</th>
                <th style="border-bottom:1px solid #333; padding:8px; text-align:center;">Progress</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- Page break -->
        <div class="page-break"></div>

        <!-- Page 2: chart -->
        <div style="padding: 20px;">
          <h2 style="text-align:center; margin-bottom:16px;">Daily Progress Trend</h2>
          <div style="width:100%; height:300px;">
            <img src="${chartUrl}" style="width:100%; height:100%;"/>
          </div>
        </div>

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
