'use client';

import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt/dist/mqtt.min';
import type { MqttClient } from 'mqtt';

const URL = process.env.NEXT_PUBLIC_MQTT_WS_URL as string;
type Msg = Record<string, any>;

export default function MqttCards() {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState('connecting');

  const [lux, setLux] = useState('—');
  const [luxTime, setLuxTime] = useState('—'); // 🕒 waktu publish BH1750

  const [uvi, setUvi] = useState('—');
  const [tc, setTc] = useState('—');
  const [dhtT, setDhtT] = useState('—');
  const [dhtH, setDhtH] = useState('—');
  const [temtV, setTemtV] = useState('—');
  const [gx, setGx] = useState('—');
  const [gy, setGy] = useState('—');
  const [gz, setGz] = useState('—');
  const [hall, setHall] = useState('—');
  const [sound, setSound] = useState('—');

  useEffect(() => {
    if (!URL) { setStatus('missing NEXT_PUBLIC_MQTT_WS_URL env'); return; }

    const client = mqtt.connect(URL, { protocolVersion: 4 });
    clientRef.current = client;

    client.on('connect', () => {
      setStatus('connected');
      client.subscribe('bems/#');
    });
    client.on('reconnect', () => setStatus('reconnecting'));
    client.on('close', () => setStatus('closed'));
    client.on('error', (err) => setStatus('error: ' + (err?.message ?? 'unknown')));

    client.on('message', (topic, payload) => {
      try {
        const obj: Msg = JSON.parse(payload.toString());
        switch (topic) {
          case 'bems/bh1750':
            setLux(fmt(obj.avg_lux));
            setLuxTime(obj.datetime ?? '—'); // 🕒 ambil waktu
            break;
          case 'bems/guva': setUvi(fmt(obj.uvi)); break;
          case 'bems/max6675': setTc(obj?.error ? 'OPEN' : fmt(obj.tempC)); break;
          case 'bems/dht11': setDhtT(fmt(obj.tempC)); setDhtH(fmt(obj.hum)); break;
          case 'bems/temt6000': setTemtV(fmt(obj.volts)); break;
          case 'bems/mpu6050': setGx(fmt(obj.gx)); setGy(fmt(obj.gy)); setGz(fmt(obj.gz)); break;
          case 'bems/hall': setHall(fmt(obj.state)); break;
          case 'bems/sound': setSound(fmt(obj.level)); break;
          default: break;
        }
      } catch { /* payload bukan JSON */ }
    });

    return () => client.end(true);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.7 }}>Status: {status}</div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Card title="BH1750 (Lux)" value={lux} time={luxTime} />
        <Card title="GUVA (UVI)" value={uvi} />
        <Card title="MAX6675 (°C)" value={tc} />
        <Card title="DHT11 Temp (°C)" value={dhtT} />
        <Card title="DHT11 Humidity (%)" value={dhtH} />
        <Card title="TEMT6000 (V)" value={temtV} />
        <Card title="MPU6050 gx (°/s)" value={gx} />
        <Card title="MPU6050 gy (°/s)" value={gy} />
        <Card title="MPU6050 gz (°/s)" value={gz} />
        <Card title="Hall (state)" value={hall} />
        <Card title="Sound (level)" value={sound} />
      </div>
    </div>
  );
}

function Card({ title, value, time }: { title: string; value: string; time?: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 28 }}>{value}</div>
      {time && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>🕒 {time}</div>}
    </div>
  );
}

function fmt(v: any) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(2) : '—';
  return String(v);
}
