import 'dotenv/config';
import getDb from '../src/config/database.js';

const rawData = `
36101 29/07/2026 SZE 3152 LUGANO 289.175 528,00 20,02
36102 29/07/2026 QVU 6A64 VANCIEL 325.930 201,69 20,06
36103 30/07/2026 TRA 0008 OSMELEZ - 100,01 -
36104 30/07/2026 RWW 2608 BRUNO 107.165 254,00 20,00
36105 30/07/2026 TRA 0007 JOSE - 50,00 -
36106 30/07/2026 RDY 6699 GILMAR 770.787 330,00 -
36107 30/07/2026 QEH 5690 FRANCIEL 626.370,4 64,78 -
36108 30/07/2026 RWQ 4B55 FRANCIEL 229.834,7 180,16 -
36109 30/07/2026 CAROTE CLOVIS - 190,00 -
36110 31/07/2026 QDJ 8620 ADRIANO 182.627 181,24 -
36111 31/07/2026 JUW 6034 RONALDO 536.037 120,33 -
36112 31/07/2026 OFM 7046 ROMELSON 854.724 178,27 -
36113 31/07/2026 SZE 3152 LUCIANO 290.204 576,92 50,00
36115 31/07/2026 BIR 3682 SAMIR 301.749,6 94,29 -
36116 31/07/2026 QVK 1H65 JAIR 406.654,0 289,01 20,04
36117 31/07/2026 QVU 6A64 JAIR 323.038,9 235,35 20,02
36118 31/07/2026 QVU 6A54 JAIR 326.884,1 272,79 17,02
36119 03/08/2026 QUZ 0690 RONALDO 154.878 230,00 10,25
36120 03/08/2026 CAROTE EMER DJF - 100,00 -
36121 03/08/2026 SZE 3152 LUCIANO 291.242 515,20 50,01
36122 03/08/2026 TRA 0007 WELISSON - 150,00 -
36123 03/08/2026 QDY 6699 GILMAR 771.804 534,25 -
36124 03/08/2026 LQW 6A40 FRANCIEL 033.148 66,67 -
36125 03/08/2026 TRA 0002 JAIR - 66,16 -
36126 03/08/2026 TRA 0014 FABIANO - 50,00 -
36127 04/08/2026 TRA 0008 IVANILDO - 100,00 -
36128 04/08/2026 QDY 4084 CLEBER 217.075 469,20 10,00
36129 04/08/2026 VTR CIVIL POLICIA - 50,00 -
36131 05/08/2026 RWQ 4B55 DIEGO 230.337,7 185,11 20,00
36132 05/08/2026 SZE 3152 LUCIANO 292.269 503,70 40,00
36133 05/08/2026 JVH 9B56 BRUNO 477.151 147,61 -
36134 05/08/2026 QVU 6A64 JAIR 325.673,0 178,10 -
36135 05/08/2026 QVK 1H65 EDSON 404.274,6 211,73 20,00
36136 06/08/2026 TRA 0073 IVANILDO - 100,00 -
36137 06/08/2026 TRA 0008 IVANILDO - 150,46 -
36139 06/08/2026 CAROTE GERVANDRO - 100,24 -
36140 06/08/2026 QDJ 8620 ADRIANO 182.945 109,99 -
36141 06/08/2026 QVZ 0740 DIEGO 105.530,4 190,19 -
36142 06/08/2026 QEH 5690 SIMAO - 84,08 -
36143 06/08/2026 JUW 7667 MARCOS 736.264,9 62,00 -
36144 06/08/2026 RDY 6699 GILMAR 772.816 610,00 -
36145 06/08/2026 TRA 0002 FRANCIEL 369.320,3 90,19 -
36146 06/08/2026 QDJ 3845 ADRIANO 420.039,2 122,17 -
36148 07/08/2026 QVU 6A64 FRANCIEL 326.077,5 97,39 20,00
36149 07/08/2026 QVK 1H65 JANIEL 407.781,5 221,99 -
36150 07/08/2026 QEJ 9C33 FRANCIEL 223.840,8 176,19 -
36151 07/08/2026 RWQ 4B55 FRANCIEL 237.769,6 303,62 20,00
39652 29/07/2026 TRA 0010 OSCIAS - 50,00 -
36152 08/08/2026 SZE 3152 SALOMAO 293.312 501,94 40,00
36153 08/08/2026 LQW 6A40 SALOMAO 033.423,9 91,35 -
36154 08/08/2026 QVU 6A54 SALOMAO 327.905,9 306,11 10,11
36155 08/08/2026 TRA 0006 WELISSON - 24,62 -
36156 08/08/2026 TRA 0007 DIEGO 19.475 68,97 -
36157 10/08/2026 RDY 6699 GILMAR 773.286 727,01 40,00
36158 08/08/2026 CAROTE EMER EVENTUAL - 100,00 -
36159 10/08/2026 TRA 0013 JAIR - 100,22 -
36160 10/08/2026 QVU 6A64 FRANCIEL 326.334,7 97,60 -
36161 11/08/2026 CAROTE TRA 14 OSEIAS 1.423,2 50,00 -
36162 15/08/2026 SZE 3152 LUCIANO 294.174 425,29 -
36163 11/08/2026 TRA 0002 FRANCIEL 065.355 60,00 -
36164 11/08/2026 R VTR JESIMIEL - 25,00 -
36166 12/08/2026 TRA 0008 IVANILDO - 150,00 -
36167 12/08/2026 RWW 2608 ADMILSON 108.020 121,00 -
36168 12/08/2026 QDJ 8620 ADRIANO 175.037 275,00 -
36169 12/08/2026 QVU 6A64 FRANCIEL 327.376,2 307,00 20,00
36171 13/08/2026 TRA 0010 OSEIAS - 50,00 -
36172 13/08/2026 TRA 0073 JOAO BATISTA - 190,00 -
36173 13/08/2026 QUZ 0690 RONALDO 155.476 315,00 -
36174 13/08/2026 OFM 7046 RONALDO 355.160 163,00 -
36175 13/08/2026 SZE 3152 LUCIANO 294.724 242,00 -
36176 13/08/2026 DAF NOVO FRANCIEL 000.043,5 50,00 -
36177 13/08/2026 TRA 0002 FRANCIEL 237.744,7 100,00 20,00
36178 14/08/2026 STQ 7C13 JUNIOR - 126,00 -
36179 14/08/2026 QDJ 8620 ADRIANO 183.260 183,00 -
36180 14/08/2026 QEH 5690 SIMAO - 50,00 -
`;

function parseLine(line) {
  const parts = line.trim().split(' ');
  if (parts.length < 5) return null;
  const req = parts[0];
  const dataParts = parts[1].split('/');
  const dateStr = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}T12:00`; // Approximate hour

  let placa = '';
  let motorista = '';
  let i = 2;
  // Parse placa
  if (parts[i] === 'CAROTE') {
    if (parts[i+1] === 'EMER') {
        placa = 'CAROTE EMER';
        i += 2;
    } else if (parts[i+1] === 'TRA' && parts[i+2] === '14') {
        placa = 'CAROTE TRA 14';
        i += 3;
    } else {
        placa = 'CAROTE';
        i += 1;
    }
  } else if (parts[i] === 'R' && parts[i+1] === 'VTR') {
    placa = 'R VTR';
    i += 2;
  } else if (parts[i] === 'DAF' && parts[i+1] === 'NOVO') {
    placa = 'DAF NOVO';
    i += 2;
  } else if (parts[i] === 'VTR' && parts[i+1] === 'CIVIL') {
    placa = 'VTR CIVIL';
    i += 2;
  } else if (parts[i].length === 3 && parts[i+1]) {
    placa = parts[i] + parts[i+1];
    i += 2;
  } else {
    placa = parts[i];
    i++;
  }
  
  // Parse motorista (can be multiple words, ends before a number or '-')
  let motParts = [];
  while (i < parts.length && isNaN(parseFloat(parts[i].replace('.', '').replace(',', '.'))) && parts[i] !== '-') {
    motParts.push(parts[i]);
    i++;
  }
  motorista = motParts.join(' ');
  
  // Km
  let km = parts[i] !== '-' ? parts[i].replace('.', '') : '';
  i++;
  
  // Diesel
  let diesel = parts[i] ? parseFloat(parts[i].replace(',', '.')) : 0;
  i++;
  
  // Arla
  let arla = parts[i] && parts[i] !== '-' ? parseFloat(parts[i].replace(',', '.')) : 0;
  
  return { req, data: dateStr, placa, motorista, km, diesel, arla };
}

async function run() {
  const db = await getDb();
  console.log('Inserting provisory Arla...');
  const idProv = 'PROV-ARLA-1000';
  const dataProv = '2026-07-28 00:00:00';
  const qtdeProv = 1000;
  
  // Check if exists
  let existingProv = await db.get('SELECT * FROM entradas_combustivel WHERE id = ?', [idProv]);
  if (!existingProv) {
      await db.run(
        `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idProv, 'VETRA', 'ARLA REDUX', qtdeProv, 0, dataProv, 'PROV-ARLA', 0, 'P YAMAVES', 'EM ESTOQUE', 'Lote Provisório', JSON.stringify({
            id: idProv,
            fornecedor: 'VETRA',
            produto: 'ARLA REDUX',
            quantidade: qtdeProv,
            valorTotal: 0,
            data: '2026-07-28',
            notaFiscal: 'PROV-ARLA',
            valorUn: 0,
            estoque: 'P YAMAVES',
            situacao: 'EM ESTOQUE',
            observacao: 'Lote Provisório'
          })
        ]
      );
      console.log('Inserted PROV-ARLA.');
  }

  const lines = rawData.trim().split('\n');
  for (const line of lines) {
    if (!line) continue;
    const item = parseLine(line);
    if (!item) continue;
    
    // Find the req in database (buscar o json atual)
    const rows = await db.all(`SELECT * FROM saidas_combustivel`);
    let row = rows.find(r => {
        try {
            const d = JSON.parse(r.dados_json || '{}');
            return d.numeroRequisicao === item.req && d.combustivel === 'DIESEL';
        } catch(e) { return false; }
    });
    
    if (row) {
        let d = JSON.parse(row.dados_json);
        d.veiculo = item.placa;
        d.motorista = item.motorista;
        d.km = item.km;
        d.qtde = item.diesel.toString();
        
        await db.run(`UPDATE saidas_combustivel SET placa = ?, motorista = ?, litros = ?, dados_json = ? WHERE id = ?`,
            [item.placa, item.motorista, item.diesel, JSON.stringify(d), row.id]
        );
        console.log(`Updated Diesel for ${item.req}: ${item.diesel}L`);
    } else {
        console.log(`Warning: Req ${item.req} DIESEL not found in DB`);
    }

    if (item.arla > 0) {
        const idArla = item.req + '-A';
        const rowsArla = await db.all(`SELECT * FROM saidas_combustivel`);
        let rowArla = rowsArla.find(r => {
            try {
                const d = JSON.parse(r.dados_json || '{}');
                return d.numeroRequisicao === idArla && d.combustivel === 'ARLA REDUX';
            } catch(e) { return false; }
        });
        
        if (!rowArla) {
            let jsonArla = {
                id: Date.now() + '_' + Math.floor(Math.random() * 1000),
                status: 'CONCLUÍDO',
                numeroRequisicao: idArla,
                data: item.data, // Approximate
                requisitante: item.motorista,
                emitente: 'SISTEMA',
                veiculo: item.placa,
                fornecedor: 'P YAMAVES',
                combustivel: 'ARLA REDUX',
                cupom: idArla,
                km: item.km,
                qtde: item.arla.toString(),
                valorUnitario: '0',
                mes: 'jul.',
                motorista: item.motorista,
                uConsu: item.placa,
                valorTotal: '0'
            };
            
            await db.run(`INSERT INTO saidas_combustivel (id, placa, motorista, tipo_combustivel, litros, valor_total, tanque_origem, data_hora, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [jsonArla.id, item.placa, item.motorista, 'ARLA REDUX', item.arla, 0, 'P YAMAVES', item.data, JSON.stringify(jsonArla)]
            );
            console.log(`Inserted Arla for ${item.req}: ${item.arla}L`);
        } else {
            console.log(`Arla for ${item.req} already exists`);
        }
    }
  }
  
  console.log('Script completed!');
  process.exit(0);
}

run();
