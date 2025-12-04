import XlsxStyle from 'xlsx-js-style';

export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  // 1. Criar a Planilha
  const ws = XlsxStyle.utils.json_to_sheet(data);

  // 2. Estilização
  const headers = Object.keys(data[0]);
  const range = XlsxStyle.utils.decode_range(ws['!ref']!);

  // Estilo do Cabeçalho (Verde Escuro, Texto Branco, Negrito)
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
    fill: { fgColor: { rgb: "2E7D32" } }, // Verde estilo Excel
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    }
  };

  // Estilo das Células (Bordas finas)
  const cellStyle = {
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    },
    alignment: { vertical: "center" }
  };

  // Aplicar estilos
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XlsxStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      if (R === 0) {
        // É cabeçalho
        ws[cellAddress].s = headerStyle;
      } else {
        // É dado
        ws[cellAddress].s = cellStyle;
      }
    }
  }

  // 3. Ajustar Largura das Colunas (Auto-fit simples)
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));
  ws['!cols'] = colWidths;

  // 4. Gerar arquivo
  const wb = XlsxStyle.utils.book_new();
  XlsxStyle.utils.book_append_sheet(wb, ws, "Relatório");
  XlsxStyle.writeFile(wb, `${fileName}.xlsx`);
};