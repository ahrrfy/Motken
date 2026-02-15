import ExcelJS from "exceljs";

export async function exportJsonToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  filename: string,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map((key) => ({
      header: key,
      key,
    }));
    data.forEach((row) => worksheet.addRow(row));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

export async function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, unknown>[] | unknown[][] }[],
  filename: string,
) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    if (sheet.data.length === 0) continue;

    if (Array.isArray(sheet.data[0])) {
      (sheet.data as unknown[][]).forEach((row) => worksheet.addRow(row));
    } else {
      const objData = sheet.data as Record<string, unknown>[];
      worksheet.columns = Object.keys(objData[0]).map((key) => ({
        header: key,
        key,
      }));
      objData.forEach((row) => worksheet.addRow(row));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

export async function readExcelFile(
  file: File,
): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  const rows: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cellToString(cell.value);
      });
    } else {
      const obj: Record<string, string> = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          obj[headers[colNumber]] = cellToString(cell.value);
        }
      });
      rows.push(obj);
    }
  });

  return rows;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((rt: { text: string }) => rt.text).join("");
  }
  if (typeof value === "object" && "result" in value) {
    return String((value as { result: unknown }).result ?? "");
  }
  return String(value);
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
