import logoYamaservice from '../assets/YAMASERVICE.jpeg';

export const itensChecklist = [
  "BUZINA", "CINTO DE SEGURANÇA", "QUEBRA SOL", "RETROVISOR INTERNO", "RETROVISOR -DIREITO/ESQUERDO",
  "LIMPADOR PÁRA-BRISA TRASEIRO", "FAROL BAIXO", "FAROL ALTO", "MEIA LUZ", "LUZ DE FREIO",
  "LUZ DE RÉ", "LUZ DA PLACA", "LUZES DO PAINEL", "SETA – DIREITA/ESQUERDA", "PISCA ALERTA",
  "ÓLEO HIDRAULICO", "VELOCÍMETRO / TACÓGRAFO", "FREIOS", "MACACO", "CHAVE DE RODA",
  "TRIÂNGULO DE SINALIZAÇÃO", "EXTINTOR DE INCÊNDIO", "PORTAS – TRAVAS", "ALARME", "FECHAMENTO DAS JANELAS",
  "PÁRA-BRISA", "ÓLEO DO MOTOR", "ÓLEO DE FREIO", "NÍVEL DA ÁGUA DO RADIADOR", "PNEUS (ESTADO/CALIBRAGEM)",
  "PNEU RESERVA (ESTEPE)", "BANCOS ENCOSTO/ASSENTOS", "PÁRA-CHOQUE DIANTEIRO", "PÁRA-CHOQUE TRASEIRO", "LATARIA",
  "LIMPEZA INTERNA", "CÂMERA DE MONITORAMENTO"
];

export const handleImprimirChecklist = (check) => {
  if (!check || !check.formData) {
    alert("⚠️ Nenhum dado de check-list para imprimir!");
    return;
  }

  const { formData, items = {} } = check;
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  
  if (!printWindow) {
    alert("⚠️ O navegador bloqueou o pop-up de impressão. Por favor, permita pop-ups para este site.");
    return;
  }

  const dataFmt = formData.data ? formData.data.split('-').reverse().join('/') : '--/--/----';
  const horaFmt = formData.hora || '--:--';
  const habFmt = formData.habilitacao === 'vencida' ? 'VENCIDA ⚠️' : 'EM DIA ✅';

  // Dividir os 37 itens em 2 colunas para caber estritamente em 1 única folha A4
  const metade = Math.ceil(itensChecklist.length / 2); // 19 itens por coluna
  const col1 = itensChecklist.slice(0, metade); 
  const col2 = itensChecklist.slice(metade);

  const renderCellData = (nomeItem, index) => {
    if (!nomeItem) return '<td></td><td></td><td></td><td></td>';
    const itemData = items[index] || {};
    const status = itemData.status;
    const obs = itemData.obs || '';

    let statusHtml = '<span style="color: #94a3b8;">-</span>';
    if (status === 'ok') {
      statusHtml = '<span style="color: #059669; font-weight: bold; background: #d1fae5; padding: 1px 4px; border-radius: 3px; font-size: 8.5px;">OK</span>';
    } else if (status === 'ruim') {
      statusHtml = '<span style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 1px 4px; border-radius: 3px; font-size: 8.5px;">RUIM</span>';
    }

    return `
      <td style="text-align: center; font-weight: bold; font-size: 9px; width: 20px;">${String(index + 1).padStart(2, '0')}</td>
      <td style="font-weight: 500; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${nomeItem}</td>
      <td style="text-align: center; width: 38px;">${statusHtml}</td>
      <td style="font-size: 8.5px; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${obs}</td>
    `;
  };

  let gridRowsHtml = '';
  for (let i = 0; i < metade; i++) {
    const idx1 = i;
    const idx2 = i + metade;
    const item1 = col1[i];
    const item2 = col2[i];

    gridRowsHtml += `
      <tr>
        ${renderCellData(item1, idx1)}
        <td style="border: none; width: 6px; padding: 0; background: #fff;"></td>
        ${renderCellData(item2, idx2)}
      </tr>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Check-List - ${formData.placa || ''}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 9.5px;
            color: #0f172a;
            padding: 6mm;
            background: #fff;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .header-title {
            text-align: right;
          }
          .header-title h1 {
            margin: 0;
            font-size: 15px;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .header-title h2 {
            margin: 1px 0 0 0;
            font-size: 10.5px;
            color: #ea580c;
          }
          .logo {
            max-height: 36px;
          }
          .info-box {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px;
            margin-bottom: 8px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-item label {
            font-size: 8px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
          }
          .info-item span {
            font-size: 10.5px;
            font-weight: bold;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 2.5px 4px;
            font-size: 9px;
            line-height: 1.1;
          }
          th {
            background: #e2e8f0;
            color: #1e293b;
            font-size: 8.5px;
            text-transform: uppercase;
            text-align: left;
            font-weight: bold;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .obs-box {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 5px;
            margin-bottom: 10px;
            background: #f8fafc;
          }
          .obs-box label {
            font-size: 8px;
            color: #64748b;
            font-weight: bold;
            display: block;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .obs-box div {
            font-size: 9px;
            color: #0f172a;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 14px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #475569;
            padding-top: 3px;
            font-size: 9px;
            font-weight: bold;
            color: #1e293b;
          }
          @media print {
            body { padding: 4mm !important; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="${logoYamaservice}" alt="YAMASERVICE" class="logo" />
          <div class="header-title">
            <h1>CHECK-LIST DO VEÍCULO</h1>
            <h2>INSPEÇÃO TÉCNICA E SEGURANÇA</h2>
          </div>
        </div>

        <div class="info-box">
          <div class="info-item">
            <label>PLACA</label>
            <span>${formData.placa || '-'}</span>
          </div>
          <div class="info-item">
            <label>MODELO / VEÍCULO</label>
            <span>${formData.modelo || '-'}</span>
          </div>
          <div class="info-item">
            <label>CONDUTOR</label>
            <span>${formData.condutorNome || '-'}</span>
          </div>
          <div class="info-item">
            <label>DATA E HORA</label>
            <span>${dataFmt} ${horaFmt}</span>
          </div>
          <div class="info-item">
            <label>HABILITAÇÃO</label>
            <span>${habFmt}</span>
          </div>
          <div class="info-item" style="grid-column: span 3;">
            <label>ASSINATURA DO MOTORISTA</label>
            <span>${formData.condutorAssinatura || formData.condutorNome || '-'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 20px; text-align: center;">Nº</th>
              <th style="width: 32%;">ITEM</th>
              <th style="width: 38px; text-align: center;">ST</th>
              <th style="width: 16%;">OBSERVAÇÕES</th>
              <th style="border: none; width: 6px; padding: 0; background: #fff;"></th>
              <th style="width: 20px; text-align: center;">Nº</th>
              <th style="width: 32%;">ITEM</th>
              <th style="width: 38px; text-align: center;">ST</th>
              <th style="width: 16%;">OBSERVAÇÕES</th>
            </tr>
          </thead>
          <tbody>
            ${gridRowsHtml}
          </tbody>
        </table>

        ${formData.obsGerais ? `
          <div class="obs-box">
            <label>OBSERVAÇÕES GERAIS DE INSPEÇÃO</label>
            <div>${formData.obsGerais}</div>
          </div>
        ` : ''}

        <div class="signatures-grid">
          <div>
            <div class="signature-line">Assinatura do Motorista</div>
            <div style="font-size: 8px; color: #64748b;">${formData.condutorNome || ''}</div>
          </div>
          <div>
            <div class="signature-line">Encarregado de Oficina</div>
            <div style="font-size: 8px; color: #64748b;">${formData.assinaturaEncarregado || 'Visto Responsável'}</div>
          </div>
          <div>
            <div class="signature-line">Segurança do Trabalho</div>
            <div style="font-size: 8px; color: #64748b;">${formData.assinaturaSeguranca || 'Visto Segurança'}</div>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
