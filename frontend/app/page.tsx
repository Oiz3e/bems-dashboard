import React from 'react';
import DashboardClient, { SensorDataPoint } from './components/DashboardClient';

// Fungsi Fetch Data dari Backend Express
async function getInitialHistory() {
  try {
    // cache: 'no-store' agar data selalu fresh tiap kali refresh halaman
    const res = await fetch('http://localhost:3001/api/history?limit=20', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Gagal mengambil data history');
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching history:', error);
    return []; // Return array kosong jika backend mati, biar gak crash
  }
}

export default async function Page() {
  // 1. Ambil data mentah dari Backend
  const rawData = await getInitialHistory();

  // 2. Mapping data Backend (Snake_case/CamelCase) ke format Chart (SensorDataPoint)
  const initialHistory = {
    temp: rawData.map((d: any) => ({ time: d.createdAt, value: d.temperature })) as SensorDataPoint[],
    hum: rawData.map((d: any) => ({ time: d.createdAt, value: d.humidity })) as SensorDataPoint[],
    light: rawData.map((d: any) => ({ time: d.createdAt, value: d.lux })) as SensorDataPoint[],
    noise: rawData.map((d: any) => ({ time: d.createdAt, value: d.noise })) as SensorDataPoint[], // DB: noise
    gas: rawData.map((d: any) => ({ time: d.createdAt, value: d.mq2_adc })) as SensorDataPoint[],
    vib: rawData.map((d: any) => ({ time: d.createdAt, value: d.vibration })) as SensorDataPoint[],
    uv: rawData.map((d: any) => ({ time: d.createdAt, value: d.uv_status })) as SensorDataPoint[], // DB: uv_status
  };

  // 3. Panggil Client Component dengan membawa data awal
  return <DashboardClient initialHistory={initialHistory} />;
}