import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

router.get('/os', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const ordens = JSON.parse(data);
    res.json(ordens);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler ordens de serviço', error: error.message });
    }
  }
});

router.post('/os', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    let ordens = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      ordens = JSON.parse(data);
    } catch (e) {
      // Se não existir, usa array vazio
    }

    let finalCodigo = req.body.codigo;
    
    // Se não tiver código (ou for vazio), gera automaticamente o sequencial
    if (!finalCodigo) {
      const dataReq = req.body.data || new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      const [ano, mes, dia] = dataReq.split('-');
      const mesAno = `${mes}${ano.slice(-2)}`; // "0626"
      
      // Filtrar as OS do mesmo mes/ano
      const osDoMes = ordens.filter(o => o.codigo && o.codigo.endsWith(`-${mesAno}`));
      
      let proximoNumero = 1;
      if (osDoMes.length > 0) {
        // Pega o número antes do traço e encontra o maior
        const numeros = osDoMes.map(o => {
          const numStr = o.codigo.split('-')[0];
          return parseInt(numStr, 10) || 0;
        });
        proximoNumero = Math.max(...numeros) + 1;
      }
      
      // Formata como XX-MMYY (ex: 01-0626)
      finalCodigo = `${proximoNumero.toString().padStart(2, '0')}-${mesAno}`;
    }

    const novaOS = {
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString(),
      ...req.body,
      codigo: finalCodigo
    };

    // Adiciona no início da lista para aparecer primeiro
    ordens.unshift(novaOS);
    await fs.writeFile(filePath, JSON.stringify(ordens, null, 2), 'utf-8');

    res.status(201).json({ 
      message: 'Ordem de Serviço salva com sucesso', 
      os: novaOS 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar Ordem de Serviço', error: error.message });
  }
});

router.put('/os/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;
    
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let ordens = JSON.parse(data);
    
    const osIndex = ordens.findIndex(o => o.codigo === codigo);
    if (osIndex === -1) {
      return res.status(404).json({ message: 'Ordem de Serviço não encontrada' });
    }

    // Atualiza os dados da OS mantendo o que não foi alterado
    ordens[osIndex] = {
      ...ordens[osIndex],
      ...updates
    };
    
    await fs.writeFile(filePath, JSON.stringify(ordens, null, 2), 'utf-8');

    // === Automação de Frota (Atualização Inteligente por Palavras-chave) ===
    const osAtualizada = ordens[osIndex];
    if (osAtualizada.situacao === 'CONCLUÍDO' && osAtualizada.usouVeiculo === 'Sim' && osAtualizada.veiculos && osAtualizada.veiculos.length > 0) {
      try {
        const strDescricao = (osAtualizada.descricao || '').toUpperCase();
        const strServicos = (osAtualizada.servicosExecutados || []).map(s => (s.descricao || '').toUpperCase()).join(' ');
        
        const textoParaBusca = `${strDescricao} ${strServicos}`;
        const trocouOleo = textoParaBusca.includes('TROCA DE ÓLEO') || textoParaBusca.includes('TROCA DE OLEO') || textoParaBusca.includes('TROCOU OLEO');
        const fezRevisao = textoParaBusca.includes('REVISÃO') || textoParaBusca.includes('REVISAO');

        const veiculosPath = path.resolve(process.cwd(), 'data', 'veiculos.json');
        let veiculosData = [];
        try {
          veiculosData = JSON.parse(await fs.readFile(veiculosPath, 'utf-8'));
        } catch (e) {
          console.log("Arquivo veiculos.json não existe ou está vazio.");
        }

        let atualizouAlgum = false;

        for (const vOs of osAtualizada.veiculos) {
          if (!vOs.placa) continue;
          
          const vConfIndex = veiculosData.findIndex(vc => vc.placa === vOs.placa);
          if (vConfIndex !== -1) {
            // Se tiver kmFinal usa ele, senão tenta o kmInicial
            const kmRegistro = parseFloat(vOs.kmFinal) || parseFloat(vOs.kmInicial) || 0;
            
            if (kmRegistro > 0) {
              // Atualiza o KM Atual global do veículo
              if (kmRegistro > (parseFloat(veiculosData[vConfIndex].kmAtual) || 0)) {
                veiculosData[vConfIndex].kmAtual = kmRegistro;
                atualizouAlgum = true;
              }

              // Verifica se foi troca de óleo ou revisão
              if (trocouOleo && kmRegistro > parseFloat(veiculosData[vConfIndex].kmTrocaOleo || 0)) {
                veiculosData[vConfIndex].kmTrocaOleo = kmRegistro;
                atualizouAlgum = true;
              }
              if (fezRevisao && kmRegistro > parseFloat(veiculosData[vConfIndex].kmRevisao || 0)) {
                veiculosData[vConfIndex].kmRevisao = kmRegistro;
                atualizouAlgum = true;
              }
            }
          }
        }

        if (atualizouAlgum) {
          await fs.writeFile(veiculosPath, JSON.stringify(veiculosData, null, 2), 'utf-8');
          console.log("Mágica de frota executada: KM Atual e Revisões atualizadas.");
        }
      } catch (err) {
        console.error('Erro na automação da frota:', err);
      }
    }
    // === Fim da Automação de Frota ===
    
    res.json({ 
      message: 'Ordem de Serviço atualizada com sucesso', 
      os: ordens[osIndex] 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar Ordem de Serviço', error: error.message });
  }
});

// Rota para pegar os serviços padrão
router.get('/servicos-padrao', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'servicos_padrao.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({});
    } else {
      res.status(500).json({ message: 'Erro interno ao ler serviços padrão', error: error.message });
    }
  }
});

// Rota para adicionar um serviço padrão
router.post('/servicos-padrao', async (req, res) => {
  try {
    const { setor, servico } = req.body;
    if (!setor || !servico) return res.status(400).json({message: 'Setor e serviço são obrigatórios'});

    const filePath = path.resolve(process.cwd(), 'data', 'servicos_padrao.json');
    let servicos = {};
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      servicos = JSON.parse(data);
    } catch (e) {}

    if (!servicos[setor]) {
      servicos[setor] = [];
    }
    if (!servicos[setor].includes(servico)) {
      servicos[setor].push(servico);
    }

    await fs.writeFile(filePath, JSON.stringify(servicos, null, 2), 'utf-8');
    res.json({ message: 'Serviço adicionado com sucesso', servicos });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

// Rota para excluir um serviço padrão
router.delete('/servicos-padrao', async (req, res) => {
  try {
    const { setor, servico } = req.body;
    if (!setor || !servico) return res.status(400).json({message: 'Setor e serviço são obrigatórios'});

    const filePath = path.resolve(process.cwd(), 'data', 'servicos_padrao.json');
    let servicos = {};
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      servicos = JSON.parse(data);
    } catch (e) {}

    if (servicos[setor]) {
      servicos[setor] = servicos[setor].filter(s => s !== servico);
      await fs.writeFile(filePath, JSON.stringify(servicos, null, 2), 'utf-8');
    }
    res.json({ message: 'Serviço excluído com sucesso', servicos });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

export default router;
