// HistoricoTabela.jsx
import React, { useState } from "react";

const HistoricoTabela = ({ dados }) => {
  const [mostrarTabela, setMostrarTabela] = useState(false);

  // 1. Lista de colunas atualizada para refletir os novos campos e a ordem
  const colunas = [
    "Data de Manutenção",
    "Nome do Agente",
    "Responsável Imóvel", // Corresponde a 'Responsavel_Imovel_Historico'
    "Telef.",              // Novo campo
    "Ciclo",               // Corresponde a 'Ciclo_Historico'
    "Nível de água na EDL",// Corresponde a 'Nivel_de_agua_na_EDL_Historico'
    "Tipo de Novidades",   // Corresponde a 'Tipo_de_Novidades_Historico'
    "Troca Rede",          // Novo campo
    "Qtd. Larvas",         // Novo campo
    "Observações",         // Corresponde a 'Observacoes_Historico'
  ];

  const linhas = [];

  for (let i = 1; i <= 9; i++) {
    const data = dados[`Data_de_Manutencao_${i}`];
    if (data && data.toLowerCase() !== "nan" && data.trim() !== "") {
      // 2. Extração de linhas atualizada com os novos nomes de chaves
      linhas.push({
        data,
        agente: dados[`Nome_do_Agente_${i}`] || "-",
        responsavel: dados[`Responsavel_Imovel_Historico_${i}`] || "-", // Nome da chave atualizado
        telefones: dados[`Telefones_Historico_${i}`] || "-",          // Novo campo
        ciclo: dados[`Ciclo_Historico_${i}`] || "-",                  // Nome da chave atualizado
        agua: dados[`Nivel_de_agua_na_EDL_Historico_${i}`] || "-",    // Nome da chave atualizado
        novidades: dados[`Tipo_de_Novidades_Historico_${i}`] || "-",  // Nome da chave atualizado
        trocaRede: dados[`Troca_Rede_${i}`] || "-",                   // Novo campo
        qtdLarvas: dados[`Qtd_Larvas_${i}`] || "-",                   // Novo campo
        obs: dados[`Observacoes_Historico_${i}`] || "-",              // Nome da chave atualizado
      });
    }
  }

  return (
    <div>
      <button
        onClick={() => setMostrarTabela(true)}
        style={{
          display: "inline-block",
          padding: "10px 20px",
          backgroundColor: "#17a2b8",
          color: "white",
          textDecoration: "none",
          borderRadius: "5px",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Histórico
      </button>

      {mostrarTabela && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2>Histórico de Manutenções</h2>
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  {colunas.map((col, i) => {
                    let larguraMinima = "150px";

                    // 4. Ajuste opcional para larguras mínimas e alinhamento
                    if (i === 3 || i === 4 || i === 5 || i === 7 || i === 8) { // Telef., Ciclo, Nível de Água, Troca Rede, Qtd. Larvas
                      larguraMinima = "80px"; // Largura menor para campos mais curtos
                    }
                    if (i === 9) { // Observações
                      larguraMinima = "200px"; // Largura maior para observações
                    }

                    return (
                      <th
                        key={i}
                        style={{
                          minWidth: larguraMinima,
                          textAlign: "left",
                          whiteSpace: "normal",
                        }}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#fff9c4" : "#ffffff", // alterna cores
                    }}
                  >
                    <td>{linha.data}</td>
                    <td>{linha.agente}</td>
                    <td>{linha.responsavel}</td>
                    <td style={{ textAlign: "center" }}>{linha.telefones}</td> {/* Novo campo */}
                    <td style={{ textAlign: "center" }}>{linha.ciclo}</td>
                    <td style={{ textAlign: "center" }}>{linha.agua}</td>
                    <td>{linha.novidades}</td>
                    <td style={{ textAlign: "center" }}>{linha.trocaRede}</td> {/* Novo campo */}
                    <td style={{ textAlign: "center" }}>{linha.qtdLarvas}</td> {/* Novo campo */}
                    <td>{linha.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setMostrarTabela(false)}
              style={{ marginTop: 10 }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoTabela;
