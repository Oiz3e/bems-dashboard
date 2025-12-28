import React from 'react';
import DashboardClient, { SensorDataPoint } from './components/DashboardClient';

// Fungsi Fetch Data dari Backend Express
async function getInitialHistory() {
  try {
    const res = await fetch('http://localhost:3001/api/history?limit=20', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Gagal mengambil data history');
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching history:', error);
    return []; 
  }
}

export default async function Page() {
  const rawData = await getInitialHistory();

  // MAPPING: DB (sound/uv) -> Frontend (noise/uv_status)
  const initialHistory = {
    temp: rawData.map((d: any) => ({ time: d.createdAt, value: d.temperature })) as SensorDataPoint[],
    hum: rawData.map((d: any) => ({ time: d.createdAt, value: d.humidity })) as SensorDataPoint[],
    light: rawData.map((d: any) => ({ time: d.createdAt, value: d.lux })) as SensorDataPoint[],
    
    // Tetap simpan di key 'noise', ambil dari d.sound
    noise: rawData.map((d: any) => ({ time: d.createdAt, value: d.sound ?? d.noise ?? 0 })) as SensorDataPoint[], 
    
    gas: rawData.map((d: any) => ({ time: d.createdAt, value: d.mq2_adc })) as SensorDataPoint[],
    vib: rawData.map((d: any) => ({ time: d.createdAt, value: d.vibration })) as SensorDataPoint[],
    
    // Tetap simpan di key 'uv', ambil dari d.uv
    uv: rawData.map((d: any) => ({ time: d.createdAt, value: d.uv ?? d.uv_status ?? 0 })) as SensorDataPoint[], 
  };

  return <DashboardClient initialHistory={initialHistory} />;
}