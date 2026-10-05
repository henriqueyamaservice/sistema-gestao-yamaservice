import React from 'react';
import { DollarSign, X, ShieldAlert, AlertTriangle, Clock, Trash2, Send, XCircle, PackageCheck, CheckCircle, ChevronLeft } from 'lucide-react';
import SeletorTecnico from '../SeletorTecnico';
import styles from '../../DashboardChefeSetor.module.css';
import { obterRotuloUnidade, permiteDecimais, formatarQuantidadeComUnidade } from '../../../../utils/classificadorUnidades';

const ModalOrcamentoChefeSetor = ({
  osModal,
  onClose,
  valoresEstimados,
  setValoresEstimados,
  observacoesChefe,
  setObservacoesChefe,
  setoresEdit,
  setSetoresEdit,
  centrosCustoEdit,
  setCentrosCustoEdit,
  prazosEdit,
  setPrazosEdit,
  complexidadesEdit,
  setComplexidadesEdit,
  tiposManutencao,
  setTiposManutencao,
  pecasSolicitadasEdicao,
  setPecasSolicitadasEdicao,
  termoBuscaPeca,
  setTermoBuscaPeca,
  pecaSelecionada,
  setPecaSelecionada,
  qtdPeca,
  setQtdPeca,
  produtosEstoque,
  departamentos,
  veiculos,
  tecnicos,
  tecnicoSelecionadoNome,
  onSelectTecnico,
  onAdicionarPeca,
  onRemoverPeca,
  onRejeitar,
  onSalvarApenasOrcamento,
  onAprovarLoteAdicional,
  onAprovarEEnviar
}) => {
  if (!osModal) return null;

  const modalKey = osModal.codigo || osModal.id;
  const valorAtual = parseFloat(valoresEstimados[modalKey]) || 0;
  const isAcima = osModal.tipo === 'INVESTIMENTO' && valorAtual > 5000;
  const hasPecasAdicionaisPendentes = osModal.pecasSolicitadas?.some(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL');
  const isPendenciaInicial = !osModal.situacao || osModal.situacao === 'AGUARDANDO_CHEFE_SETOR' || osModal.situacao === 'EMERGENCIA_CHEFE_SETOR';

  const totalPecas = pecasSolicitadasEdicao.reduce((acc, p) => {
    const itemEstoque = produtosEstoque.find(prod => prod.codigo === p.codigo);
    const val = Number(p.valor_unitario || p.preco || p.valorUnitario || itemEstoque?.valor_unitario || itemEstoque?.preco || 0);
    const qtd = Number(p.quantidade || 1);
    return acc + (val * qtd);
  }, 0);

  const prodsFiltrados = termoBuscaPeca.length >= 2 
    ? produtosEstoque.filter(p => 
        (p.descricao || '').toLowerCase().includes(termoBuscaPeca.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(termoBuscaPeca.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <button className={styles.btnBackModal} onClick={onClose}>
            <ChevronLeft size={20} /> Voltar
          </button>
          <button className={styles.btnCloseModal} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--cor-fundo-secundario)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--cor-borda-cartao)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} /> O.S. #{osModal.codigo}
          </h3>
        </div>

        {osModal.isEmergencia && (
          <div className={styles.badgeEmergencia}>
            <ShieldAlert size={18} /> CHAMADO EM CARÁTER DE EMERGÊNCIA - MÁQUINA PARADA
          </div>
        )}

        {osModal.pecasSolicitadas?.some(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL') && (
          <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f59e0b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>ALERTA DE ORÇAMENTO: NOVAS PEÇAS ADICIONADAS PELO TÉCNICO</strong>
              <span style={{ fontSize: '0.85rem' }}>O técnico responsável adicionou novos materiais a esta O.S. Revise o orçamento e clique em <strong>Aprovar Lote Adicional</strong> para unificar a entrega no Almoxarifado.</span>
            </div>
          </div>
        )}

        <div className={styles.modalSection}>
          <span className={styles.servicoLabel}>SERVIÇO SOLICITADO / PROBLEMA RELATADO:</span>
          <p className={styles.servicoTexto} style={{ fontSize: '0.9rem', marginTop: '4px', fontWeight: '500', lineHeight: '1.3' }}>
            {osModal.descricao || 'Sem descrição informada.'}
          </p>
          {osModal.motivo && (
            <>
              <span className={styles.servicoLabel} style={{ marginTop: '10px', display: 'block' }}>MOTIVO / CAUSA DA NECESSIDADE:</span>
              <p className={styles.servicoTexto} style={{ fontSize: '0.85rem', marginTop: '3px', fontStyle: 'italic', color: 'var(--cor-texto-secundario)', fontWeight: 'normal', lineHeight: '1.3' }}>
                {osModal.motivo}
              </p>
            </>
          )}
          <div className={styles.modalMetaInfoGrid}>
            <div>Solicitante (Chefe): <strong>{osModal.requisitante || 'Funcionário'}</strong></div>
            <div>Aberto por: <strong>{osModal.abertoPor || 'Desconhecido'}</strong></div>
            <div>Setor / CC: <strong>{osModal.setor || 'GERAL'}</strong></div>
            <div>Tipo de O.S.: <strong>{osModal.tipo || 'CORRETIVA'}</strong></div>
            <div>Data da Abertura: <strong>{osModal.dataCriacao ? new Date(osModal.dataCriacao).toLocaleDateString('pt-BR') : 'Hoje'}</strong></div>
          </div>
        </div>

        {/* PERÍODO REAL CALCULADO DE ATENDIMENTO */}
        {(osModal.dataInicio || osModal.dataFim) && (
          <div className={styles.periodoAtendimentoBox}>
            <span className={styles.periodoLabel}>
              <Clock size={15} color="var(--cor-destaque)" /> Período Real de Atendimento:
            </span>
            <div className={styles.periodoValueBox}>
              <span className={styles.periodoBadgeItem}>
                {osModal.dataInicio ? `${osModal.dataInicio.split('-').reverse().join('/')} ${osModal.horaInicio || ''}` : '-'}
              </span>
              <span className={styles.periodoDivisor}>até</span>
              <span className={styles.periodoBadgeItem}>
                {osModal.dataFim ? `${osModal.dataFim.split('-').reverse().join('/')} ${osModal.horaFim || ''}` : 'Em Andamento'}
              </span>
            </div>
          </div>
        )}

        {/* HISTÓRICO DO DIÁRIO DE BORDO */}
        {osModal.servicosExecutados && osModal.servicosExecutados.length > 0 && (
          <div style={{ backgroundColor: 'var(--cor-fundo-cartao)', padding: '16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--cor-texto-principal)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Diário de Bordo (O que já foi feito)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const baseServicos = JSON.parse(JSON.stringify(osModal.servicosExecutados));
                if (osModal.usouVeiculo === 'Sim' && baseServicos.length > 0) {
                  if (!baseServicos[0].veiculosUtilizados || baseServicos[0].veiculosUtilizados.length === 0) {
                    let listaVeic = osModal.veiculos ? [...osModal.veiculos] : [];
                    if (osModal.placaVeiculo && listaVeic.length === 0) {
                      listaVeic.push({ placa: osModal.placaVeiculo, kmInicial: osModal.kmInicial || '', kmFinal: osModal.kmFinal || '', km: osModal.kmRodado || '' });
                    }
                    listaVeic = listaVeic.filter(v => !(v.placa === osModal.centroCusto && (v.kmInicial === undefined || v.kmInicial === '')));
                    baseServicos[0].veiculosUtilizados = listaVeic;
                  }
                }
                return baseServicos.map((serv, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', backgroundColor: 'var(--cor-fundo-secundario)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                      <strong style={{ color: 'var(--cor-destaque)' }}>{serv.data ? serv.data.split('-').reverse().join('/') : ''}</strong>
                      <span style={{ fontWeight: 'bold' }}>
                        {(serv.horaInicio2 || (serv.horaFim1 && serv.horaFim && serv.horaFim1 !== serv.horaFim)) ? (
                          `${serv.horaInicio || ''} às ${serv.horaFim1 || ''} | ${serv.horaInicio2 || ''} às ${serv.horaFim || ''}`
                        ) : (
                          `${serv.horaInicio || ''} às ${serv.horaFim || serv.horaFim1 || ''}`
                        )}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', margin: '0 0 12px 0', color: 'var(--cor-texto-principal)' }}>{serv.descricao}</p>
                    
                    <div className={styles.diarioTurnoGrid}>
                      <div style={{ flex: 1, backgroundColor: 'var(--cor-fundo-principal)', padding: '8px', borderRadius: '4px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--cor-texto-principal)' }}>Equipe no turno:</strong>
                        {serv.maoDeObra?.map((m, i) => <div key={i}>• {m.nome} {m.horas ? `(${String(m.horas).replace(/h/gi, '')}h)` : ''}</div>)}
                      </div>
                      {serv.pecasUtilizadas && serv.pecasUtilizadas.length > 0 && (
                        <div style={{ flex: 1, backgroundColor: '#ecfdf5', padding: '8px', borderRadius: '4px', color: '#065f46', border: '1px solid #10b981' }}>
                          <strong style={{ display: 'block', marginBottom: '4px' }}>Peças Consumidas:</strong>
                          {serv.pecasUtilizadas.map((p, i) => <div key={i}>• {p.quantidade}x {p.descricao}</div>)}
                        </div>
                      )}
                      {serv.veiculosUtilizados && serv.veiculosUtilizados.length > 0 && (
                        <div style={{ flex: 1, backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px', color: '#1e40af', border: '1px solid #3b82f6' }}>
                          <strong style={{ display: 'block', marginBottom: '4px' }}>Veículos (Frota):</strong>
                          {serv.veiculosUtilizados.map((v, i) => <div key={i}>• {v.placa} ({v.km} KM)</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* DEVOLUÇÃO DE PEÇAS AO ALMOXARIFADO (SE EXISTIR) */}
        {osModal.pecasDevolvidas && osModal.pecasDevolvidas.length > 0 && (
          <div style={{ backgroundColor: '#fff7ed', padding: '14px', borderRadius: '8px', border: '1px solid #fdba74', marginBottom: '16px' }}>
            <h4 style={{ color: '#c2410c', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <PackageCheck size={18} color="#ea580c" /> Devolução de Peças / Insumos ao Almoxarifado
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#9a3412' }}>
              O técnico registrou a devolução física dos materiais não utilizados abaixo para retorno ao estoque.
            </p>
            <div className={styles.tabelaDevolucaoDesktop}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #fed7aa', color: '#9a3412' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Material</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Retiradas</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Aplicadas</th>
                    <th style={{ textAlign: 'center', padding: '6px', color: '#c2410c' }}>Devolvidas</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {osModal.pecasDevolvidas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px dashed #fed7aa' }}>
                      <td style={{ padding: '6px', fontWeight: 'bold', color: '#9a3412' }}>{p.descricao}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{p.qtdLiberada}x</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{p.qtdConsumida}x</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#c2410c' }}>{p.quantidadeDevolvida}x</td>
                      <td style={{ padding: '6px', fontStyle: 'italic', fontSize: '0.8rem', color: '#9a3412' }}>{p.motivoDevolucao || 'Sobra de manutenção'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.cardsDevolucaoMobile}>
              {osModal.pecasDevolvidas.map((p, i) => (
                <div key={i} className={styles.cardDevolucaoItem}>
                  <strong style={{ color: '#c2410c' }}>{p.descricao}</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>Retiradas: <strong>{p.qtdLiberada}x</strong></span>
                    <span>Aplicadas: <strong>{p.qtdConsumida}x</strong></span>
                    <span>Devolvidas: <strong style={{ color: '#c2410c' }}>{p.quantidadeDevolvida}x</strong></span>
                  </div>
                  <span style={{ fontStyle: 'italic', fontSize: '0.75rem', color: '#9a3412' }}>Motivo: {p.motivoDevolucao || 'Sobra de manutenção'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMULÁRIO DE CLASSIFICAÇÃO / SETOR / CC */}
        <div className={styles.modalGridRow}>
          <div className={styles.modalFormGroup}>
            <label>Setor de Execução (Correção) <span style={{ color: '#ef4444' }}>*</span>:</label>
            <select
              className={styles.modalInput}
              value={setoresEdit[modalKey] !== undefined ? setoresEdit[modalKey] : ''}
              onChange={(e) => setSetoresEdit({ ...setoresEdit, [modalKey]: e.target.value })}
            >
              <option value="" disabled>Selecione um setor</option>
              <option value="ELETRICA">ELETRICA</option>
              <option value="MECANICA">MECANICA</option>
              <option value="SERRALHEIRO">SERRALHEIRO</option>
              <option value="SERVICO GERAL">SERVICO GERAL</option>
              <option value="METALURGICA">METALURGICA</option>
              <option value="CONSTRUCAO CIVIL">CONSTRUCAO CIVIL</option>
              <option value="SLD">SLD</option>
              <option value="ELETRONICA">ELETRONICA</option>
              <option value="FABRICA DE RACAO">FABRICA DE RACAO</option>
              <option value="LOGISTICA">LOGISTICA</option>
            </select>
          </div>
          <div className={styles.modalFormGroup}>
            <label>Centro de Custo / Veículo <span style={{ color: '#ef4444' }}>*</span>:</label>
            <input
              type="text"
              className={styles.modalInput}
              value={centrosCustoEdit[modalKey] !== undefined ? centrosCustoEdit[modalKey] : ''}
              onChange={(e) => setCentrosCustoEdit({ ...centrosCustoEdit, [modalKey]: (e.target.value).toUpperCase() })}
              placeholder="Ex: Granja ou Placa"
              list="veiculos-cc-list-modal"
            />
            <datalist id="veiculos-cc-list-modal">
              {departamentos.map((dep, idx) => (
                <option key={`dep-${dep.codigo || dep.descricao}-${idx}`} value={dep.descricao}>{dep.descricao}</option>
              ))}
              {veiculos.map((v, idx) => (
                <option key={`veic-${v.placa}-${idx}`} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
              ))}
            </datalist>
          </div>
        </div>
        <div className={styles.modalGridRow}>
          <div className={styles.modalFormGroup}>
            <label>Prazo de Entrega / Previsão <span style={{ color: '#ef4444' }}>*</span>:</label>
            <input
              type="date"
              className={styles.modalInput}
              value={prazosEdit[modalKey] !== undefined ? prazosEdit[modalKey] : ''}
              onChange={(e) => setPrazosEdit({ ...prazosEdit, [modalKey]: e.target.value })}
            />
          </div>
          <div className={styles.modalFormGroup}>
            <label>Complexidade:</label>
            <select
              className={styles.modalInput}
              value={complexidadesEdit[modalKey] !== undefined ? complexidadesEdit[modalKey] : 'NORMAL'}
              onChange={(e) => setComplexidadesEdit({ ...complexidadesEdit, [modalKey]: e.target.value })}
            >
              <option value="BAIXA">BAIXA</option>
              <option value="NORMAL">NORMAL</option>
              <option value="ALTA">ALTA</option>
            </select>
          </div>
        </div>

        {/* FORMULÁRIO DE ORÇAMENTO */}
        <div className={styles.modalFormGroup}>
          <label>Tipo de Intervenção (Materiais):</label>
          <select 
            className={styles.modalInput}
            value={tiposManutencao[modalKey] || 'SEM_PECA'}
            onChange={(e) => setTiposManutencao({ ...tiposManutencao, [modalKey]: e.target.value })}
            style={{ fontWeight: 'bold' }}
          >
            <option value="SEM_PECA">APENAS MÃO DE OBRA (Sem peças)</option>
            <option value="COM_PECA">REQUER PEÇAS (Irá para o Almoxarifado)</option>
          </select>
        </div>

        {(tiposManutencao[modalKey] || 'SEM_PECA') === 'COM_PECA' && (
          <div className={styles.modalFormGroup} style={{ backgroundColor: 'var(--cor-fundo-secundario)', padding: '16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)' }}>
            <label style={{ color: 'var(--cor-destaque)' }}>Lista de Peças Solicitadas:</label>
            
            {!pecaSelecionada ? (
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Buscar peça por nome ou código..." 
                  value={termoBuscaPeca} 
                  onChange={e => setTermoBuscaPeca(e.target.value)} 
                  className={styles.modalInput}
                />
                {prodsFiltrados.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--cor-fundo-principal)', border: '1px solid var(--cor-destaque)', borderRadius: '6px', margin: '4px 0 0 0', padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {prodsFiltrados.map((p, idx) => (
                      <li key={`${p.codigo}-${idx}`} onClick={() => { setPecaSelecionada(p); setTermoBuscaPeca(''); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--cor-borda-cartao)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>{p.codigo}</strong> - {p.descricao}</span>
                        <span style={{ color: 'var(--cor-destaque)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_unitario || p.preco || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--cor-fundo-principal)', padding: '12px', borderRadius: '6px', border: '1px solid var(--cor-destaque)', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: '200px', fontSize: '0.9rem', color: 'var(--cor-texto-principal)' }}>
                  <strong>Selecionado:</strong> {pecaSelecionada.descricao} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pecaSelecionada.valor_unitario || pecaSelecionada.preco || 0)}/{obterRotuloUnidade(pecaSelecionada.unidade)})
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      min={permiteDecimais(pecaSelecionada.unidade) ? "0.01" : "1"}
                      step={permiteDecimais(pecaSelecionada.unidade) ? "0.01" : "1"}
                      value={qtdPeca} 
                      onChange={e => setQtdPeca(e.target.value)} 
                      style={{ width: '70px', padding: '8px', borderRadius: '6px', border: '1px solid var(--cor-borda-cartao)', textAlign: 'center', backgroundColor: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)' }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
                      {obterRotuloUnidade(pecaSelecionada.unidade)}
                    </span>
                  </div>
                  <button onClick={onAdicionarPeca} style={{ backgroundColor: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Adicionar</button>
                  <button onClick={() => setPecaSelecionada(null)} style={{ backgroundColor: 'transparent', color: 'var(--cor-texto-secundario)', border: '1px solid var(--cor-texto-secundario)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            {pecasSolicitadasEdicao.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {/* Tabela para Computador / Desktop */}
                <div className={styles.tabelaPecasDesktop}>
                  <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap', width: '90px' }}>Código</th>
                        <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)' }}>Descrição</th>
                        <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap', width: '70px' }}>Qtd</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap', width: '100px' }}>Valor Unit.</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap', width: '100px' }}>Total Peça</th>
                        <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap', width: '140px' }}>Status</th>
                        <th style={{ width: '40px', borderBottom: '1px solid var(--cor-borda-cartao)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecasSolicitadasEdicao.map((p, idx) => {
                        const itemEstoque = produtosEstoque.find(prod => prod.codigo === p.codigo);
                        const un = p.unidade || itemEstoque?.unidade || 'UN';
                        const valUnit = Number(p.valor_unitario || p.preco || p.valorUnitario || itemEstoque?.valor_unitario || itemEstoque?.preco || 0);
                        const totalItem = valUnit * Number(p.quantidade || 1);
                        return (
                          <tr key={`${p.codigo}-${idx}`} style={p.status === 'AGUARDANDO_CHEFE_ADICIONAL' ? { backgroundColor: '#fffbeb' } : { borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '8px 4px' }}>
                              <strong style={{ color: 'var(--cor-destaque)' }}>{p.codigo}</strong>
                            </td>
                            <td style={{ padding: '8px 4px', fontWeight: '500', color: 'var(--cor-texto-principal)', wordBreak: 'break-word', lineHeight: '1.3' }}>
                              {p.descricao}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', padding: '8px 4px' }}>
                              {formatarQuantidadeComUnidade(p.quantidade, un)}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '8px 4px' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valUnit)}/{obterRotuloUnidade(un)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--cor-destaque)', fontSize: '0.85rem', whiteSpace: 'nowrap', padding: '8px 4px' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalItem)}
                            </td>
                            <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', padding: '8px 4px', color: p.status === 'AGUARDANDO_CHEFE_ADICIONAL' ? '#d97706' : 'var(--cor-texto-secundario)' }}>
                              {p.status === 'AGUARDANDO_CHEFE_ADICIONAL' ? 'NOVO LOTE (PENDENTE)' : p.status}
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'center' }}>
                              {p.status === 'AGUARDANDO_CHEFE_ADICIONAL' || isPendenciaInicial ? (
                                <button onClick={() => onRemoverPeca(p.codigo)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '4px' }}>
                                  <Trash2 size={16} />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Lista em Cards Nativos para Celular */}
                <div className={styles.cardsPecasMobile}>
                  {pecasSolicitadasEdicao.map((p, idx) => {
                    const itemEstoque = produtosEstoque.find(prod => prod.codigo === p.codigo);
                    const un = p.unidade || itemEstoque?.unidade || 'UN';
                    const valUnit = Number(p.valor_unitario || p.preco || p.valorUnitario || itemEstoque?.valor_unitario || itemEstoque?.preco || 0);
                    const totalItem = valUnit * Number(p.quantidade || 1);
                    return (
                      <div key={`mob-${p.codigo}-${idx}`} className={styles.cardPecaItem}>
                        <div className={styles.cardPecaHeader}>
                          <span className={styles.codigoBadge}>{p.codigo}</span>
                          <span className={styles.statusBadgeMob}>
                            {p.status === 'AGUARDANDO_CHEFE_ADICIONAL' ? 'NOVO LOTE (PENDENTE)' : (p.status || 'AGUARDANDO ALMOXARIFADO')}
                          </span>
                          {(p.status === 'AGUARDANDO_CHEFE_ADICIONAL' || isPendenciaInicial) && (
                            <button onClick={() => onRemoverPeca(p.codigo)} className={styles.btnTrashMob} title="Remover Peça">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <p className={styles.cardPecaDesc}>{p.descricao}</p>
                        <div className={styles.cardPecaMeta}>
                          <span>Qtd: <strong>{formatarQuantidadeComUnidade(p.quantidade, un)}</strong></span>
                          <span>Unit: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valUnit)}/{obterRotuloUnidade(un)}</strong></span>
                          <span>Total: <strong className={styles.totalDestaque}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalItem)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CAIXA DE TOTAL DE PEÇAS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--cor-fundo-principal)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--cor-destaque)', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--cor-texto-principal)' }}>Total em Peças Solicitadas:</span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--cor-destaque)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPecas)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.modalFormGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
            <label style={{ margin: 0 }}>Valor Estimado do Serviço e Peças (R$):</label>
            {totalPecas > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>
                (Subtotal Peças: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPecas)})
              </span>
            )}
          </div>
          <input 
            type="number"
            step="0.01"
            className={styles.modalInput}
            placeholder="0,00"
            value={valoresEstimados[modalKey] !== undefined ? valoresEstimados[modalKey] : ''}
            onChange={(e) => setValoresEstimados({ ...valoresEstimados, [modalKey]: e.target.value })}
          />
        </div>

        <div className={styles.modalFormGroup} style={{ marginBottom: '24px' }}>
          <label>Técnico / Mecânico Responsável <span style={{ color: '#ef4444' }}>*</span>:</label>
          
          <SeletorTecnico 
            tecnicos={tecnicos}
            valorSelecionado={tecnicoSelecionadoNome}
            onSelect={(nome) => onSelectTecnico(modalKey, nome)}
            placeholder="DIGITE O NOME DO TÉCNICO PARA BUSCAR..."
          />
        </div>

        {isAcima && (
          <div className={styles.alertAlcada}>
            <Send size={18} /> Orçamento superior a R$ 5.000,00 ou Investimento. Esta O.S. será direcionada à Aprovação da Diretoria.
          </div>
        )}

        {/* RODAPÉ E AÇÕES DO MODAL */}
        <div className={styles.modalFooterButtons}>
          {isPendenciaInicial && (
            <button 
              className={styles.btnRecusar}
              onClick={() => onRejeitar(osModal)}
            >
              <XCircle size={18} /> Recusar
            </button>
          )}

          {hasPecasAdicionaisPendentes ? (
            <button 
              className={styles.btnAprovar}
              onClick={() => onAprovarLoteAdicional(osModal)}
            >
              <PackageCheck size={18} /> Aprovar Lote Adicional (Enviar Almoxarifado)
            </button>
          ) : isPendenciaInicial ? (
            isAcima ? (
              <button 
                className={styles.btnEncaminharDiretoria}
                onClick={() => onAprovarEEnviar(osModal, true)}
              >
                <Send size={18} /> Enviar p/ Diretoria (&gt; 5k)
              </button>
            ) : (
              <button 
                className={styles.btnAprovar}
                onClick={() => onAprovarEEnviar(osModal, false)}
              >
                <CheckCircle size={18} /> Autorizar &amp; Mandar ao Técnico
              </button>
            )
          ) : (
            <button 
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => onSalvarApenasOrcamento(osModal)}
            >
              Salvar Alterações
            </button>
          )}

          {isPendenciaInicial && !hasPecasAdicionaisPendentes && (
            <button 
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => onSalvarApenasOrcamento(osModal)}
            >
              Salvar Rascunho
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalOrcamentoChefeSetor;
