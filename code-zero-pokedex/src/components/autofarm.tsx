"use client";

import React, { useState, useEffect } from "react";

const App: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false); // Estado del proceso
  const [logs, setLogs] = useState<string[]>([]); // Almacena los logs visuales
  const [savedZones, setSavedZones] = useState<string[]>([]); // Zonas obtenidas desde localStorage

  useEffect(() => {
    // Solo accedemos a localStorage en el cliente
    if (typeof window !== "undefined") {
      const zones = JSON.parse(localStorage.getItem("savedZones") || "[]");
      setSavedZones(zones);
    }
  }, []); // Se ejecuta solo al montar el componente

  const urlBasePost = "https://hackeps-poke-backend.azurewebsites.net/events/";
  const urlBaseGet = "https://hackeps-poke-backend.azurewebsites.net/zones/";

  const payload = {
    team_id: "63bf06cf-e720-4134-9252-f195668c6048",
  };

  const headers = {
    "Content-Type": "application/json",
  };

  const lastRequestTime: Record<string, number> = {};

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Agregar mensajes al log
  };

  async function obtenerCooldownPeriod(zoneId: string): Promise<number | null> {
    const url = `${urlBaseGet}${zoneId}`;
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const cooldownPeriod = data.cooldown_period || 0;
      addLog(`Cooldown period para zona ${zoneId}: ${cooldownPeriod} segundos`);
      return cooldownPeriod;
    } catch (error) {
      addLog(`Error al obtener cooldown_period para zona ${zoneId}: ${error}`);
      return null; // Devuelve null en caso de error
    }
  }

  async function realizarRequest(zoneId: string): Promise<void> {
    const url = `${urlBasePost}${zoneId}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();
      addLog(`Request a zona ${zoneId} exitosa. Respuesta: ${JSON.stringify(responseData)}`);
    } catch (error) {
      addLog(`Error al realizar la request a ${zoneId}: ${error}`);
    }
  }

  async function main() {
    savedZones.forEach((zoneId: string) => {
      lastRequestTime[zoneId] = 0;
    });

    const intervalId = setInterval(async () => {
      const currentTime = Date.now() / 1000; // Tiempo actual en segundos

      for (const zoneId of savedZones) {
        const cooldownPeriod = await obtenerCooldownPeriod(zoneId);
        if (cooldownPeriod === null) {
          addLog(`Saltando zona ${zoneId} por error al obtener cooldown_period.`);
          continue;
        }

        const lastTime = lastRequestTime[zoneId];
        const elapsedTime = currentTime - lastTime;

        if (elapsedTime >= cooldownPeriod + 10) {
          addLog(`Enviando POST para la zona ${zoneId} (última solicitud hace ${elapsedTime.toFixed(2)} segundos)`);
          await realizarRequest(zoneId);
          lastRequestTime[zoneId] = Date.now() / 1000;
        } else {
          const remainingTime = (cooldownPeriod + 10) - elapsedTime;
          addLog(`Zona ${zoneId}: en cooldown, quedan ${remainingTime.toFixed(2)} segundos.`);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId); // Limpieza del intervalo al desmontar
  }

  const handleClick = async () => {
    if (!isRunning) {
      setIsRunning(true);
      addLog("Iniciando el proceso...");
      await main();
    } else {
      addLog("El proceso ya está en ejecución.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={handleClick} disabled={isRunning}>
        {isRunning ? "En ejecución..." : "Iniciar"}
      </button>
      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          backgroundColor: "#f9f9f9",
        }}
      >
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default App;
