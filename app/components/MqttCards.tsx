'use client';

import { useEffect, useRef, useState } from 'react';

// Warna status berdasarkan nilai dan tipe sensor
const getStatusColor = (value: number, type: string) => {
  switch (type) {
    case 'temperature':
      if (value > 30 || value < 18) return '#ef4444';
      if (value > 26 || value < 20) return '#eab308'; 
      return '#22c55e'; 
    case 'humidity':
      if (value > 70 || value < 40) return '#ef4444';
      if (value > 60 || value < 45) return '#eab308';
      return '#22c55e';
    case 'light':
      if (value < 50 || value > 1000) return '#eab308';
      if (value < 20) return '#ef4444';
      return '#22c55e';
    case 'noise':
      if (value > 80) return '#ef4444';
      if (value > 60) return '#eab308';
      return '#22c55e';
    case 'gas':
      if (value > 500) return '#ef4444';
      if (value > 200) return '#eab308';
      return '#22c55e';
    case 'vibration':
      if (value > 0.5) return '#ef4444';
      if (value > 0.1) return '#eab308';
      return '#22c55e';
    default:
      return '#22c55e';
  }
};

const getStatusText = (color: string) => {
  switch (color) {
    case '#22c55e':
      return 'Normal';
    case '#eab308':
      return 'Waspada';
    case '#ef4444':
      return 'Bahaya';
    default:
      return 'Unknown';
  }
};

// Interface untuk props yang diterima oleh komponen MqttCards
interface MqttCardsProps {
  temperature: string;
  humidity: string;
  light: string;
  noise: string;
  gas: string;
  vibration: string;
  lastUpdated: Record<string, string>;
}

// Komponen MqttCards, menerima semua data sensor sebagai props
export default function MqttCards({
  temperature,
  humidity,
  light,
  noise,
  gas,
  vibration,
  lastUpdated,
}: MqttCardsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        justifyContent: 'center',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Setiap SensorCard menerima nilai dan status update dari props */}
      <SensorCard
        icon="🌡️"
        title="Suhu"
        value={temperature}
        unit="°C"
        type="temperature"
        updated={lastUpdated.temperature}
      />
      <SensorCard
        icon="💧"
        title="Kelembapan"
        value={humidity}
        unit="%RH"
        type="humidity"
        updated={lastUpdated.humidity}
      />
      <SensorCard
        icon="💡"
        title="Cahaya"
        value={light}
        unit="lux"
        type="light"
        updated={lastUpdated.light}
      />
      <SensorCard
        icon="🔊"
        title="Kebisingan"
        value={noise}
        unit="dB (Analog)"
        type="noise"
        updated={lastUpdated.noise}
      />
      <SensorCard
        icon="💨"
        title="Gas/Asap"
        value={gas}
        unit="ppm (Relatif)"
        type="gas"
        updated={lastUpdated.gas}
      />
      <SensorCard
        icon="⚡"
        title="Getaran"
        value={vibration}
        unit="m/s²"
        type="vibration"
        updated={lastUpdated.vibration}
      />
    </div>
  );
}

// Interface untuk props yang diterima oleh komponen SensorCard
interface SensorCardProps {
  icon: string;
  title: string;
  value: string;
  unit: string;
  type: string;
  updated?: string;
}

// Komponen SensorCard yang menampilkan data individual sensor
const SensorCard: React.FC<SensorCardProps> = ({ icon, title, value, unit, type, updated }) => {
  const numericValue = typeof value === 'string' && value !== '—' ? parseFloat(value) : NaN;
  const statusColor = isNaN(numericValue) ? '#cbd5e1' : getStatusColor(numericValue, type);
  const statusText = isNaN(numericValue) ? 'N/A' : getStatusText(statusColor);

  const [fade, setFade] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const previousValue = prevValueRef.current;
    let timer: NodeJS.Timeout | undefined;
    
    if (value !== '—' && value !== previousValue) {
      setFade(true);
      timer = setTimeout(() => setFade(false), 500);
    }
    prevValueRef.current = value;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [value]);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `4px solid ${statusColor}`,
        transition: 'transform 0.2s ease-in-out',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Indikator status lingkaran di pojok kanan atas */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: statusColor,
        }}
      ></div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '2rem', marginRight: '10px' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#cbd5e1', fontWeight: 500 }}>{title}</h3>
      </div>
      <div
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: '#e2e8f0',
          opacity: fade ? 0.7 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        {value} <span style={{ fontSize: '1.2rem', fontWeight: 400, color: '#94a3b8' }}>{unit}</span>
      </div>
      <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
        {updated && <span>Updated: {updated}</span>}
      </div>
    </div>
  );
};