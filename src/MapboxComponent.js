import React, { useRef, useEffect, useState, useCallback } from "react";
import "./styles.css";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYXZhc2ZhYnJpY2lvMSIsImEiOiJjbWJ5OWt6ZGgxbG1sMnBwdzM1eGVlcGMzIn0.4U9BwtVpiOQ9r6BCSMr5bQ";

function getBearingFromRoute(position, routeGeo) {
  try {
    if (
      !routeGeo ||
      !routeGeo.geometry ||
      routeGeo.geometry.coordinates.length < 2
    ) {
      return null;
    }

    const userPoint = turf.point(position);
    const snapped = turf.nearestPointOnLine(routeGeo, userPoint, {
      units: "meters",
    });
    const coords = routeGeo.geometry.coordinates;
    const idx = snapped.properties.index;

    let nextCoord = coords[idx + 1];
    if (!nextCoord && idx > 0) {
      nextCoord = coords[idx - 1];
    }

    if (!nextCoord) return null;

    const nextPoint = turf.point(nextCoord);
    const bearingRaw = turf.bearing(snapped, nextPoint);
    return (bearingRaw + 360) % 360;
  } catch (err) {
    console.error("getBearingFromRoute erro:", err);
    return null;
  }
}

function MapboxComponent({
  origin,
  destinations = [],
  isVisible,
  onClose,
  onMarkerClick,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const alreadyTraveledCoords = useRef([]);
  const [shouldFollow, setShouldFollow] = useState(true);
  const selectedMarkerRef = useRef(null);
  const routeGeoJSON = useRef(null);
  const lastRecalculation = useRef(0);
  const wakeLockSentinelRef = useRef(null);

  const lastKnownStableBearing = useRef(0);
  const recenterClicked = useRef(false);
  const lastKnownPosition = useRef(null);
  const targetPositionRef = useRef(null); // Onde o GPS diz que você está
  const currentPositionRef = useRef(null); // Onde o marcador está na tela
  const animationFrameRef = useRef(null); // Para controlar o loop da animação

  // NOVO: Ref para guardar os marcadores dos destinos que estão no mapa.
  // Isso é essencial para saber quais marcadores remover depois.
  const destinationMarkersRef = useRef({});

  useEffect(() => {
    const animateMarker = () => {
      if (currentPositionRef.current && targetPositionRef.current) {
        const current = currentPositionRef.current;
        const target = targetPositionRef.current;

        // Fator de interpolação: move 20% da distância a cada frame.
        // Pode ajustar entre 0.1 (mais suave) e 0.5 (mais rápido).
        const interpolationFactor = 0.2;

        const newLng =
          current.lng + (target.lng - current.lng) * interpolationFactor;
        const newLat =
          current.lat + (target.lat - current.lat) * interpolationFactor;

        currentPositionRef.current = { lng: newLng, lat: newLat };

        if (markerRef.current) {
          markerRef.current.setLngLat([newLng, newLat]);
        }
      }
      animationFrameRef.current = requestAnimationFrame(animateMarker);
    };

    animationFrameRef.current = requestAnimationFrame(animateMarker);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Roda só uma vez para iniciar o loop de animação

  const setMarkerFill = useCallback((marker, color) => {
    const path = marker.getElement().querySelector("path");
    if (path) {
      path.setAttribute("fill", color);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (
      "wakeLock" in navigator &&
      document.visibilityState === "visible" &&
      isVisible
    ) {
      try {
        wakeLockSentinelRef.current = await navigator.wakeLock.request(
          "screen"
        );
        console.log("Wake Lock ativado!");
        wakeLockSentinelRef.current.addEventListener("release", () => {
          console.log(
            "Wake Lock liberado pelo sistema (aba inativa ou fechada)."
          );
          wakeLockSentinelRef.current = null;
        });
      } catch (err) {
        console.error(`Erro ao ativar Wake Lock: ${err.name}, ${err.message}`);
      }
    }
  }, [isVisible]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockSentinelRef.current) {
      wakeLockSentinelRef.current.release();
      wakeLockSentinelRef.current = null;
      console.log("Wake Lock liberado manualmente.");
    }
  }, []);

  const fetchAndDrawRoute = useCallback(
    async (newOrigin) => {
      if (
        !Array.isArray(newOrigin) ||
        newOrigin.length !== 2 ||
        !newOrigin.every((coord) => typeof coord === "number")
      ) {
        console.warn(
          "fetchAndDrawRoute: newOrigin inválido. Não é possível buscar a rota."
        );
        return;
      }

      const allCoords = [newOrigin, ...destinations]
        .map((coord) => {
          const actualCoord = Array.isArray(coord) ? coord : coord.coords;
          if (
            !Array.isArray(actualCoord) ||
            actualCoord.length !== 2 ||
            !actualCoord.every((c) => typeof c === "number")
          ) {
            console.warn(
              "fetchAndDrawRoute: Coordenada de destino inválida, ignorando.",
              coord
            );
            return null;
          }
          return `${actualCoord[0]},${actualCoord[1]}`;
        })
        .filter(Boolean)
        .join(";");

      if (allCoords.split(";").length < 2) {
        console.warn(
          "Não há coordenadas suficientes para traçar uma rota após a validação."
        );
        if (map.current && map.current.getSource("route")) {
          map.current.getSource("route").setData({
            type: "FeatureCollection",
            features: [],
          });
        }
        return;
      }

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${allCoords}?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json();
          console.error(
            "Erro na resposta da API do Mapbox:",
            res.status,
            errorData
          );
          return;
        }
        const data = await res.json();

        if (!data.routes || data.routes.length === 0) {
          console.warn(
            "Nenhuma rota encontrada para as coordenadas fornecidas.",
            {
              origin: newOrigin,
              destinations: destinations,
              data: data,
            }
          );
          if (map.current.getSource("route")) {
            map.current.getSource("route").setData({
              type: "FeatureCollection",
              features: [],
            });
          }
          return;
        }

        const route = data.routes[0].geometry;

        routeGeoJSON.current = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.coordinates,
          },
        };

        if (map.current.getSource("route")) {
          const gray = alreadyTraveledCoords.current;
          let features;

          if (gray && gray.length > 1) {
            features = [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: gray,
                },
                properties: { color: "gray" },
              },
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: route.coordinates,
                },
                properties: { color: "blue" },
              },
            ];
          } else {
            features = [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: route.coordinates,
                },
                properties: { color: "blue" },
              },
            ];
          }

          map.current.getSource("route").setData({
            type: "FeatureCollection",
            features,
          });
        } else {
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: route,
                  properties: { color: "blue" },
                },
              ],
            },
          });
        }

        if (!map.current.getLayer("route-blue-outline")) {
          map.current.addLayer({
            id: "route-blue-outline",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#ffffff",
              "line-width": 12,
              "line-opacity": 0.8,
            },
            filter: ["==", ["get", "color"], "blue"],
          });
        }

        if (!map.current.getLayer("route-blue")) {
          map.current.addLayer({
            id: "route-blue",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#0074D9",
              "line-width": 8,
            },
            filter: ["==", ["get", "color"], "blue"],
          });
        }

        if (!map.current.getLayer("route-gray")) {
          map.current.addLayer({
            id: "route-gray",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#AAAAAA",
              "line-width": 10,
            },
            filter: ["==", ["get", "color"], "gray"],
          });
        }
      } catch (error) {
        console.error("Erro ao buscar ou processar a rota do Mapbox:", error);
      }
    },
    [destinations]
  ); // Removido fetchAndDrawRoute daqui para evitar loop

  // CÓDIGO CORRIGIDO - SUBSTITUA ESTE BLOCO INTEIRO
  // MapboxComponent.js

  //  ↓↓↓ SUBSTITUA O SEU useEffect ATUAL DE watchPosition POR ESTE BLOCO INTEIRO ↓↓↓
  useEffect(() => {
    if (!isVisible) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const {
          longitude,
          latitude,
          speed,
          heading: gpsRawHeading,
        } = pos.coords;
        const newPositionArray = [longitude, latitude];
        const newPositionObject = { lng: longitude, lat: latitude };

        if (
          typeof longitude !== "number" ||
          typeof latitude !== "number" ||
          isNaN(longitude) ||
          isNaN(latitude)
        ) {
          console.warn("Localização GPS inválida. Ignorando.");
          return;
        }

        // Se for a primeira localização, definimos a posição atual para evitar um pulo inicial.
        if (!currentPositionRef.current) {
          currentPositionRef.current = newPositionObject;
        }

        lastKnownPosition.current = newPositionArray;

        // --- INÍCIO DA NOVA LÓGICA DE "COLAR NA ROTA" (SNAP-TO-ROUTE) ---
        try {
          if (
            routeGeoJSON.current &&
            routeGeoJSON.current.geometry.coordinates.length > 1
          ) {
            const userPoint = turf.point(newPositionArray);
            const routeLine = routeGeoJSON.current;
            const snapped = turf.nearestPointOnLine(routeLine, userPoint, {
              units: "meters",
            });
            const distance = turf.distance(userPoint, snapped, {
              units: "meters",
            });

            // Se estiver a menos de 30 metros da rota, o alvo é o ponto na rota.
            // Usamos 30m (e não 50m) para ser mais preciso e evitar colar na via errada (ex: marginal vs. BR).
            if (distance < 30) {
              targetPositionRef.current = {
                lng: snapped.geometry.coordinates[0],
                lat: snapped.geometry.coordinates[1],
              };
            } else {
              // Se estiver longe, o alvo é a posição real do GPS.
              targetPositionRef.current = newPositionObject;
            }
          } else {
            // Se não houver rota, o alvo é sempre a posição real.
            targetPositionRef.current = newPositionObject;
          }
        } catch (e) {
          console.error("Erro no snap-to-route, usando posição real.", e);
          targetPositionRef.current = newPositionObject;
        }
        // --- FIM DA NOVA LÓGICA DE "COLAR NA ROTA" ---

        if (!markerRef.current) {
          const markerOuter = document.createElement("div");
          markerOuter.className = "gps-marker";
          const markerInner = document.createElement("div");
          markerInner.className = "gps-pulse-inner";
          markerOuter.appendChild(markerInner);

          markerRef.current = new mapboxgl.Marker({ element: markerOuter })
            .setLngLat(newPositionArray)
            .addTo(map.current);
        }

        // A lógica da câmera e do recálculo continuam idênticas.
        let finalMapBearing = lastKnownStableBearing.current;
        const speedThreshold = 0.5;

        if (recenterClicked.current && speed <= speedThreshold) {
          finalMapBearing = 0;
        } else if (speed > speedThreshold) {
          recenterClicked.current = false;
          const bearingFromRoute = getBearingFromRoute(
            newPositionArray,
            routeGeoJSON.current
          );
          if (bearingFromRoute !== null) {
            finalMapBearing = bearingFromRoute;
          } else if (
            typeof gpsRawHeading === "number" &&
            !Number.isNaN(gpsRawHeading)
          ) {
            finalMapBearing = gpsRawHeading;
          }
          if (
            typeof finalMapBearing === "number" &&
            !Number.isNaN(finalMapBearing)
          ) {
            lastKnownStableBearing.current = finalMapBearing;
          }
        }

        if (shouldFollow && map.current) {
          map.current.easeTo({
            center: newPositionArray, // IMPORTANTE: A câmera ainda segue a sua posição REAL.
            bearing: finalMapBearing,
            zoom: 17,
            pitch: 60,
            duration: 1000,
            offset: [50, window.innerHeight / 5],
          });
        }

        const now = Date.now();
        if (routeGeoJSON.current && now - lastRecalculation.current > 5000) {
          const point = turf.point(newPositionArray);
          const line = routeGeoJSON.current;
          const snapped = turf.nearestPointOnLine(line, point, {
            units: "meters",
          });
          const distance = turf.distance(point, snapped, { units: "meters" });

          const coords = line.geometry.coordinates;
          const index = snapped.properties.index;
          const coordsBefore = coords.slice(0, index + 1);
          coordsBefore.push(snapped.geometry.coordinates);
          alreadyTraveledCoords.current = coordsBefore;
          const coordsAfter = [
            snapped.geometry.coordinates,
            ...coords.slice(index + 1),
          ];
          map.current.getSource("route").setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "LineString", coordinates: coordsBefore },
                properties: { color: "gray" },
              },
              {
                type: "Feature",
                geometry: { type: "LineString", coordinates: coordsAfter },
                properties: { color: "blue" },
              },
            ],
          });

          if (distance > 50) {
            console.log(
              `Fora da rota (${distance.toFixed(0)}m)! Recalculando...`
            );
            await fetchAndDrawRoute(newPositionArray);
            lastRecalculation.current = now;
          }
        }
      },
      (err) => {
        console.error("Erro ao obter localização:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [shouldFollow, isVisible, fetchAndDrawRoute]);

  const fitMapToBounds = useCallback(() => {
    if (!map.current) {
      console.warn(
        "fitMapToBounds: Mapa não inicializado. Não é possível ajustar os limites."
      );
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidPoints = false;

    if (
      Array.isArray(origin) &&
      origin.length === 2 &&
      origin.every((c) => typeof c === "number")
    ) {
      bounds.extend(origin);
      hasValidPoints = true;
    } else {
      console.warn("fitMapToBounds: Origem inválida, não incluída nos bounds.");
    }

    destinations.forEach((dest) => {
      const actualCoords = Array.isArray(dest) ? dest : dest.coords;
      if (
        Array.isArray(actualCoords) &&
        actualCoords.length === 2 &&
        actualCoords.every((c) => typeof c === "number")
      ) {
        bounds.extend(actualCoords);
        hasValidPoints = true;
      } else {
        console.warn(
          "fitMapToBounds: Destino inválido encontrado, ignorando-o.",
          dest
        );
      }
    });

    if (hasValidPoints && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 80,
        duration: 1000,
        maxZoom: 16,
      });
    } else {
      console.warn(
        "Não há pontos válidos (origem ou destinos) para ajustar a visão geral."
      );
      if (map.current) {
        let initialCenter = [0, 0];
        if (
          Array.isArray(origin) &&
          origin.length === 2 &&
          typeof origin[0] === "number" &&
          typeof origin[1] === "number" &&
          !isNaN(origin[0]) &&
          !isNaN(origin[1])
        ) {
          initialCenter = origin;
        }
        map.current.flyTo({ center: initialCenter, zoom: 10 });
      }
    }
  }, [origin, destinations]);

  // ALTERADO: Este useEffect agora cuida da inicialização E da atualização dos marcadores.
  useEffect(() => {
    if (!isVisible) return;

    // --- Bloco de Inicialização do Mapa (só roda uma vez) ---
    if (!map.current) {
      let initialCenter = [0, 0];
      if (
        Array.isArray(origin) &&
        origin.length === 2 &&
        typeof origin[0] === "number" &&
        typeof origin[1] === "number" &&
        !isNaN(origin[0]) &&
        !isNaN(origin[1])
      ) {
        initialCenter = origin;
      } else {
        console.warn(
          "Prop 'origin' inválida ou não fornecida. Usando [0, 0] como centro inicial."
        );
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: initialCenter,
        bearing: 0,
        pitch: 60,
      });

      map.current.on("dragstart", () => setShouldFollow(false));
      map.current.on("zoomstart", () => setShouldFollow(false));

      map.current.on("load", () => {
        fitMapToBounds();

        const destinosValidos = destinations.filter((coord) => {
          const actual = Array.isArray(coord) ? coord : coord.coords;
          return (
            Array.isArray(actual) &&
            actual.length === 2 &&
            actual.every((c) => typeof c === "number" && !isNaN(c))
          );
        });

        if (
          Array.isArray(origin) &&
          origin.length === 2 &&
          origin.every((c) => typeof c === "number" && !isNaN(c)) &&
          destinosValidos.length > 0
        ) {
          fetchAndDrawRoute(origin);
        } else {
          console.warn(
            "🔸 Mapa carregado, mas origem ou destinos ainda não estão prontos."
          );
        }
      });
    }

    // --- Bloco de Sincronização de Marcadores (roda sempre que 'destinations' muda) ---
    if (map.current) {
      const currentMarkers = destinationMarkersRef.current;
      const newDestinationIds = new Set(destinations.map((d) => d.Endereço));

      // 1. REMOVER marcadores que não estão mais na lista de destinos
      Object.keys(currentMarkers).forEach((markerId) => {
        if (!newDestinationIds.has(markerId)) {
          console.log(`Removendo marcador: ${markerId}`);
          currentMarkers[markerId].remove(); // Remove do mapa
          if (selectedMarkerRef.current === currentMarkers[markerId]) {
            selectedMarkerRef.current = null;
          }
          delete currentMarkers[markerId]; // Remove da nossa referência
        }
      });

      // 2. ADICIONAR novos marcadores que ainda não existem no mapa
      destinations.forEach((dest) => {
        const markerId = dest.Endereço;
        if (!currentMarkers[markerId]) {
          const actualCoords = Array.isArray(dest) ? dest : dest.coords;
          if (
            Array.isArray(actualCoords) &&
            actualCoords.length === 2 &&
            actualCoords.every((c) => typeof c === "number")
          ) {
            console.log(`Adicionando marcador: ${markerId}`);
            const marker = new mapboxgl.Marker({ color: "red" })
              .setLngLat(actualCoords)
              .addTo(map.current);

            marker.getElement().addEventListener("click", () => {
              if (onMarkerClick) {
                if (
                  selectedMarkerRef.current &&
                  selectedMarkerRef.current !== marker
                ) {
                  setMarkerFill(selectedMarkerRef.current, "red");
                }
                setMarkerFill(marker, "#00AA00");
                selectedMarkerRef.current = marker;
                onMarkerClick(dest);
              }
            });
            // Guarda o novo marcador na nossa referência
            currentMarkers[markerId] = marker;
          }
        }
      });
    }
  }, [
    isVisible,
    origin,
    destinations,
    fitMapToBounds,
    onMarkerClick,
    setMarkerFill,
  ]);

  // USE ESSE, É O CERTO.
  // Ele vai ser o ÚNICO useEffect responsável por desenhar a rota principal.
  const routeDrawnForDestinations = useRef(null);

  useEffect(() => {
    // Para evitar comparações complexas de arrays, criamos uma "chave" simples
    // para a lista de destinos atual.
    const destinationsKey = JSON.stringify(destinations);

    // ========= AS REGRAS DO PORTEIRO =========

    // REGRA 1: Se não temos o básico (mapa, origem, destinos), nem tenta.
    if (!map.current || !origin || destinations.length === 0) {
      return;
    }

    // REGRA 2: Se a rota que já está na tela foi desenhada para a MESMA lista de
    // destinos, não faz nada. É isso que impede as chamadas excessivas quando
    // você anda.
    if (routeDrawnForDestinations.current === destinationsKey) {
      return;
    }

    // ========= FIM DAS REGRAS =========

    // Se o código chegou até aqui, é porque temos tudo o que precisamos E
    // a lista de destinos é NOVA. HORA DE TRABALHAR!
    console.log(
      "Temos o necessário e os destinos são novos. Desenhando a rota."
    );
    fetchAndDrawRoute(origin);

    // Avisa o porteiro que a rota para ESTA lista de destinos já foi desenhada.
    routeDrawnForDestinations.current = destinationsKey;
  }, [origin, destinations, fetchAndDrawRoute]); // Escuta tudo, mas o porteiro controla.

  useEffect(() => {
    if (isVisible) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isVisible) {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible, requestWakeLock, releaseWakeLock]);
  const forceFollowNow = () => {
    const position = lastKnownPosition.current;
    if (!position || !map.current) return;

    const bearing = lastKnownStableBearing.current || 0;

    if (markerRef.current) {
      markerRef.current.setLngLat(position);
    }

    map.current.easeTo({
      center: position,
      bearing: bearing,
      zoom: 17,
      pitch: 60,
      duration: 500,
      offset: [50, window.innerHeight / 5],
    });
  };

  const handleRecenterClick = () => {
    console.log("Botão Recentralizar clicado!");

    if (!lastKnownPosition.current || !map.current) return;

    const bearing = lastKnownStableBearing.current || 0;

    // Passo 1: Move o mapa imediatamente pro ponto correto
    map.current.easeTo({
      center: lastKnownPosition.current,
      bearing: bearing,
      zoom: 17,
      pitch: 60,
      offset: [50, window.innerHeight / 5],
      duration: 500, // meio segundo pra animar
    });

    // Passo 2: Ativa o seguir após a animação
    setTimeout(() => {
      setShouldFollow(true);
      recenterClicked.current = true;
      console.log("Modo seguir ativado");
    }, 550); // 50ms a mais que o duration do easeTo
  };

  const handleGeralClick = () => {
    console.log("Botão Geral clicado!");
    setShouldFollow(false);
    fitMapToBounds();
  };

  return isVisible ? (
    <div style={{ position: "relative", width: "100%", height: "60vh" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
        <button
          onClick={handleRecenterClick}
          style={{
            position: "absolute",
            bottom: 5,
            left: 5,
            zIndex: 10,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "20%",
            width: 115,
            height: 35,
            cursor: "pointer",
            fontWeight: "bold",
          }}
          title="Recentralizar"
        >
          📍 Recentralizar
        </button>
        <button
          onClick={handleGeralClick}
          style={{
            position: "absolute",
            bottom: 5,
            right: 5,
            zIndex: 10,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "20%",
            width: 80,
            height: 35,
            cursor: "pointer",
            fontWeight: "bold",
          }}
          title="Visão Geral"
        >
          Geral
        </button>
      </div>
    </div>
  ) : null;
}

export default MapboxComponent;
