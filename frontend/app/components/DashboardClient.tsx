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

  // --- State Card (Nilai Terakhir) ---
  // Kita ambil nilai terakhir dari array history database sebagai nilai awal
  // Kalau array kosong, default ke '—'
  const [temperature, setTemperature] = useState<number | string>(initialHistory.temp.at(-1)?.value ?? '—');
  const [humidity, setHumidity] = useState<number | string>(initialHistory.hum.at(-1)?.value ?? '—');
  const [light, setLight] = useState<number | string>(initialHistory.light.at(-1)?.value ?? '—');
  const [noise, setNoise] = useState<number | string>(initialHistory.noise.at(-1)?.value ?? '—');
  const [gas, setGas] = useState<number | string>(initialHistory.gas.at(-1)?.value ?? '—');
  const [vibration, setVibration] = useState<number | string>(initialHistory.vib.at(-1)?.value ?? '—');
  const [uvStatus, setUvStatus] = useState<number | string>(initialHistory.uv.at(-1)?.value ?? '—');

  // State untuk Last Updated Time
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

  // Fungsi helper untuk menambahkan data point
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

  // --- LOGIC MQTT (useEffect) ---
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
        const sensorTimestamp =
          obj.datetime ??
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

        switch (topic) {
          // =======================================================
          // 1. TOPIC: bems/environment
          // =======================================================
          case 'bems/environment':
            if (obj.lux !== undefined) {
              const luxValue = parseFloat(obj.lux);
              if (!isNaN(luxValue)) {
                setLight(luxValue);
                addDataPoint(lightHistory, setLightHistory, luxValue, sensorTimestamp);
              } else {
                setLight('—');
              }
            }
            if (obj.tempC !== undefined) {
              const tempValue = parseFloat(obj.tempC);
              if (!isNaN(tempValue)) {
                setTemperature(tempValue);
                addDataPoint(temperatureHistory, setTemperatureHistory, tempValue, sensorTimestamp);
              } else {
                setTemperature('—');
              }
            }
            if (obj.hum !== undefined) {
              const humValue = parseFloat(obj.hum);
              if (!isNaN(humValue)) {
                setHumidity(humValue);
                addDataPoint(humidityHistory, setHumidityHistory, humValue, sensorTimestamp);
              } else {
                setHumidity('—');
              }
            }
            setLastUpdated((prev) => ({
              ...prev,
              light: sensorTimestamp,
              temperature: sensorTimestamp,
              humidity: sensorTimestamp,
            }));
            break;

          // =======================================================
          // 2. TOPIC: bems/gas_sound
          // =======================================================
          case 'bems/gas_sound':
            if (obj.mq2_adc !== undefined) {
              const gasValue = parseFloat(obj.mq2_adc);
              if (!isNaN(gasValue)) {
                setGas(gasValue);
                addDataPoint(gasHistory, setGasHistory, gasValue, sensorTimestamp);
              } else {
                setGas('—');
              }
            }
            if (obj.sound_status_avg !== undefined) {
              const noiseValue = parseFloat(obj.sound_status_avg);
              if (!isNaN(noiseValue)) {
                setNoise(noiseValue);
                addDataPoint(noiseHistory, setNoiseHistory, noiseValue, sensorTimestamp);
              } else {
                setNoise('—');
              }
            }
            setLastUpdated((prev) => ({
              ...prev,
              gas: sensorTimestamp,
              noise: sensorTimestamp,
            }));
            break;

          // =======================================================
          // 3. TOPIC: bems/motion
          // =======================================================
          case 'bems/motion':
            if (obj.vibration_status !== undefined) {
              const vibrationValue = parseFloat(obj.vibration_status);
              if (!isNaN(vibrationValue)) {
                setVibration(vibrationValue);
                addDataPoint(vibrationHistory, setVibrationHistory, vibrationValue, sensorTimestamp);
              } else {
                setVibration('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, vibration: sensorTimestamp }));
            break;

          // =======================================================
          // 4. TOPIC: bems/uv_status
          // =======================================================
          case 'bems/uv_status':
            if (obj.uv_status !== undefined) {
              const uvValue = parseFloat(obj.uv_status);
              if (!isNaN(uvValue)) {
                setUvStatus(uvValue);
                addDataPoint(uvStatusHistory, setUvStatusHistory, uvValue, sensorTimestamp);
              } else {
                setUvStatus('—');
              }
            }
            setLastUpdated((prev) => ({ ...prev, uv_status: sensorTimestamp }));
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Failed to parse MQTT message:', e);
      }
    });

    // Cleanup saat component unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependensi kosong biar jalan sekali pas mount

  const fmt = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined || v === '—') return '—';
    if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(1) : '—';
    return String(v);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header status={status} />
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'grid', gap: '24px', gridTemplateColumns: '1fr' }}>
        
        {/* Section Realtime Monitoring */}
        <section aria-label="Realtime Monitoring">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>
            Realtime Monitoring
          </h2>
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

        {/* Section Grafik Historis */}
        <section aria-label="Grafik Historis">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>
            Grafik Historis
          </h2>
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

        {/* Section Analitik & Prediksi */}
        <section aria-label="Analitik dan Prediksi">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#cbd5e1' }}>
            Analitik & Prediksi
          </h2>
          <AnalyticsPrediction />
        </section>

      </main>
      <Footer />
    </div>
  );
}