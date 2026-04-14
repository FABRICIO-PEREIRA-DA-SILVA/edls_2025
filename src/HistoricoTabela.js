// HistoricoTabela.jsx
import React, { useState } from "react";

const HistoricoTabela = ({ dados }) => {
  const [mostrarTabela, setMostrarTabela] = useState(false);

  // 1. Processamento das Manutenções Normais
  const linhasManutencao = [];
  for (let i = 1; i <= 20; i++) {
    const data = dados[`Data_Manutencao_${i}`];
    if (data && data !== "nan" && data.trim() !== "") {
      linhasManutencao.push({
        data,
        agente: dados[`Agente_${i}`] || "-",
        responsavel: dados[`Resp_Imovel_${i}`] || "-",
        telefones: dados[`Telef_${i}`] || "-",
        ciclo: dados[`Ciclo_${i}`] || "-",
        agua: dados[`Nivel_Agua_${i}`] || "-",
        novidades: dados[`Tipo_Novidades_${i}`] || "-",
        trocaRede: dados[`Troca_Rede_${i}`] || "-",
        qtdLarvas: dados[`Qtd_Larvas_${i}`] || "-",
        obs: dados[`Obs_Manutencao_${i}`] || "-",
      });
    }
  }

  // 2. Processamento das Pendências
  const linhasPendencias = [];
  for (let i = 1; i <= 15; i++) {
    // Agora o React busca pela chave correta que o Python gerou
    const dataP = dados[`Data_Pend_${i}`]; 
    if (dataP && dataP !== "nan" && dataP.trim() !== "") {
      linhasPendencias.push({
        data: dataP,
        agente: dados[`Agente_Pend_${i}`] || "-",
        responsavel: dados[`Resp_Pend_${i}`] || "-",
        ciclo: dados[`Ciclo_Pend_${i}`] || "-",
        trocaRede: dados[`Troca_Rede_Pend_${i}`] || "-",
        agua: dados[`Nivel_Agua_Pend_${i}`] || "-",
        novidades: dados[`Tipo_Novid_Pend_${i}`] || "-",
        qtdLarvas: dados[`Qtd_Larvas_Pend_${i}`] || "-",
        obs: dados[`Obs_Pend_${i}`] || "-",
      });
    }
  }

  const cabecalhoEstilo = {
    backgroundColor: "#f8f9fa",
    textAlign: "left",
    padding: "8px",
    borderBottom: "2px solid #dee2e6"
  };

  return (
    <div>
      <button
        onClick={() => setMostrarTabela(true)}
        style={{ padding: "10px 20px", backgroundColor: "#17a2b8", color: "white", borderRadius: "5px", border: "none", cursor: "pointer" }}
      >
        Histórico
      </button>

      {mostrarTabela && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 8, maxHeight: "90vh", maxWidth: "95vw", overflow: "auto" }}>
            
            <h2 style={{ textAlign: "left" }}>Histórico Completo</h2>
            
            <table border="1" cellPadding="5" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ backgroundColor: "#e9ecef" }}>
                  <th style={cabecalhoEstilo}>Data</th>
                  <th style={cabecalhoEstilo}>Agente</th>
                  <th style={cabecalhoEstilo}>Responsável</th>
                  <th style={cabecalhoEstilo}>Telef.</th>
                  <th style={cabecalhoEstilo}>Ciclo</th>
                  <th style={cabecalhoEstilo}>Nível Água</th>
                  <th style={cabecalhoEstilo}>Novidades</th>
                  <th style={cabecalhoEstilo}>Troca Rede</th>
                  <th style={cabecalhoEstilo}>Qtd. Larvas</th>
                  <th style={cabecalhoEstilo}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {/* Renderiza Manutenções */}
                {linhasManutencao.map((l, i) => (
                  <tr key={`man-${i}`} style={{ backgroundColor: i % 2 === 0 ? "#fff9c4" : "#fff" }}>
                    <td>{l.data}</td>
                    <td>{l.agente}</td>
                    <td>{l.responsavel}</td>
                    <td>{l.telefones}</td>
                    <td>{l.ciclo}</td>
                    <td>{l.agua}</td>
                    <td>{l.novidades}</td>
                    <td>{l.trocaRede}</td>
                    <td>{l.qtdLarvas}</td>
                    <td>{l.obs}</td>
                  </tr>
                ))}

                {/* Linha de Separação e Título de Pendências */}
                {linhasPendencias.length > 0 && (
                  <>
                    <tr style={{ height: "40px" }}><td colSpan="9" style={{ border: "none" }}></td></tr>
                    <tr style={{ backgroundColor: "#f7c182" }}>
                      <td colSpan="9" style={{ fontWeight: "bold", padding: "10px", textAlign: "left", fontSize: "1.1rem" }}>
                        Histórico de Pendências
                      </td>
                    </tr>

                    {/* Cabeçalho das pendências */}
                    <tr style={{ backgroundColor: "#e9882a", color: "black" }}>
                      <th style={cabecalhoEstilo}>Data de Manutenção</th>
                      <th style={cabecalhoEstilo}>Nome do Agente</th>
                      <th style={cabecalhoEstilo}>Responsável Imóvel</th>
                      <th style={cabecalhoEstilo}>Ciclo</th>
                      <th style={cabecalhoEstilo}>Troca Rede</th>
                      <th style={cabecalhoEstilo}>Nível de Água na EDL</th>
                      <th style={cabecalhoEstilo}>Tipo de Novidades</th>
                      <th style={cabecalhoEstilo}>Qtde. Larvas</th>
                      <th style={cabecalhoEstilo}>Observações</th>
                    </tr>

                    {linhasPendencias.map((l, i) => (
                      <tr key={`pend-${i}`} style={{ backgroundColor: "#fdf2e2" }}>
                        <td>{l.data}</td>
                        <td>{l.agente}</td>
                        <td>{l.responsavel}</td>
                        <td>{l.ciclo}</td>
                        <td>{l.trocaRede}</td>
                        <td>{l.agua}</td>
                        <td>{l.novidades}</td>
                        <td>{l.qtdLarvas}</td>
                        <td>{l.obs}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>

            <button onClick={() => setMostrarTabela(false)} style={{ marginTop: 20, padding: "8px 16px", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoTabela;