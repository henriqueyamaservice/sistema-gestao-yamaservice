import React, { useEffect } from 'react';
import { useNotification } from '../../../../../contextos/NotificationContext';

const NotificationRevisaoService = () => {
  const { setAlertasAtivos } = useNotification();

  useEffect(() => {
    // 1. Checar Role do Usuário
    const storedUser = localStorage.getItem('almoxarifado_user');
    let userRole = null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        userRole = u.role;
      } catch (e) {}
    }

    // Apenas 'os' ou 'admin' recebem os alertas de revisão
    if (userRole !== 'os' && userRole !== 'admin') {
      return;
    }

    const checarAlertas = async () => {
      try {
        const [resVeiculos, resGeradores] = await Promise.all([
          fetch('/api/veiculos'),
          fetch('/api/geradores')
        ]);
        
        const veiculos = await resVeiculos.json();
        const geradores = await resGeradores.json();

        const novosAlertas = [];

        // Lógica Veículos e Máquinas
        veiculos.forEach(v => {
          const isMaq = v.tipoEquipamento === 'MAQUINA' || v.tipoMedicao === 'Horas' || v.tipoMedicao === 'HORAS';
          const prefixoTipo = isMaq ? 'Máquina/Trator' : 'Veículo';

          const checkStatus = (kmUltimo, intervalo, kmAtual, nomeManutencao) => {
            if (!kmUltimo || !intervalo || !kmAtual) return;
            const proxima = Number(kmUltimo) + Number(intervalo);
            const falta = proxima - Number(kmAtual);
            const proporcao = falta / Number(intervalo);

            if (falta <= 0) {
              novosAlertas.push({
                id: `V_${v.placa}_${nomeManutencao}_atrasado`,
                mensagem: `${prefixoTipo} ${v.placa}: ${nomeManutencao} Atrasada!`,
                tipo: 'error',
                destino: 'revisao-veiculos'
              });
            } else if (proporcao <= 0.1) {
              novosAlertas.push({
                id: `V_${v.placa}_${nomeManutencao}_atencao`,
                mensagem: `${prefixoTipo} ${v.placa}: ${nomeManutencao} Próxima.`,
                tipo: 'warning',
                destino: 'revisao-veiculos'
              });
            }
          };

          checkStatus(v.kmTrocaOleo, v.intervaloTrocaOleo, v.kmAtual, 'Troca de Óleo');
          checkStatus(v.kmRevisao, v.intervaloRevisao, v.kmAtual, 'Revisão');
        });

        // Lógica Geradores
        geradores.forEach(g => {
          let atrasado = false;
          let atencao = false;
          let motivoAtraso = [];
          let motivoAtencao = [];

          if (g.dataUltimaRevisao && g.intervaloMesesRevisao) {
            const dataUltima = new Date(g.dataUltimaRevisao);
            const dataProxima = new Date(dataUltima);
            dataProxima.setMonth(dataProxima.getMonth() + g.intervaloMesesRevisao);
            const hoje = new Date();
            const diasFaltando = (dataProxima - hoje) / (1000 * 60 * 60 * 24);
            if (diasFaltando <= 0) {
              atrasado = true;
              motivoAtraso.push('Tempo');
            } else if (diasFaltando <= 15) {
              atencao = true;
              motivoAtencao.push('Tempo');
            }
          }

          if (g.horimetroUltimaRevisao && g.intervaloHorasRevisao && g.horimetroAtual) {
            const horasFaltando = (Number(g.horimetroUltimaRevisao) + Number(g.intervaloHorasRevisao)) - Number(g.horimetroAtual);
            if (horasFaltando <= 0) {
              atrasado = true;
              motivoAtraso.push('Horímetro');
            } else if (horasFaltando <= 50) {
              atencao = true;
              motivoAtencao.push('Horímetro');
            }
          }

          const nomeGerador = g.granja || g.nome || 'Gerador';
          if (atrasado) {
            novosAlertas.push({
              id: `G_${nomeGerador}_atrasado`,
              mensagem: `Gerador ${nomeGerador}: Revisão Atrasada (${motivoAtraso.join(' e ')})!`,
              tipo: 'error',
              destino: 'revisao-geradores'
            });
          } else if (atencao) {
            novosAlertas.push({
              id: `G_${nomeGerador}_atencao`,
              mensagem: `Gerador ${nomeGerador}: Revisão Próxima (${motivoAtencao.join(' e ')}).`,
              tipo: 'warning',
              destino: 'revisao-geradores'
            });
          }
        });

        setAlertasAtivos(novosAlertas);
      } catch (err) {
        console.error("Erro ao checar alertas de revisão:", err);
      }
    };

    checarAlertas();
    const interval = setInterval(checarAlertas, 60000); // Re-checa a cada 1 minuto
    
    return () => clearInterval(interval);
  }, [setAlertasAtivos]);

  return null; // O componente é invisível
};

export default NotificationRevisaoService;
