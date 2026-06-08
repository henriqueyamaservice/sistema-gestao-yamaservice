/**
 * Serviço de Integração SEFAZ (Mock)
 * Simula a rotina de Manifestação do Destinatário (NfeDistribuicaoDFe)
 */

class SefazService {
  constructor() {
    this.simulatedNotes = [
      {
        chaveAcesso: '35260612345678000199550010000123451001234567',
        emitente: {
          cnpj_cpf: '12345678000199',
          nome: 'FORNECEDOR SIMULADO S/A'
        },
        dataEmissao: new Date().toISOString(),
        valorTotal: 98.35,
        itens: [
          {
            codigo: 'PRD11302',
            descricao: 'RETENTOR 35X62X12 - SAV',
            quantidade: 5,
            valorUnitario: 19.67,
            valorTotal: 98.35
          }
        ],
        status: 'recebida'
      },
      {
        chaveAcesso: '41260698765432000188550010000987651009876543',
        emitente: {
          cnpj_cpf: '5844939965',
          nome: 'COMERCIO DE FERRAGENS LTDA'
        },
        dataEmissao: new Date(Date.now() - 86400000).toISOString(),
        valorTotal: 540.00,
        itens: [
          {
            codigo: 'PRD09736',
            descricao: 'TUBO ESGOTO 6M DN 200MM - PLASTILIT',
            quantidade: 10,
            valorUnitario: 54.00,
            valorTotal: 540.00
          }
        ],
        status: 'recebida'
      }
    ];
  }

  /**
   * Simula a busca de notas na SEFAZ.
   */
  async sincronizarNotasRecentes() {
    console.log('[SEFAZ] Iniciando sincronização (Mock)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`[SEFAZ] Encontradas ${this.simulatedNotes.length} notas recentes.`);
    return this.simulatedNotes;
  }
}

export default new SefazService();
