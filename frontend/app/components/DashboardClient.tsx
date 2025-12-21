// app/components/DashboardClient.tsx
'use client';

import dynamic from 'next/dynamic';
import Header from './Header';
import HistoryChart from './HistoryChart';
import AnalyticsPrediction from './AnalyticsPrediction';
import Footer from './Footer';

import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt/dist/mqtt.min';
import type { MqttClient } from 'mqtt';

const URL = process.env.NEXT_PUBLIC_MQTT_WS_URL as string;
type Msg = Record<string, any>;

const MqttCards = dynamic(() => import('./MqttCards'), { ssr: false });

// Tipe data (disamain biar klop)
export interface SensorDataPoint {
  time: string;
  value: number;
}

// Interface buat Props (Data "Modal Awal" dari Database)
interface DashboardProps {
  initialHistory: {
    temp: SensorDataPoint[];
    hum: SensorDataPoint[];
    light: SensorDataPoint[];
    noise: SensorDataPoint[];
    gas: SensorDataPoint[];
    vib: SensorDataPoint[];
    uv: SensorDataPoint[];
  }
}

export default function DashboardClient({ initialHistory }: DashboardProps) {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState('connecting');

  // State Card (Nilai Terakhir)
  const [temperature, setTemperature] = useState<number | string>(initialHistory.temp.at(-1)?.value ?? '—');
  const [humidity, setHumidity] = useState<number | string>(initialHistory.hum.at(-1)?.value ?? '—');
  const [light, setLight] = useState<number | string>(initialHistory.light.at(-1)?.value ?? '—');
  const [noise, setNoise] = useState<number | string>(initialHistory.noise.at(-1)?.value ?? '—');
  const [gas, setGas] = useState<number | string>(initialHistory.gas.at(-1)?.value ?? '—');
  const [vibration, setVibration] = useState<number | string>(initialHistory.vib.at(-1)?.value ?? '—');
  const [uvStatus, setUvStatus] = useState<number | string>(initialHistory.uv.at(-1)?.value ?? '—');

  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({
    temperature: initialHistory.temp.at(-1)?.time ?? 'N/A',
    humidity: initialHistory.hum.at(-1)?.time ?? 'N/A',
    light: initialHistory.light.at(-1)?.time ?? 'N/A',
    noise: initialHistory.noise.at(-1)?.time ?? 'N/A',
    gas: initialHistory.gas.at(-1)?.time ?? 'N/A',
    vibration: initialHistory.vib.at(-1)?.time ?? 'N/A',
    uv_status: initialHistory.uv.at(-1)?.time ?? 'N/A',
  });

  // --- State Historis (Inisialisasi pakai data dari Props/Database) ---
  const [temperatureHistory, setTemperatureHistory] = useState<SensorDataPoint[]>(initialHistory.temp);
  const [humidityHistory, setHumidityHistory] = useState<SensorDataPoint[]>(initialHistory.hum);
  const [lightHistory, setLightHistory] = useState<SensorDataPoint[]>(initialHistory.light);
  const [noiseHistory, setNoiseHistory] = useState<SensorDataPoint[]>(initialHistory.noise);
  const [gasHistory, setGasHistory] = useState<SensorDataPoint[]>(initialHistory.gas);
  const [vibrationHistory, setVibrationHistory] = useState<SensorDataPoint[]>(initialHistory.vib);
  const [uvStatusHistory, setUvStatusHistory] = useState<SensorDataPoint[]>(initialHistory.uv);

  // ... (SISA CODE SAMA PERSIS KE BAWAH: addDataPoint, useEffect MQTT, return JSX, dll) ...
  // ... Paste sisa fungsi addDataPoint dan useEffect lu di sini ...
  
  const addDataPoint = (
    history: SensorDataPoint[],
    setValue: React.Dispatch<React.SetStateAction<SensorDataPoint[]>>,
    value: number,
    timestamp: string,
    maxPoints: number = 20 
  ) => {
    const newPoint = { time: timestamp, value: value };
    setValue((prevHistory) => {
      const updatedHistory = [...prevHistory, newPoint];
      if (updatedHistory.length > maxPoints) {
        return updatedHistory.slice(updatedHistory.length - maxPoints);
      }
      return updatedHistory;
    });
  };

  useEffect(() => {
     // ... (LOGIC MQTT LU YANG LAMA PASTE DISINI) ...
     // Pastikan import mqtt nya jalan
     if (!URL) return;
     const client = mqtt.connect(URL, { protocolVersion: 4 });
     // ... dst ...
     
     // Hapus return placeholder ini kalau udah dicopas logic aslinya
     return () => { client.end() }
  }, []);

  const fmt = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined || v === '—') return '—';
    if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(1) : '—';
    return String(v);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header status={status} />
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'grid', gap: '24px', gridTemplateColumns: '1fr' }}>
        <section aria-label="Realtime Monitoring">
           {/* ... Paste JSX MqttCards lu ... */}
           <MqttCards
            temperature={fmt(temperature)}
            humidity={fmt(humidity)}
            light={fmt(light)}
            noise={fmt(noise)}
            gas={fmt(gas)}
            vibration={fmt(vibration)}
            uvStatus={fmt(uvStatus)}
            lastUpdated={lastUpdated}
          />
        </section>

        <section aria-label="Grafik Historis">
          {/* ... Paste JSX HistoryChart lu ... */}
           <HistoryChart
            temperatureHistory={temperatureHistory}
            humidityHistory={humidityHistory}
            lightHistory={lightHistory}
            noiseHistory={noiseHistory}
            gasHistory={gasHistory}
            vibrationHistory={vibrationHistory}
            uvStatusHistory={uvStatusHistory}
          />
        </section>

        <section aria-label="Analitik dan Prediksi">
          <AnalyticsPrediction />
        </section>
      </main>
      <Footer />
    </div>
  );
}