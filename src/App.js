import React, { useState, useEffect } from "react";
import ImagemModal from "./ImagemModal";
//import MapboxComponent from "./MapboxComponent";
import { FaWhatsapp } from "react-icons/fa";
import bancoDeDados from "./bancoDeDados";
import "./styles.css"; // Importe este arquivo CSS na mesma pasta para a animação (opcional)
import { textoPadrao } from "./textoPadrao.js"; // Importando o texto padrão
import HistoricoTabela from "./HistoricoTabela";
import ModalMapa from "./modalmapa";

export default function App() {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [dados, setDados] = useState(bancoDeDados);
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarImagem, setMostrarImagem] = useState(false);
  const [historico, setHistorico] = useState(() => {
    const dadosSalvos = localStorage.getItem("historico");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });
  const [sugestoes, setSugestoes] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [mensagem, setMensagem] = useState(() => {
    return localStorage.getItem("mensagem") || "";
  });
  const [mostrarMensagem, setMostrarMensagem] = useState(false);
  const [informativoAtivo, setInformativoAtivo] = useState(false);
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [carregandoMapaInterno, setCarregandoMapaInterno] = useState(false);
  const [carregandoRotaExterna, setCarregandoRotaExterna] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [currentLocationTraçarRota, setCurrentLocationTraçarRota] =
    useState(null);
  const [currentLocationMapaInterno, setCurrentLocationMapaInterno] =
    useState(null);
  //const [mapVisible, setMapVisible] = useState(true);
  //const [destinoSelecionado, setDestinoSelecionado] = useState(null);
  //const [modalBaixoAberto, setModalBaixoAberto] = useState(false);
  // NOVO useEffect para controlar o overflow do body
  useEffect(() => {
    if (isMapVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = ""; // Volta ao normal
    }
    // Cleanup function para garantir que o overflow seja restaurado
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMapVisible]); // Depende do estado isMapVisible

  const handleVerNoMapaClick = () => {
    setCarregandoMapaInterno(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocationMapaInterno({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsMapVisible(true);
        setCarregandoMapaInterno(false);
      },
      (error) => {
        console.error("Erro ao obter a localização:", error);
        alert("Não foi possível obter sua localização.");
        setCarregandoMapaInterno(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const animarBotao = (e) => {
    e.target.classList.add("pulse-click");
    setTimeout(() => e.target.classList.remove("pulse-click"), 200);
  };

  const normalizePhoneNumbers = (phone) => {
    if (!phone) return [];
    if (typeof phone === "string") {
      return [phone];
    }
    if (Array.isArray(phone)) {
      return phone.filter((num) => typeof num === "string");
    }
    return [];
  };

  useEffect(() => {
    localStorage.setItem("historico", JSON.stringify(historico));
  }, [historico]);

  useEffect(() => {
    localStorage.setItem("mensagem", mensagem);
  }, [mensagem]);

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocationTraçarRota({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Erro ao obter localização contínua:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );
    setWatchId(id);

    return () => {
      if (id) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, []);

  const handleInformativoClick = () => {
    if (!informativoAtivo) {
      setInformativoAtivo(true);
      setMensagem(textoPadrao);
    } else {
      setInformativoAtivo(false);
      setMensagem("");
    }
  };

  const atualizarSugestoes = (valor) => {
    setPesquisa(valor);
    if (valor.length > 0) {
      const filtradas = bancoDeDados
        .filter((item) =>
          item.endereco.toLowerCase().includes(valor.toLowerCase())
        )
        .slice(0, 100); // Limita a exibição a 20 resultados
      setSugestoes(filtradas);
    } else {
      setSugestoes([]);
    }
  };

  const toggleSelecionado = (item) => {
    setSelecionados((prevSelecionados) => {
      if (prevSelecionados.some((i) => i.endereco === item.endereco)) {
        return prevSelecionados.filter((i) => i.endereco !== item.endereco);
      } else {
        return [...prevSelecionados, item];
      }
    });
  };

  const limparHistorico = () => {
    setHistorico([]);
    localStorage.removeItem("historico");
  };

  const removerItem = (index) => {
    const itemElement = document.getElementById(`item-${index}`);
    if (itemElement) {
      itemElement.classList.add("item-removendo");
      setTimeout(() => {
        setHistorico((prevHistorico) => {
          const novoHistorico = prevHistorico.filter((_, i) => i !== index);
          localStorage.setItem("historico", JSON.stringify(novoHistorico));
          return novoHistorico;
        });
      }, 300); // Tempo igual ao da animação em ms
    }
  };
  const limparPesquisa = () => {
    setPesquisa("");
    setSugestoes([]);
  };

  const adicionarAoHistorico = () => {
    if (selecionados.length === 0) return;
    setHistorico((prevHistorico) => {
      const novoHistorico = [...prevHistorico];
      selecionados.forEach((item) => {
        if (!novoHistorico.some((h) => h.endereco === item.endereco)) {
          novoHistorico.push(item);
        }
      });
      localStorage.setItem("historico", JSON.stringify(novoHistorico));
      return novoHistorico;
    });
    setSelecionados([]);
  };

  const openGoogleMaps = () => {
    if (!currentLocationTraçarRota) {
      alert(
        "Ainda estamos localizando você. Tente novamente em alguns segundos."
      );
      return;
    }

    setCarregandoRotaExterna(true);

    const linksMapa = document.querySelectorAll("a.mapa");
    if (linksMapa.length === 0) {
      alert("Não há locais com links de mapa no histórico para traçar rota.");
      setCarregandoRotaExterna(false);
      return;
    }

    const historicalCoordinates = Array.from(linksMapa)
      .map((link) => {
        const match = link.href.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
        return match ? `${match[1]},${match[2]}` : null;
      })
      .filter((loc) => loc);

    if (historicalCoordinates.length === 0) {
      alert("Não foi possível extrair coordenadas dos links de mapa.");
      setCarregandoRotaExterna(false);
      return;
    }

    const origin = `${currentLocationTraçarRota.lat},${currentLocationTraçarRota.lng}`;

    let url = "";
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      if (historicalCoordinates.length === 1) {
        const destination = historicalCoordinates[0];
        url = `comgooglemaps://?saddr=${origin}&daddr=${destination}`;
      } else {
        const destination =
          historicalCoordinates[historicalCoordinates.length - 1];
        const waypoints = historicalCoordinates.slice(0, -1).join("|");
        url = `comgooglemaps://?saddr=${origin}&daddr=${destination}&waypoints=${waypoints}`;
      }
    } else {
      const allRoutePoints = [origin, ...historicalCoordinates];
      const routePointsString = allRoutePoints.join("/");
      url = `https://www.google.com/maps/dir/${routePointsString}`;
    }

    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Não foi possível gerar o link da rota com base nos pontos.");
    }

    setCarregandoRotaExterna(false);
  };

  // Gera letras do alfabeto para os itens com mapa
  const itensComMapa = historico.filter(
    (item) => item.mapa && item.mapa.startsWith("http")
  );
  const openImageModal = (imageUrl) => {
    setModalImageUrl(imageUrl);
    setModalVisivel(true);
  };
  const closeImageModal = () => {
    setModalVisivel(false);
    setModalImageUrl(null);
  };
  const letraPorEndereco = {};
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  itensComMapa.forEach((item, index) => {
    letraPorEndereco[item.endereco] = letras[index] || "?";
  });

  return (
    <div style={styles.container}>
      <div style={styles.tituloContainer}>
        <img
          src="/imagens/dengue.png"
          alt="Imagem de dengue"
          style={styles.dengueImagem}
        />
        <h1 style={styles.titulo}>Pesquisa de Dados</h1>
      </div>

      <div style={styles.pesquisaContainer}>
        {" "}
        {/* 1. Contêiner adicionado */}
        <input
          style={styles.input} // Manteremos o estilo, mas vamos ajustá-lo no passo 3
          placeholder="Digite um Endereço..."
          value={pesquisa}
          onChange={(e) => atualizarSugestoes(e.target.value)}
        />
        {/* 2. Botão de limpeza (só aparece se houver texto) */}
        {pesquisa && (
          <button onClick={limparPesquisa} style={styles.botaoLimparPesquisa}>
            &times;{" "}
            {/* Este é um 'X' de multiplicação, que se parece com um ícone de fechar */}
          </button>
        )}
      </div>
      {sugestoes.length > 0 && (
        <ul style={styles.sugestoes}>
          {sugestoes.map((item, index) => (
            <li key={item.endereco} style={styles.sugestaoItem}>
              <input
                type="checkbox"
                checked={selecionados.some((i) => i.endereco === item.endereco)}
                onChange={() => toggleSelecionado(item)}
              />
              {item.endereco}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={(e) => {
          animarBotao(e);
          adicionarAoHistorico();
        }}
        style={styles.botaoAdicionar}
      >
        Adicionar
      </button>
      <h2 style={styles.titulo}>Produção do dia</h2>
      <div style={styles.botoesContainer}>
        <button
          onClick={(e) => {
            animarBotao(e);
            limparHistorico();
          }}
          style={styles.botaoLimpar}
        >
          Limpar
        </button>
        <button
          onClick={(e) => {
            animarBotao(e);
            setMostrarMensagem(!mostrarMensagem);
          }}
          style={styles.botaoMensagem}
        >
          {mostrarMensagem ? "Fechar" : "Mensagem"}
        </button>
        <div style={{ position: "relative", display: "inline-block" }}>
          <span style={styles.seloNovo}>NOVO</span>

          <button
            onClick={(e) => {
              animarBotao(e);
              setTimeout(() => {
                handleVerNoMapaClick();
              }, 200);
            }}
            style={styles.botaoRota}
            disabled={carregandoMapaInterno}
          >
            {carregandoMapaInterno ? (
              <span className="carregando-texto">Carregando</span>
            ) : (
              "Mapa Interno"
            )}
          </button>
        </div>

        <button
          onClick={(e) => {
            animarBotao(e);
            setTimeout(() => {
              openGoogleMaps();
            }, 200); // Espera a animação de 0.2s terminar
          }}
          style={styles.botaoRota}
          disabled={carregandoRotaExterna}
        >
          {carregandoRotaExterna ? (
            <span className="carregando-texto">Carregando</span>
          ) : (
            "Traçar Rota"
          )}
        </button>
        {isMapVisible && (
          <div
            style={{
              position: "fixed", // Adicionado: Fixa o modal na viewport
              top: 0, // Adicionado: Alinha ao topo
              left: 0, // Adicionado: Alinha à esquerda
              width: "100%", // Adicionado: Ocupa toda a largura
              height: "100%", // Adicionado: Ocupa toda a altura
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // overflow: "auto", // Removido: O overflow será controlado pelo ModalMapa internamente
            }}
            onClick={(e) => {
              // Esta lógica permite fechar o modal clicando no fundo escuro
              if (e.target === e.currentTarget) {
                setIsMapVisible(false);
              }
            }}
          >
            {/* Aqui você vai renderizar o seu componente ModalMapa */}
            <ModalMapa
              currentLocation={currentLocationMapaInterno}
              historico={historico}
              onClose={() => setIsMapVisible(false)}
            />
          </div>
        )}
      </div>

      {mostrarMensagem && (
        <div style={{ position: "relative" }}>
          {" "}
          {/* Div para posicionamento */}
          <textarea
            style={styles.textarea}
            placeholder="Digite sua mensagem..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
          <button
            style={{
              position: "absolute",
              top: "5px",
              //right: "5px",
              left: "5px",
              padding: "5px 10px",
              fontSize: "12px",
              cursor: "pointer",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: informativoAtivo ? "#d3d3d3" : "#f9f9f9", // Mudança de cor condicional
              fontWeight: informativoAtivo ? "bold" : "normal", // Exemplo de outro estilo condicional
            }}
            onClick={handleInformativoClick} // Usando a nova função de clique
          >
            Informativo
          </button>
        </div>
      )}
      <ul style={styles.historicoLista}>
        {historico.map((item, index) => (
          <li
            key={item.endereco || index}
            id={`item-${index}`}
            style={styles.historicoItem}
          >
            {item.mapa && item.mapa.startsWith("http") && (
              <div style={styles.letraBadge}>
                {letraPorEndereco[item.endereco]}
              </div>
            )}

            <p>
              <strong style={{ backgroundColor: "lightgray", padding: "5px" }}>
                Endereço:
              </strong>
              <span style={{ backgroundColor: "lightgray", padding: "5px" }}>
                {item.endereco}
              </span>
            </p>
            <p>
              <strong>Morador:</strong> {item.responsavel}
            </p>
            <p>
              <strong>Telefone:</strong>{" "}
              {normalizePhoneNumbers(item.telefone).length > 0 ? (
                normalizePhoneNumbers(item.telefone).map((number, index) => (
                  <React.Fragment key={index}>
                    {number &&
                    number !== "nan" &&
                    number.trim().match(/^\d+$/) ? ( // Verifica se é um número válido
                      <a href={`tel:${number}`}>{number}</a>
                    ) : (
                      <span>{number || "Sem Telefone"}</span> // Exibe "Sem Telefone" se for "nan" ou inválido
                    )}
                    {index < normalizePhoneNumbers(item.telefone).length - 1 &&
                      ", "}
                  </React.Fragment>
                ))
              ) : (
                <span>{item.telefone || "Sem Telefone"}</span>
              )}
            </p>
            <p>
              <strong>WhatsApp:</strong>
              {normalizePhoneNumbers(item.telefone).map((number, index) => (
                <React.Fragment key={index}>
                  {number.trim().match(/^\d+$/) ? (
                    <a
                      href={`https://wa.me/${number.trim()}?text=${encodeURIComponent(
                        mensagem
                          .replace(/\b_m\b/gi, item.responsavel || "Prezado(a)") // <--- MUDANÇA AQUI
                          .replace(
                            /\b_e\b/gi, // O novo placeholder que você digitaria na mensagem
                            item.endereco || "" // O valor para substituir: a letra (A, B, C) ou uma string vazia se não houver mapa/letra
                          )
                      )}`}
                      style={styles.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaWhatsapp size={20} color="green" />
                    </a>
                  ) : (
                    "Sem WhatsApp"
                  )}
                  {index < normalizePhoneNumbers(item.telefone).length - 1 &&
                    " "}{" "}
                  {/* Adiciona vírgula entre os links */}
                </React.Fragment>
              ))}
            </p>

            {/*<p> 
              <strong>Zona:</strong> {item.zona} 
            </p>*/}
            <p>
              <strong>Trecho:</strong> {item.trecho}
            </p>
            <p>
              {item.mapa && item.mapa.startsWith("http") ? ( // Verifica se é um link válido
                <a
                  className="mapa"
                  href={item.mapa}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.botoesMapaEditarAtualizar}
                >
                  Ver no mapa
                </a>
              ) : (
                "Sem mapa"
              )}
            </p>

            <p>
              <a
                href={item.editar}
                target="_blank"
                style={styles.botoesMapaEditarAtualizar}
              >
                Editar
              </a>
            </p>
            <p>
              <a
                href={item.atualizar}
                target="_blank"
                style={styles.botoesMapaEditarAtualizar}
              >
                Atualizar
              </a>
            </p>
            <HistoricoTabela dados={item} />

            <button
              onClick={() => removerItem(index)}
              style={styles.botaoRemover}
            >
              X
            </button>
            {item.imagem && item.imagem.startsWith("https://") && (
              <button
                onClick={() => openImageModal(item.imagem)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "40px",
                  position: "absolute", // Continuará sendo absoluto
                  top: "150px", // Distância do topo do div da PARTE DE BAIXO
                  right: "20px", // Distância da direita do div da PARTE DE BAIXO
                  zIndex: 999,
                  // Não use float: "right" com position: "absolute"
                  // Remova display: "flex", alignItems: "center", justifyContent: "center"
                  // Se o emoji não estiver centralizado, ajuste a propriedade padding do botão, ou o line-height, ou a altura
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
            <hr style={styles.separator} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f4f4", // Adiciona um fundo leve
    width: "100vw", // Ocupa 100% da largura da viewport
    boxSizing: "border-box", // Garante que padding não aumente a largura total
  },
  tituloContainer: {
    display: "flex", // Alinha os elementos lado a lado
    alignItems: "center", // Alinha os elementos verticalmente ao centro
    justifyContent: "center", // Centraliza os elementos horizontalmente
    width: "100%",
    marginBottom: "20px",
  },
  titulo: {
    //marginBottom: "5px",
    color: "#333",
    textAlign: "center",
    width: "auto",
    marginLeft: "11px", // Adiciona 11px de espaço à esquerda do título
  },

  dengueImagem: {
    width: "50px",
    height: "50px",
    marginRight: "8px", // Adiciona 11px de espaço à direita da imagem
  },
  pesquisaContainer: {
    position: "relative",
    width: "90%",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
  },
  input: {
    width: "100%",
    padding: "10px",
    paddingRight: "40px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  botaoLimparPesquisa: {
    position: "absolute",
    right: "2px", // Distância da direita
    top: "50%", // Alinha verticalmente
    transform: "translateY(-63%)", // Centraliza perfeitamente na vertical
    background: "red",
    border: "none",
    fontSize: "29px", // Tamanho do 'X'
    color: "#ffffff",
    cursor: "pointer",
    padding: "3px 5px",
    borderRadius: "4px",
    lineHeight: "1",
    marginBottom: "15px", // Compensa o margin-bottom do input
  },
  sugestoes: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: "4px",
    backgroundColor: "white",
    maxHeight: "40vh",
    overflowY: "auto",
  },
  sugestaoItem: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #eee",
    "&:last-child": {
      borderBottom: "none",
    },
  },
  botaoAdicionar: {
    backgroundColor: "#28a745",
    color: "white",
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  botoesContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    justifyContent: "center", // Centraliza os botões
    width: "100%", // Garante que os botões ocupem toda a largura
  },
  botaoLimpar: {
    backgroundColor: "#dc3545",
    color: "white",
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  botaoMensagem: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "10px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  botaoRota: {
    backgroundColor: "#17a2b8",
    color: "white",
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  textarea: {
    width: "80vw",
    padding: "10px",
    //paddingRight: "70px", // Adiciona um espaço à direita para o botão
    paddingTop: "40px",
    marginBottom: "50px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    minHeight: "60px",
    fontSize: "16px",
  },

  historicoLista: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    width: "100%",
  },
  historicoItem: {
    position: "relative", // Adicione essa linha
    padding: "15px",
    borderBottom: "1px solid #eee",
    backgroundColor: "white",
    borderRadius: "4px",
    marginBottom: "10px",
  },
  botaoRemover: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "5px 10px",
    cursor: "pointer",
    marginLeft: "10px",
    marginTop: "20px",
    fontSize: "14px",
  },
  separator: {
    margin: "20px 0",
    border: "0",
    borderTop: "1px solid #ccc",
    width: "100%",
  },
  whatsapp: {
    marginLeft: "10px",
    textDecoration: "none",
  },
  botaoVerNoMapa: {
    backgroundColor: "#17a2b8",
    color: "white",
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  botoesMapaEditarAtualizar: {
    display: "inline-block",
    padding: "10px 20px",
    backgroundColor: "#17a2b8" /* Cor de fundo do botão */,
    color: "white" /* Cor do texto */,
    textDecoration: "none" /* Remove o sublinhado padrão do link */,
    borderRadius: "5px" /* Borda arredondada */,
    border: "none" /* Remove a borda padrão */,
    cursor: "pointer" /* Indica que é clicável */,
  },
  seloNovo: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    backgroundColor: "red",
    color: "white",
    padding: "2px 6px",
    fontSize: "10px",
    borderRadius: "12px",
    fontWeight: "bold",
    boxShadow: "0 0 3px rgba(0,0,0,0.5)",
    zIndex: 10,
  },
};

// Criado por: Um AVAS qualquer.
