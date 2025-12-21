// app/page.tsx
import prisma from '../lib/prisma'; // Import Prisma Singleton kita
import DashboardClient, { SensorDataPoint } from './components/DashboardClient';

// Helper function buat format data dari DB ke format Chart
// Karena DB pake DateTime object, Chart butuh string jam:menit
function formatData(data: any[]): SensorDataPoint[] {
  return data.map((d) => ({
    time: d.createdAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    value: d.value,
  })).reverse(); // Data DB biasanya newest first, chart butuh oldest first buat line chart
}

export default async function Page() {
  // 1. Fetch data dari MongoDB via Prisma
  // Kita ambil 50 data terakhir buat masing-masing topik
  // Note: Ini asumsi di DB lu kolom 'topic' isinya kayak di bawah
  
  const [tempData, humData, lightData, noiseData, gasData, vibData, uvData] = await Promise.all([
    prisma.energyLog.findMany({ where: { topic: 'temperature' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'humidity' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'light' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'noise' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'gas' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'vibration' }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.energyLog.findMany({ where: { topic: 'uv_status' }, take: 20, orderBy: { createdAt: 'desc' } }),
  ]);

  // 2. Format datanya biar siap dimakan sama Client Component
  const initialHistory = {
    temp: formatData(tempData),
    hum: formatData(humData),
    light: formatData(lightData),
    noise: formatData(noiseData),
    gas: formatData(gasData),
    vib: formatData(vibData),
    uv: formatData(uvData),
  };

  // 3. Render Client Component
  return <DashboardClient initialHistory={initialHistory} />;
}