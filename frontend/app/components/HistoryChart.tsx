'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { startOfMinute, startOfHour, startOfDay, startOfMonth, format, differenceInHours, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, zoomPlugin);
}

interface SensorDataPoint {
  time: string;
  value: number;
}

interface HistoryChartProps {
  temperatureHistory: SensorDataPoint[];
  humidityHistory: SensorDataPoint[];
  lightHistory: SensorDataPoint[];
  noiseHistory: SensorDataPoint[];
  gasHistory: SensorDataPoint[];
  vibrationHistory: SensorDataPoint[];
  uvStatusHistory: SensorDataPoint[];
}

// === FUNGSI AGREGASI DINAMIS ===
const aggregateData = (data: SensorDataPoint[], rangeType: string, start?: string, end?: string): SensorDataPoint[] => {
  if (data.length === 0) return [];
  if (rangeType === 'Latest') return data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Interval otomatis
  let interval: 'minute' | 'hour' | 'day' | 'month' = 'hour';
  
  if (rangeType === 'Custom' && start && end) {
    const diffHours = differenceInHours(new Date(end), new Date(start));
    const diffDays = differenceInDays(new Date(end), new Date(start));
    if (diffHours <= 24) interval = 'minute';
    else if (diffDays <= 7) interval = 'hour';
    else if (diffDays <= 60) interval = 'day';
    else interval = 'month';
  } else {
    if (rangeType === '1 Hari') interval = 'hour';
    else if (rangeType === '1 Minggu' || rangeType === '1 Bulan') interval = 'day';
    else if (rangeType === '1 Tahun') interval = 'month';
  }

  const grouped: Record<string, { sum: number; count: number; dateObj: Date }> = {};

  data.forEach((point) => {
    const date = new Date(point.time);
    let key = '';
    let groupDate = new Date();

    if (interval === 'minute') { groupDate = startOfMinute(date); key = format(groupDate, 'yyyy-MM-dd HH:mm'); }
    else if (interval === 'hour') { groupDate = startOfHour(date); key = format(groupDate, 'yyyy-MM-dd HH:00'); }
    else if (interval === 'day') { groupDate = startOfDay(date); key = format(groupDate, 'yyyy-MM-dd'); }
    else { groupDate = startOfMonth(date); key = format(groupDate, 'yyyy-MM'); }

    if (!grouped[key]) grouped[key] = { sum: 0, count: 0, dateObj: groupDate };
    grouped[key].sum += point.value;
    grouped[key].count += 1;
  });

  return Object.values(grouped)
    .map((group) => ({ time: group.dateObj.toISOString(), value: group.sum / group.count }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

const HistoryChart: React.FC<HistoryChartProps> = () => {
  const [selectedParam, setSelectedParam] = useState('Suhu (°C)');
  const [timeRange, setTimeRange] = useState('Latest'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeData, setActiveData] = useState<SensorDataPoint[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('Suhu');
  const [currentUnit, setCurrentUnit] = useState('°C');

  // Fetch Data Logic
  const fetchAndProcessData = async () => {
    setIsLoading(true);
    try {
        let query = 'limit=50'; // Default Latest
        if (timeRange === 'Custom') {
            if (!startDate || !endDate) return;
            query = `start=${new Date(startDate).toISOString()}&end=${new Date(endDate).toISOString()}`;
        } else if (timeRange !== 'Latest') {
            const mapRange: Record<string, string> = { '1 Hari': '1d', '1 Minggu': '1w', '1 Bulan': '1m', '1 Tahun': '1y' };
            query = `range=${mapRange[timeRange]}`;
        }

        const res = await fetch(`http://localhost:3001/api/history?${query}`);
        const rawData = await res.json();

        const mapParamToField = (item: any) => {
            switch (selectedParam) {
                case 'Suhu (°C)': return item.temperature;
                case 'Kelembapan (%RH)': return item.humidity;
                case 'Cahaya (lux)': return item.lux;
                case 'Kebisingan (dB)': return item.noise;
                case 'Gas/Asap (ppm)': return item.mq2_adc;
                case 'Getaran (m/s²)': return item.vibration;
                case 'Deteksi Api/UV (Status)': return item.uv_status;
                default: return 0;
            }
        };

        const rawValues = rawData.map((d: any) => ({ time: d.createdAt, value: mapParamToField(d) }));
        const aggregated = aggregateData(rawValues, timeRange, startDate, endDate);
        setActiveData(aggregated);

    } catch (err) {
        console.error("Gagal fetch:", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'Custom') fetchAndProcessData();
  }, [timeRange, selectedParam]);

  useEffect(() => {
    if (selectedParam.includes('Suhu')) { setCurrentLabel('Suhu'); setCurrentUnit('°C'); }
    else if (selectedParam.includes('Kelembapan')) { setCurrentLabel('Kelembapan'); setCurrentUnit('%RH'); }
    else if (selectedParam.includes('Cahaya')) { setCurrentLabel('Cahaya'); setCurrentUnit('lux'); }
    else if (selectedParam.includes('Kebisingan')) { setCurrentLabel('Kebisingan'); setCurrentUnit('dB'); }
    else if (selectedParam.includes('Gas')) { setCurrentLabel('Gas'); setCurrentUnit('ppm'); }
    else if (selectedParam.includes('Getaran')) { setCurrentLabel('Getaran'); setCurrentUnit('m/s²'); }
    else if (selectedParam.includes('UV')) { setCurrentLabel('Api/UV'); setCurrentUnit('Sts'); }
  }, [selectedParam]);

  const chartData = {
    labels: activeData.map(d => d.time),
    datasets: [{
      label: `${currentLabel} (${currentUnit})`,
      data: activeData.map(d => ({ x: d.time, y: d.value })),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      fill: true,
      tension: 0.3,
      pointRadius: activeData.length > 50 ? 2 : 4,
      // Hover radius diperbesar biar gampang kena
      hoverRadius: 8, 
    }]
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    
    // === 1. INTERAKSI: Agar tooltip muncul tanpa harus pas kena titik ===
    interaction: {
      mode: 'nearest', // Cari titik terdekat dari kursor
      axis: 'x',       // Berdasarkan sumbu X (waktu)
      intersect: false // Tooltip muncul walau kursor tidak pas di titik
    },
    
    plugins: {
      legend: { display: false },
      title: { display: false },
      
      // === 2. TOOLTIP: Kustomisasi tampilan Hover ===
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // Warna gelap modern
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#3b82f6',
        borderWidth: 1,
        padding: 12,
        displayColors: false, // Hilangkan kotak warna dataset
        callbacks: {
           // Header Tooltip: Tampilkan Waktu Lengkap
           title: (ctx: any) => {
             const d = new Date(ctx[0].parsed.x);
             return format(d, 'dd MMMM yyyy, HH:mm:ss', { locale: id });
           },
           // Body Tooltip: Tampilkan Nama Sensor + Nilai + Satuan
           label: (context: any) => {
             let label = '';
             if (context.parsed.y !== null) {
                // Format angka dengan 2 desimal
                const val = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(context.parsed.y);
                label = `${currentLabel}: ${val} ${currentUnit}`;
             }
             return label;
           }
        }
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: false }, pinch: { enabled: false }, mode: 'x' }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
           tooltipFormat: 'dd MMM yyyy HH:mm',
           displayFormats: { minute: 'HH:mm', hour: 'HH:mm', day: 'dd MMM', month: 'MMM yy' }
        },
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { color: '#cbd5e1', maxRotation: 0, autoSkip: true }
      },
      y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#cbd5e1' } }
    }
  };

  return (
    <div style={{ backgroundColor: '#1e2b3b', borderRadius: '16px', padding: '20px', minHeight: '450px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#e2e8f0', fontWeight: 600 }}>
            Grafik {currentLabel}
            </h3>
            <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                style={{ backgroundColor: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '5px 10px' }}
            >
                <option>Suhu (°C)</option>
                <option>Kelembapan (%RH)</option>
                <option>Cahaya (lux)</option>
                <option>Kebisingan (dB)</option>
                <option>Gas/Asap (ppm)</option>
                <option>Getaran (m/s²)</option>
                <option>Deteksi Api/UV (Status)</option>
            </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Latest', '1 Hari', '1 Minggu', '1 Bulan', 'Custom'].map((range) => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                        backgroundColor: timeRange === range ? '#3b82f6' : '#334155',
                        color: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '5px 10px',
                        cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap'
                    }}
                >
                    {range}
                </button>
            ))}
        </div>

        {timeRange === 'Custom' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', flexWrap: 'wrap' }}>
                <input 
                    type="datetime-local" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '4px', padding: '5px' }}
                />
                <span style={{ color: '#94a3b8' }}>s/d</span>
                <input 
                    type="datetime-local" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '4px', padding: '5px' }}
                />
                <button 
                    onClick={fetchAndProcessData}
                    style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 15px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Terapkan
                </button>
            </div>
        )}
      </div>

      <div style={{ flexGrow: 1, position: 'relative' }}>
        {isLoading ? (
           <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Memuat data...</div>
        ) : (
           <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

export default HistoryChart;