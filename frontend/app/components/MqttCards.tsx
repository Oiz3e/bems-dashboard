'use client';

import { useEffect, useRef, useState } from 'react';

interface CardStatus {
  text: string;
  color: string;
}

interface SensorCardProps {
  title: string;
  value: string;
  unit: string;
  updated?: string;
  getStatus: (value: number) => CardStatus;
  displayType?: 'value' | 'status';
}

const SensorCard: React.FC<SensorCardProps> = ({ title, value, unit, updated, getStatus, displayType = 'value' }) => {
  const numericValue = typeof value === 'string' && value !== '—' ? parseFloat(value) : NaN;
  const { text: statusText, color: statusColor } = isNaN(numericValue) ? { text: 'N/A', color: '#cbd5e1' } : getStatus(numericValue);

  const [fade, setFade] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== '—' && value !== prevValueRef.current) {
      setFade(true);
      setTimeout(() => setFade(false), 500);
    }
    prevValueRef.current = value;
  }, [value]);

  const displayValue = displayType === 'status' ? statusText : value;
  const displayUnit = displayType === 'status' ? '' : unit;

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', borderBottom: `4px solid ${statusColor}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '12px', right: '12px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor }}></div>
      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#cbd5e1', fontWeight: 500, marginBottom: '10px' }}>{title}</h3>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: displayType === 'status' ? statusColor : '#e2e8f0', opacity: fade ? 0.7 : 1, transition: 'opacity 0.3s' }}>
        {displayValue} {displayUnit && <span style={{ fontSize: '1.2rem', fontWeight: 400, color: '#94a3b8' }}>{displayUnit}</span>}
      </div>
      <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
        {updated && <span>Updated: {updated}</span>}
      </div>
    </div>
  );
};

// --- LOGIC STATUS ---
const getTempStatus = (v: number) => (v > 30 || v < 18 ? { text: 'Bahaya', color: '#ef4444' } : v > 28 || v < 20 ? { text: 'Waspada', color: '#eab308' } : { text: 'Normal', color: '#22c55e' });
const getHumStatus = (v: number) => (v > 70 || v < 40 ? { text: 'Bahaya', color: '#ef4444' } : v > 60 || v < 45 ? { text: 'Waspada', color: '#eab308' } : { text: 'Normal', color: '#22c55e' });
const getLightStatus = (v: number) => (v < 20 ? { text: 'Bahaya', color: '#ef4444' } : v < 50 || v > 1000 ? { text: 'Waspada', color: '#eab308' } : { text: 'Normal', color: '#22c55e' });
const getNoiseStatus = (v: number) => (v >= 1 ? { text: 'Bising', color: '#ef4444' } : { text: 'Senyap', color: '#22c55e' });
const getGasStatus = (v: number) => (v > 350 ? { text: 'Bahaya', color: '#ef4444' } : v > 200 ? { text: 'Waspada', color: '#eab308' } : { text: 'Normal', color: '#22c55e' });
const getVibStatus = (v: number) => (v >= 1 ? { text: 'Bergetar', color: '#ef4444' } : { text: 'Stabil', color: '#22c55e' });
const getUvStatus = (v: number) => (v >= 1 ? { text: 'TERDETEKSI', color: '#dc2626' } : { text: 'Aman', color: '#22c55e' });

// --- MAIN COMPONENT ---
interface MqttCardsProps {
  temperature: string;
  humidity: string;
  light: string;
  noise: string;      // BALIK LAGI KE NOISE
  gas: string;
  vibration: string;
  uvStatus: string;   // BALIK LAGI KE UV_STATUS
  lastUpdated: Record<string, string>;
}

export default function MqttCards({ temperature, humidity, light, noise, gas, vibration, uvStatus, lastUpdated }: MqttCardsProps) {
  return (
    <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <SensorCard title="Suhu" value={temperature} unit="°C" updated={lastUpdated.temperature} getStatus={getTempStatus} />
      <SensorCard title="Kelembapan" value={humidity} unit="%RH" updated={lastUpdated.humidity} getStatus={getHumStatus} />
      <SensorCard title="Cahaya" value={light} unit="lux" updated={lastUpdated.light} getStatus={getLightStatus} />
      
      {/* PAKE PROPS NOISE */}
      <SensorCard title="Kebisingan" value={noise} unit="Status" updated={lastUpdated.noise} getStatus={getNoiseStatus} displayType="status" />
      
      <SensorCard title="Gas/Asap" value={gas} unit="ppm (Relatif)" updated={lastUpdated.gas} getStatus={getGasStatus} />
      <SensorCard title="Getaran" value={vibration} unit="Status" updated={lastUpdated.vibration} getStatus={getVibStatus} displayType="status" />
      
      {/* PAKE PROPS UV_STATUS */}
      <SensorCard title="Api/UV" value={uvStatus} unit="Status" updated={lastUpdated.uv_status} getStatus={getUvStatus} displayType="status" />
    </div>
  );
}