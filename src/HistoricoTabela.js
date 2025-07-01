// HistoricoTabela.jsx
import React, { useState } from "react";

const HistoricoTabela = ({ dados }) => {
  const [mostrarTabela, setMostrarTabela] = useState(false);

  const colunas = [
    "Data de Manutenção",
    "Nome do Agente",
    "Responsável Imóvel",
    "Ciclo",
    "Nível de água na EDL",
    "Tipo de Novidades",
    "Observações",
  ];

  const linhas = [];

  for (let i = 1; i <= 9; i++) {
    const data = dados[`Data_de_Manutencao_${i}`];
    if (data && data.toLowerCase() !== "nan" && data.trim() !== "") {
      linhas.push({
        data,
        agente: dados[`Nome_do_Agente_${i}`] || "-",
        responsavel: dados[`Responsavel_Imovel_${i}`] || "-",
        ciclo: dados[`Ciclo_${i}`] || "-",
        agua: dados[`Nivel_de_agua_na_EDL_${i}`] || "-",
        novidades: dados[`Tipo_de_Novidades_${i}`] || "-",
        obs: dados[`Observacoes_${i}`] || "-",
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
          backgroundColor: "#17a2b8" /* Cor de fundo do botão */,
          color: "white" /* Cor do texto */,
          textDecoration: "none" /* Remove o sublinhado padrão do link */,
          borderRadius: "5px" /* Borda arredondada */,
          border: "none" /* Remove a borda padrão */,
          cursor: "pointer" /* Indica que é clicável */,
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

                    if (i === 3) {
                      // 5 é o índice da coluna "Tipo de Novidades"
                      larguraMinima = "20px";
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
                    <td style={{ textAlign: "center" }}>{linha.ciclo}</td>
                    <td style={{ textAlign: "center" }}>{linha.agua}</td>
                    <td>{linha.novidades}</td>
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
