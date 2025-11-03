"use client";

import dynamic from 'next/dynamic';
import Header from './components/Header';
import HistoryChart from './components/HistoryChart';
import AnalyticsPrediction from './components/AnalyticsPrediction';
import Footer from './components/Footer';

import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt/dist/mqtt.min';
import type { MqttClient } from 'mqtt';

// Konfigurasi URL MQTT dari environment variable
const URL = process.env.NEXT_PUBLIC_MQTT_WS_URL as string;
console.log('Connecting to MQTT Broker:', URL); // Debugging koneksi MQTT
type Msg = Record<string, any>;

// Dynamic import untuk MqttCards, hanya dimuat di sisi klien (SSR dinonaktifkan)
const MqttCards = dynamic(() => import('./components/MqttCards'), { ssr: false });

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
        // Menggunakan datetime dari payload jika ada, jika tidak pakai waktu lokal browser
        const sensorTimestamp = obj.datetime ?? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        switch (topic) {
          case 'bems/bh1750':
            if (obj.lux !== undefined) setLight(obj.lux);
            setLastUpdated((prev) => ({ ...prev, light: sensorTimestamp }));
            break;
          case 'bems/dht11':
            if (obj.tempC !== undefined) setTemperature(obj.tempC);
            if (obj.hum !== undefined) setHumidity(obj.hum);
            setLastUpdated((prev) => ({ ...prev, temperature: sensorTimestamp, humidity: sensorTimestamp }));
            break;
          case 'bems/sound':
            if (obj.level !== undefined) setNoise(obj.level);
            setLastUpdated((prev) => ({ ...prev, noise: sensorTimestamp }));
            break;
          case 'bems/mq2':
            if (obj.gas_ppm !== undefined) setGas(obj.gas_ppm);
            setLastUpdated((prev) => ({ ...prev, gas: sensorTimestamp }));
            break;
          case 'bems/mpu6050_vibration':
            if (obj.vibration_mag !== undefined) setVibration(obj.vibration_mag);
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
          <HistoryChart />
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