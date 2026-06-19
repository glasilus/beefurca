import Workbook from "exceljs";

export interface DisciplineReportItem {
  disciplineName: string;
  tournamentsCount: number;
  proCount: number;
  amateurCount: number;
  sandboxCount: number;
  participantsCount: number;
  avgParticipants: number;
  matchesCount: number;
}

export interface PlayerReportItem {
  disciplineName: string;
  matchesCount: number;
  winsCount: number;
  eloDelta: number;
  currentElo: number;
}

/**
 * Generates the Discipline Popularity Report Excel file.
 */
export async function generateDisciplinePopularityReport(
  startDateStr: string,
  endDateStr: string,
  data: DisciplineReportItem[]
): Promise<Buffer> {
  const workbook = new Workbook.Workbook();
  const worksheet = workbook.addWorksheet("Популярность дисциплин");

  // Title block
  worksheet.mergeCells("A1:H1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Отчет о популярности дисциплин за период с ${startDateStr} по ${endDateStr}`;
  titleCell.font = { name: "Arial", size: 14, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 40;

  // Blank row
  worksheet.addRow([]);

  // Table Headers
  const headerRow = worksheet.addRow([
    "Наименование дисциплины",
    "Кол-во турниров",
    "PRO",
    "Amateur",
    "Sandbox",
    "Кол-во участников",
    "Ср. кол-во участников",
    "Сыграно матчей",
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF203764" }, // Slate blue header
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });
  worksheet.getRow(3).height = 30;

  // Add Data Rows
  const startRow = 4;
  data.forEach((item) => {
    const row = worksheet.addRow([
      item.disciplineName,
      item.tournamentsCount,
      item.proCount,
      item.amateurCount,
      item.sandboxCount,
      item.participantsCount,
      item.avgParticipants,
      item.matchesCount,
    ]);
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 1) {
        cell.alignment = { horizontal: "left" };
      } else if (colNumber === 7) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "0.0"; // среднее число участников
      } else {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "#,##0";
      }
    });
  });

  const endRow = startRow + data.length - 1;

  // Add Sum Row
  if (data.length > 0) {
    const sumRow = worksheet.addRow([
      "Итого",
      { formula: `=SUM(B${startRow}:B${endRow})` },
      { formula: `=SUM(C${startRow}:C${endRow})` },
      { formula: `=SUM(D${startRow}:D${endRow})` },
      { formula: `=SUM(E${startRow}:E${endRow})` },
      { formula: `=SUM(F${startRow}:F${endRow})` },
      { formula: `=IFERROR(AVERAGE(G${startRow}:G${endRow}),0)` },
      { formula: `=SUM(H${startRow}:H${endRow})` },
    ]);

    sumRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" }, // Light grey sum row
      };
      cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      };
      if (colNumber === 7) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "0.0";
      } else if (colNumber > 1) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "#,##0";
      }
    });
  }

  // Adjust Column Widths
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: false }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLength) {
        maxLength = valStr.length;
      }
    });
    column.width = Math.max(maxLength + 4, 15);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generates the Player Statistics Report Excel file.
 */
export async function generatePlayerReport(
  nickname: string,
  startDateStr: string,
  endDateStr: string,
  data: PlayerReportItem[]
): Promise<Buffer> {
  const workbook = new Workbook.Workbook();
  const worksheet = workbook.addWorksheet("Статистика игрока");

  // Title block
  worksheet.mergeCells("A1:F1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Статистический отчет по результатам игрока ${nickname}`;
  titleCell.font = { name: "Arial", size: 14, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Period block
  worksheet.mergeCells("A2:F2");
  const periodCell = worksheet.getCell("A2");
  periodCell.value = `Период: с ${startDateStr} по ${endDateStr}`;
  periodCell.font = { name: "Arial", size: 11, italic: true };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  // Blank row
  worksheet.addRow([]);

  // Table Headers
  const headerRow = worksheet.addRow([
    "Дисциплина",
    "Сыграно матчей (официальных)",
    "Количество побед",
    "Процент побед (Winrate)",
    "Итоговое изменение ELO (Δ)",
    "Текущий ELO рейтинг",
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF385623" }, // Greenish header
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });
  worksheet.getRow(4).height = 30;

  // Add Data Rows
  const startRow = 5;
  data.forEach((item, index) => {
    const rowNum = startRow + index;
    const row = worksheet.addRow([
      item.disciplineName,
      item.matchesCount,
      item.winsCount,
      // Winrate as formula: =IF(B{row}>0, C{row}/B{row}, 0) - formatted as percentage
      { formula: `=IF(B${rowNum}>0, C${rowNum}/B${rowNum}, 0)` },
      item.eloDelta,
      item.currentElo,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      
      if (colNumber === 1) {
        cell.alignment = { horizontal: "left" };
      } else if (colNumber === 4) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "0.0%"; // Percentage format
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "+#,##0;-#,##0;0"; // Show plus sign for positive ELO delta
      } else {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "#,##0";
      }
    });
  });

  const endRow = startRow + data.length - 1;

  // Add Sum/Average Row
  if (data.length > 0) {
    const sumRow = worksheet.addRow([
      "Всего / Среднее",
      { formula: `=SUM(B${startRow}:B${endRow})` },
      { formula: `=SUM(C${startRow}:C${endRow})` },
      { formula: `=AVERAGE(D${startRow}:D${endRow})` },
      { formula: `=SUM(E${startRow}:E${endRow})` },
      "", // No sum for current ELO
    ]);

    sumRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
      cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      };
      
      if (colNumber === 4) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "0.0%";
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "+#,##0;-#,##0;0";
      } else if (colNumber > 1) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "#,##0";
      }
    });
  }

  // Adjust Column Widths
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: false }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLength) {
        maxLength = valStr.length;
      }
    });
    column.width = Math.max(maxLength + 4, 15);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
