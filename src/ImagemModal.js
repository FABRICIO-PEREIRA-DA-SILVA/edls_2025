import React, { useState, useEffect } from "react";

// Estilos para o modal e para o efeito de carregamento
const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  modalContent: {
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    padding: "2px",
    borderRadius: "8px",
    maxWidth: "90%",
    maxHeight: "90%",
  },
  closeButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    cursor: "pointer",
    fontWeight: "bold",
    zIndex: 10001,
  },
  imageContainer: {
    position: "relative",
    minWidth: "300px", // Tamanho mínimo para o container
    minHeight: "200px",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "80vh",
    display: "block",
    borderRadius: "4px",
  },
  imageLoading: {
    opacity: 0, // A imagem de alta qualidade começa invisível
    transition: "opacity 0.3s ease-in-out", // Efeito de fade-in
  },
  imageLoaded: {
    opacity: 1, // Torna a imagem de alta qualidade visível
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
};

const ImagemModal = ({ imagemUrl, onClose, visivel }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Reseta o estado de carregamento sempre que a URL da imagem mudar
  useEffect(() => {
    if (visivel) {
      setIsLoaded(false);
    }
  }, [imagemUrl, visivel]);

  if (!visivel) {
    return null;
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>
          X
        </button>
        <div style={styles.imageContainer}>
          {/* 1. Placeholder: Fica visível enquanto a imagem não carrega */}
          {!isLoaded && (
            <div style={styles.placeholder}>
              <span>Carregando...</span> {/* Ou um spinner animado */}
            </div>
          )}

          {/* 2. Imagem Real: Carrega em segundo plano */}
          <img
            src={imagemUrl}
            alt="Visualização"
            // Aplica o estilo de fade-in quando a imagem carregar
            style={{
              ...styles.image,
              ...(isLoaded ? styles.imageLoaded : styles.imageLoading),
            }}
            // Quando o carregamento terminar, atualiza o estado
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default ImagemModal;
