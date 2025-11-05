"use client";

import dynamic from 'next/dynamic';
import Header from './components/Header';
import HistoryChart from './components/HistoryChart'; // Pastikan ini diimport
import AnalyticsPrediction from './components/AnalyticsPrediction';
import Footer from './components/Footer';

import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt/dist/mqtt.min';
import type { MqttClient } from 'mqtt';

const URL = process.env.NEXT_PUBLIC_MQTT_WS_URL as string;
console.log('Connecting to MQTT Broker:', URL);
type Msg = Record<string, any>;

const MqttCards = dynamic(() => import('./components/MqttCards'), { ssr: false });

// Definisi interface untuk data historis
interface SensorDataPoint {
  time: string; // Timestamp atau label waktu
  value: number; // Nilai sensor
}

export default function Page() {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState('connecting');

  const [temperature, setTemperature] = useState<number | string>('—');
  const [humidity, setHumidity] = useState<number | string>('—');
  const [light, setLight] = useState<number | string>('—');
  const [noise, setNoise] = useState<number | string>('—');
  const [gas, setGas] = useState<number | string>('—');
  const [vibration, setVibration] = useState<number | string>('—');

  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({
    temperature: 'N/A',
    humidity: 'N/A',
    light: 'N/A',
    noise: 'N/A',
    gas: 'N/A',
    vibration: 'N/A',
  });

  // --- Tambahan State untuk Data Historis ---
  const [temperatureHistory, setTemperatureHistory] = useState<SensorDataPoint[]>([]);
  const [humidityHistory, setHumidityHistory] = useState<SensorDataPoint[]>([]);
  const [lightHistory, setLightHistory] = useState<SensorDataPoint[]>([]);
  const [noiseHistory, setNoiseHistory] = useState<SensorDataPoint[]>([]);
  const [gasHistory, setGasHistory] = useState<SensorDataPoint[]>([]);
  const [vibrationHistory, setVibrationHistory] = useState<SensorDataPoint[]>([]);

  // Fungsi helper untuk menambahkan data point dan membatasi jumlah data
  const addDataPoint = (
    history: SensorDataPoint[],
    setValue: React.Dispatch<React.SetStateAction<SensorDataPoint[]>>,
    value: number,
    timestamp: string,
    maxPoints: number = 20 // Batasi jumlah titik data untuk grafik realtime (misal: 20 data terakhir)
  ) => {
    const newPoint = { time: timestamp, value: value };
    setValue((prevHistory) => {
      const updatedHistory = [...prevHistory, newPoint];
      // Jika melebihi batas, hapus data terlama
      if (updatedHistory.length > maxPoints) {
        return updatedHistory.slice(updatedHistory.length - maxPoints);
      }
      return updatedHistory;
    });
  };
  // --- Akhir Tambahan State untuk Data Historis ---


  useEffect(() => {
    if (!URL) {
      setStatus('missing NEXT_PUBLIC_MQTT_WS_URL env');
      console.error('Environment variable NEXT_PUBLIC_MQTT_WS_URL is not set.');
      return;
    }

    const client = mqtt.connect(URL, { protocolVersion: 4 });
    clientRef.current = client;

    client.on('connect', () => {
      console.log('MQTT Connected!');
      setStatus('connected');
      client.subscribe('bems/#');
    });
    client.on('reconnect', () => {
      console.log('MQTT Reconnecting...');
      setStatus('reconnecting');
    });
    client.on('close', () => {
      console.log('MQTT Closed');
      setStatus('closed');
    });
    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      setStatus('error: ' + (err?.message ?? 'unknown'));
    });

    client.on('message', (topic, payload) => {
      try {
        const obj: Msg = JSON.parse(payload.toString());
        const sensorTimestamp = obj.datetime ?? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        switch (topic) {
          case 'bems/bh1750':
            if (obj.lux !== undefined) {
              const numericValue = parseFloat(obj.lux);
              if (!isNaN(numericValue)) {
                setLight(numericValue);
                addDataPoint(lightHistory, setLightHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setLight('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, light: sensorTimestamp }));
            break;
          case 'bems/dht11':
            if (obj.tempC !== undefined) {
              const numericValue = parseFloat(obj.tempC);
              if (!isNaN(numericValue)) {
                setTemperature(numericValue);
                addDataPoint(temperatureHistory, setTemperatureHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setTemperature('—');
              }
            }
            if (obj.hum !== undefined) {
              const numericValue = parseFloat(obj.hum);
              if (!isNaN(numericValue)) {
                setHumidity(numericValue);
                addDataPoint(humidityHistory, setHumidityHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setHumidity('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, temperature: sensorTimestamp, humidity: sensorTimestamp }));
            break;
          case 'bems/sound':
            if (obj.level !== undefined) {
              const numericValue = parseFloat(obj.level);
              if (!isNaN(numericValue)) {
                setNoise(numericValue);
                addDataPoint(noiseHistory, setNoiseHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setNoise('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, noise: sensorTimestamp }));
            break;
          case 'bems/mq2':
            if (obj.gas_ppm !== undefined) {
              const numericValue = parseFloat(obj.gas_ppm);
              if (!isNaN(numericValue)) {
                setGas(numericValue);
                addDataPoint(gasHistory, setGasHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setGas('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, gas: sensorTimestamp }));
            break;
          case 'bems/mpu6050_vibration':
            if (obj.vibration_mag !== undefined) {
              const numericValue = parseFloat(obj.vibration_mag);
              if (!isNaN(numericValue)) {
                setVibration(numericValue);
                addDataPoint(vibrationHistory, setVibrationHistory, numericValue, sensorTimestamp); // Tambahkan ke historis
              } else {
                setVibration('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, vibration: sensorTimestamp }));
            break;
          default:
            break;
        }
      } catch (e) {
        console.error('Failed to parse MQTT message:', e);
      }
    });

    return () => client.end(true);
  }, []); // Array dependensi kosong agar useEffect hanya berjalan sekali saat komponen mount


  const fmt = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined || v === '—') return '—';
    if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(1) : '—';
    return String(v);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header status={status} />

      <main
        style={{
          flex: 1,
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: '1fr',
        }}
      >
        {/* Section Realtime Monitoring */}
        <section aria-label="Realtime Monitoring">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>Realtime Monitoring</h2>
          <MqttCards
            temperature={fmt(temperature)}
            humidity={fmt(humidity)}
            light={fmt(light)}
            noise={fmt(noise)}
            gas={fmt(gas)}
            vibration={fmt(vibration)}
            lastUpdated={lastUpdated}
          />
        </section>

        {/* Section Grafik Historis */}
        <section aria-label="Grafik Historis">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>Grafik Historis</h2>
          {/* Meneruskan data historis ke HistoryChart */}
          <HistoryChart
            temperatureHistory={temperatureHistory}
            humidityHistory={humidityHistory}
            lightHistory={lightHistory}
            noiseHistory={noiseHistory}
            gasHistory={gasHistory}
            vibrationHistory={vibrationHistory}
          />
        </section>

        {/* Section Analitik & Prediksi */}
        <section aria-label="Analitik dan Prediksi">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>Analitik & Prediksi</h2>
          <AnalyticsPrediction />
        </section>
      </main>

      <Footer />
    </div>
  );
}