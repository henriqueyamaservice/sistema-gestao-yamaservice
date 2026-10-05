import React, { useState, useEffect } from 'react';
import { Gauge, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './index.module.css';

const calcularStatusLocal = (kmUltimo, intervalo, kmInput) => {
  if (!kmUltimo || !intervalo) return null;
  const kU = parseFloat(kmUltimo) || 0;
  const i = parseFloat(intervalo) || 0;
  const kI = parseFloat(kmInput) || 0;

  const alvo = kU + i;
  if (kI <= 0) return { alvo, pct: 0, status: 'vazio', falta: i };

  const falta = alvo - kI;
  const percorrido = kI - kU;
  let pct = (percorrido / i) * 100;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  let status = 'em_dia';
  let cor = 'var(--cor-sucesso)';
  let icone = <CheckCircle size={14} />;

  if (falta <= 0) {
    status = 'atrasado';
    cor = 'var(--cor-erro)';
    icone = <AlertCircle size={14} />;
  } else if (falta <= i * 0.1) {
    status = 'atencao';
    cor = '#f59e0b';
    icone = <AlertTriangle size={14} />;
  }

  return { alvo, pct, status, falta, cor, icone };
};

const InputOdometroInteligente = ({ 
  veiculo, 
  value, 
  onChange, 
  onError, 
  readOnly = false,
  label = "Odômetro / Horímetro Atual"
}) => {
  const [erroRetrocesso, setErroRetrocesso] = useState(false);
  const [avisoRetroativo, setAvisoRetroativo] = useState(false);
  const isHorimetro = veiculo && (veiculo.tipoMedicao === 'Horas' || veiculo.tipoMedicao === 'HORAS' || veiculo.tipoEquipamento === 'MAQUINA');
  const sufixo = isHorimetro ? 'h' : 'km';

  // O KM histórico do veículo é o maior entre kmAtual, kmTrocaOleo, kmRevisao
  const kmAtualDB = veiculo ? Math.max(
    parseFloat(veiculo.kmAtual) || 0,
    parseFloat(veiculo.kmTrocaOleo) || 0,
    parseFloat(veiculo.kmRevisao) || 0
  ) : 0;

  // Atualizar Erro de Retrocesso
  useEffect(() => {
    if (!veiculo || !value) {
      setErroRetrocesso(false);
      setAvisoRetroativo(false);
      if (onError) onError(false);
      return;
    }
    const numValue = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!isNaN(numValue) && numValue > 0 && numValue < kmAtualDB) {
      const diferenca = kmAtualDB - numValue;
      if (diferenca <= 2000) {
        // Retroativo dentro do limite -> AVISO visual, NÃO BLOQUEIA
        setErroRetrocesso(false);
        setAvisoRetroativo(true);
        if (onError) onError(false);
      } else {
        // Retrocesso fora do limite -> ERRO, BLOQUEIA
        setErroRetrocesso(true);
        setAvisoRetroativo(false);
        if (onError) onError(true);
      }
    } else {
      setErroRetrocesso(false);
      setAvisoRetroativo(false);
      if (onError) onError(false);
    }
  }, [value, kmAtualDB, veiculo, onError]);

  const handleChange = (e) => {
    if (readOnly) return;
    let v = e.target.value.replace(/[^0-9.,]/g, '');
    v = v.replace(',', '.');
    onChange(v);
  };

  const statusOleo = veiculo && veiculo.intervaloTrocaOleo 
    ? calcularStatusLocal(veiculo.kmTrocaOleo || veiculo.kmAtual, veiculo.intervaloTrocaOleo, value || veiculo.kmAtual) 
    : null;

  return (
    <div className={styles.container}>
      <label>{label} {veiculo ? `(${sufixo})` : ''}</label>
      
      <div className={styles.inputWrapper}>
        <Gauge className={styles.inputIcon} size={18} />
        <input
          type="text"
          className={`${styles.input} ${erroRetrocesso ? styles.inputError : ''}`}
          placeholder={`Histórico: ${kmAtualDB > 0 ? kmAtualDB : '--'} ${sufixo}`}
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          autoComplete="off"
        />
      </div>

      {erroRetrocesso && (
        <div className={styles.errorText}>
          <AlertCircle size={16} />
          Bloqueado: Diferença abusiva de KM. Valor não pode ser menor que o histórico ({kmAtualDB} {sufixo}).
        </div>
      )}

      {avisoRetroativo && (
        <div className={styles.errorText} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: '#f59e0b' }}>
          <AlertTriangle size={16} />
          Lançamento Retroativo: KM informado é menor que o último registro ({kmAtualDB} {sufixo}). Ele será salvo apenas no histórico desta O.S.
        </div>
      )}

      {/* HEALTH BAR (Aparece se houver configuração de óleo) */}
      {statusOleo && !erroRetrocesso && value && (
        <div className={styles.healthContainer}>
          <div className={styles.healthHeader}>
            <span>{statusOleo.icone} Troca de Óleo</span>
            <span style={{ color: statusOleo.cor }}>{statusOleo.pct.toFixed(0)}% Utilizado</span>
          </div>
          
          <div className={styles.healthBarWrapper}>
            <div 
              className={styles.healthBarFill} 
              style={{ width: `${statusOleo.pct}%`, backgroundColor: statusOleo.cor }}
            />
          </div>

          <div className={styles.healthDetails} style={{ color: statusOleo.cor }}>
            {statusOleo.status === 'atrasado' ? (
              <span>Vencido em {Math.abs(statusOleo.falta).toLocaleString('pt-BR')} {sufixo}!</span>
            ) : statusOleo.status === 'vazio' ? (
              <span>Próxima: {statusOleo.alvo.toLocaleString('pt-BR')} {sufixo}</span>
            ) : (
              <span>Faltam {statusOleo.falta.toLocaleString('pt-BR')} {sufixo}</span>
            )}
            <span>Alvo: {statusOleo.alvo.toLocaleString('pt-BR')} {sufixo}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputOdometroInteligente;
