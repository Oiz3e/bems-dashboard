'use client';

import dynamic from 'next/dynamic';
import Header from './Header';
import Footer from './Footer';
import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';

const URL = process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://localhost:9001';

const MqttCards = dynamic(() => import('./MqttCards'), { ssr: false });
const HistoryChart = dynamic(() => import('./HistoryChart'), { ssr: false });

export interface SensorDataPoint {
  time: string;
  value: number;
}

interface DashboardProps {
  initialHistory: {
    temp: SensorDataPoint[];
    hum: SensorDataPoint[];
    light: SensorDataPoint[];
    noise: SensorDataPoint[]; // Sesuai request: noise
    gas: SensorDataPoint[];
    vib: SensorDataPoint[];
    uv: SensorDataPoint[];    // Kita sebut uv di array history
  }
}

export default function DashboardClient({ initialHistory }: DashboardProps) {
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const [status, setStatus] = useState('Connecting to Mosquitto...');

  // --- STATE PAKE NAMA LAMA (noise & uvStatus) ---
  const [temperature, setTemperature] = useState<number | string>(initialHistory.temp.at(-1)?.value ?? '—');
  const [humidity, setHumidity] = useState<number | string>(initialHistory.hum.at(-1)?.value ?? '—');
  const [light, setLight] = useState<number | string>(initialHistory.light.at(-1)?.value ?? '—');
  
  // PAKE NOISE
  const [noise, setNoise] = useState<number | string>(initialHistory.noise.at(-1)?.value ?? '—');
  
  const [gas, setGas] = useState<number | string>(initialHistory.gas.at(-1)?.value ?? '—');
  const [vibration, setVibration] = useState<number | string>(initialHistory.vib.at(-1)?.value ?? '—');
  
  // PAKE UV_STATUS
  const [uvStatus, setUvStatus] = useState<number | string>(initialHistory.uv.at(-1)?.value ?? '—');

  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});

  // --- HISTORY STATE ---
  const [temperatureHistory, setTemperatureHistory] = useState<SensorDataPoint[]>(initialHistory.temp);
  const [humidityHistory, setHumidityHistory] = useState<SensorDataPoint[]>(initialHistory.hum);
  const [lightHistory, setLightHistory] = useState<SensorDataPoint[]>(initialHistory.light);
  
  // PAKE NOISE HISTORY
  const [noiseHistory, setNoiseHistory] = useState<SensorDataPoint[]>(initialHistory.noise);
  
  const [gasHistory, setGasHistory] = useState<SensorDataPoint[]>(initialHistory.gas);
  const [vibrationHistory, setVibrationHistory] = useState<SensorDataPoint[]>(initialHistory.vib);
  const [uvStatusHistory, setUvStatusHistory] = useState<SensorDataPoint[]>(initialHistory.uv);

  const addDataPoint = (
    setValue: React.Dispatch<React.SetStateAction<SensorDataPoint[]>>,
    value: number,
    timestamp: string
  ) => {
    setValue((prev) => {
      const newHistory = [...prev, { time: timestamp, value }];
      return newHistory.slice(-20); 
    });
  };

  useEffect(() => {
    console.log(`Connecting MQTT to ${URL}...`);
    const client = mqtt.connect(URL);
    clientRef.current = client;

    client.on('connect', () => {
      console.log('Connected to Mosquitto!');
      setStatus('Connected (Realtime)');
      client.subscribe('bems/raw/sensor');
    });

    client.on('message', (topic, payload) => {
      if (topic === 'bems/raw/sensor') {
        try {
          const data = JSON.parse(payload.toString());
          const timeLabel = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          });

          if (data.temperature !== undefined) {
             const val = parseFloat(data.temperature);
             setTemperature(val);
             addDataPoint(setTemperatureHistory, val, timeLabel);
          }
          if (data.humidity !== undefined) {
             const val = parseFloat(data.humidity);
             setHumidity(val);
             addDataPoint(setHumidityHistory, val, timeLabel);
          }
          if (data.lux !== undefined) {
             const val = parseFloat(data.lux);
             setLight(val);
             addDataPoint(setLightHistory, val, timeLabel);
          }

          // MAPPING: MQTT 'sound' -> State 'noise'
          if (data.sound !== undefined) {
             const val = parseFloat(data.sound);
             setNoise(val);
             addDataPoint(setNoiseHistory, val, timeLabel);
          }

          if (data.mq2_adc !== undefined) {
             const val = parseFloat(data.mq2_adc);
             setGas(val);
             addDataPoint(setGasHistory, val, timeLabel);
          }
          if (data.vibration !== undefined) {
             const val = parseFloat(data.vibration);
             setVibration(val);
             addDataPoint(setVibrationHistory, val, timeLabel);
          }

          // MAPPING: MQTT 'uv' -> State 'uvStatus'
          if (data.uv !== undefined) { 
             const val = parseFloat(data.uv);
             setUvStatus(val);
             addDataPoint(setUvStatusHistory, val, timeLabel);
          }

          setLastUpdated({
            temperature: timeLabel,
            humidity: timeLabel,
            light: timeLabel,
            noise: timeLabel,     // Key state
            gas: timeLabel,
            vibration: timeLabel,
            uv_status: timeLabel, // Key state
          });

        } catch (error) {
          console.error('JSON Parse Error:', error);
        }
      }
    });

    return () => { client.end(); };
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>Realtime Monitoring</h2>
          <MqttCards
            temperature={fmt(temperature)}
            humidity={fmt(humidity)}
            light={fmt(light)}
            noise={fmt(noise)}         // Props Noise
            gas={fmt(gas)}
            vibration={fmt(vibration)}
            uvStatus={fmt(uvStatus)}   // Props uvStatus
            lastUpdated={lastUpdated}
          />
        </section>

        <section aria-label="Grafik Historis">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>Grafik Historis</h2>
          <HistoryChart />
        </section>

        {/* <section aria-label="Analitik dan Prediksi">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>
            Analitik & Prediksi
          </h2>
          <AnalyticsPrediction />
        </section> */}


      </main>
      <Footer />
    </div>
  );
}