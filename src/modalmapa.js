// ARQUIVO: modalmapa.js (VERSÃO CORRIGIDA)

import React, { useState, useMemo } from "react"; // <-- MUDANÇA 1: Importa o useMemo
import MapboxComponent from "./MapboxComponent";
import { FaWhatsapp } from "react-icons/fa";
import HistoricoTabela from "./HistoricoTabela";
import ImagemModal from "./ImagemModal";

const ModalMapa = ({ currentLocation, historico, onClose }) => {
  const [destinoSelecionado, setDestinoSelecionado] = useState(null);
  const [modalBaixoAberto, setModalBaixoAberto] = useState(false);
  const [mostrarImagem, setMostrarImagem] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [excludedDestinations, setExcludedDestinations] = useState([]);

  const openImageModal = (imageUrl) => {
    setModalImageUrl(imageUrl);
    setModalVisivel(true);
  };
  const closeImageModal = () => {
    setModalVisivel(false);
    setModalImageUrl(null);
  };

  const normalizePhoneNumbers = (phone) => {
    if (!phone) return [];
    if (typeof phone === "string") return [phone];
    if (Array.isArray(phone))
      return phone.filter((num) => typeof num === "string");
    return [];
  };

  const handleExcluirClick = () => {
    if (!destinoSelecionado) return;
    if (
      window.confirm(
        `Deseja realmente remover o marcador "${destinoSelecionado.Endereço}" da rota?`
      )
    ) {
      setExcludedDestinations((prev) => [...prev, destinoSelecionado.Endereço]);
      setDestinoSelecionado(null);
      setModalBaixoAberto(false);
    }
  };

  // ✅ CORREÇÃO: Use useMemo para garantir que o array 'origin' seja estável
  const origin = currentLocation
    ? [currentLocation.lng, currentLocation.lat]
    : null;

  // ✅ CORREÇÃO: Use useMemo para garantir que a lista de destinos seja estável
  const destinationsParaMapa = useMemo(() => {
    // <-- MUDANÇA 3: Envolve a lógica dos destinos com useMemo
    return historico
      .filter((item) => !excludedDestinations.includes(item.endereco))
      .filter((item) => item.mapa && item.mapa.startsWith("http"))
      .map((item) => {
        const match = item.mapa.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          return {
            coords: [parseFloat(match[2]), parseFloat(match[1])],
            Endereço: item.endereco || "",
            Morador: item.responsavel || "",
            Telefone: item.telefone || "",
            ...item,
          };
        }
        return null;
      })
      .filter((dest) => dest !== null);
  }, [historico, excludedDestinations]); // As dependências garantem que só recalcula se o histórico ou exclusões mudarem

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        height: "100dvh",
        maxHeight: "1200px",
        backgroundColor: "white",
        borderRadius: "8px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 9999,
          background: "white",
          border: "1px solid #ccc",
          padding: "5px 10px",
          cursor: "pointer",
          borderRadius: 4,
        }}
      >
        Fechar
      </button>

      <div style={{ height: "60vh", borderBottom: "1px solid #ccc" }}>
        <MapboxComponent
          origin={origin} // <-- MUDANÇA 4: Usa a variável 'origin' memoizada
          destinations={destinationsParaMapa} // <-- MUDANÇA 5: Usa a variável 'destinations' memoizada
          isVisible={true}
          onMarkerClick={(destino) => {
            setDestinoSelecionado(destino);
            setModalBaixoAberto(true);
          }}
        />
      </div>

      <div
        style={{
          height: "40vh",
          padding: "10px",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {modalBaixoAberto && destinoSelecionado ? (
          <div className="modal-baixo">
            {/* O resto do seu código permanece igual */}
            <p>
              <strong>Endereço:</strong> {destinoSelecionado.endereco}
            </p>
            <p>
              <strong>Morador:</strong> {destinoSelecionado.responsavel}
            </p>

            {destinoSelecionado.imagem &&
              destinoSelecionado.imagem.startsWith("https://") && (
                <button
                  onClick={() => openImageModal(destinoSelecionado.imagem)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "40px",
                    position: "absolute",
                    top: "150px",
                    right: "20px",
                    zIndex: 999,
                  }}
                  title="Ver Imagem"
                >
                  📷
                </button>
              )}

            <ImagemModal
              imagemUrl={modalImageUrl}
              onClose={closeImageModal}
              visivel={modalVisivel}
            />

            <p>
              <strong>Telefone:</strong>{" "}
              {normalizePhoneNumbers(destinoSelecionado.telefone).map(
                (number, index) => (
                  <React.Fragment key={index}>
                    {number &&
                    number !== "nan" &&
                    number.trim().match(/^\d+$/) ? (
                      <a href={`tel:${number}`}>{number}</a>
                    ) : (
                      <span>{number || "Sem Telefone"}</span>
                    )}
                    {index <
                      normalizePhoneNumbers(destinoSelecionado.telefone)
                        .length -
                        1 && ", "}
                  </React.Fragment>
                )
              )}
            </p>

            <p>
              <strong>WhatsApp:</strong>
              {normalizePhoneNumbers(destinoSelecionado.telefone).map(
                (number, index) => (
                  <React.Fragment key={index}>
                    {number.trim().match(/^\d+$/) ? (
                      <a
                        href={`https://wa.me/${number.trim()}`}
                        style={styles.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaWhatsapp size={20} color="green" />
                      </a>
                    ) : (
                      "Sem WhatsApp"
                    )}
                    {index <
                      normalizePhoneNumbers(destinoSelecionado.telefone)
                        .length -
                        1 && " "}
                  </React.Fragment>
                )
              )}
            </p>

            <p>
              <strong>Trecho:</strong> {destinoSelecionado.trecho}
            </p>
            <HistoricoTabela dados={destinoSelecionado} />
            <ImagemModal
              imagemUrl={mostrarImagem ? destinoSelecionado.imagem : null}
              onClose={() => setMostrarImagem(false)}
            />

            <button onClick={handleExcluirClick} style={styles.botaoExcluir}>
              Excluir da rota
            </button>
          </div>
        ) : (
          <p
            style={{
              color: "green",
              fontSize: "24px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Clique em um marcador no mapa para ver os detalhes.
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  whatsapp: {
    marginLeft: "10px",
    textDecoration: "none",
  },
  botaoExcluir: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "7px 10px",
    cursor: "pointer",
    marginLeft: "1px",
    marginTop: "20px",
    fontSize: "14px",
  },
};

export default ModalMapa;
