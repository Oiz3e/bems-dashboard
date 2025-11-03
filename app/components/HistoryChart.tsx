'use client';

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const HistoryChart: React.FC = () => {
  const [selectedParam, setSelectedParam] = useState('Suhu (°C)');
  const [timeRange, setTimeRange] = useState('24h');

  // Data grafik placeholder berdasarkan parameter dan rentang waktu
  const generateChartData = (param: string, range: string) => {
    const labels = [];
    const dataPoints = [];
    let startValue = 20; // Nilai awal untuk simulasi data

    if (range === '1h') {
      for (let i = 0; i <= 60; i += 5) {
        labels.push(`${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`);
        dataPoints.push(startValue + Math.sin(i / 10) * 2 + Math.random() * 2);
      }
    } else if (range === '24h') {
      for (let i = 0; i <= 24; i += 2) {
        labels.push(`${String(i).padStart(2, '0')}:00`);
        dataPoints.push(startValue + Math.sin(i / 4) * 5 + Math.random() * 3);
      }
    } else if (range === '7d') {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      for (let i = 0; i < 7; i++) {
        labels.push(days[i]);
        dataPoints.push(startValue + Math.sin(i / 2) * 8 + Math.random() * 5);
      }
    }

    return {
      labels,
      datasets: [
        {
          label: selectedParam,
          data: dataPoints,
          borderColor: '#3b82f6', // Biru
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
        },
      ],
    };
  };

  const data = generateChartData(selectedParam, timeRange);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)', // Warna tooltip gelap
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#3b82f6',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.2)',
        },
        ticks: {
          color: '#cbd5e1',
        },
      },
      y: {
        grid: {
          color: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.2)',
        },
        ticks: {
          color: '#cbd5e1',
        },
        title: {
          display: true,
          text: 'Nilai Sensor',
          color: '#cbd5e1',
        }
      },
    },
  };

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        {/* Dropdown pilihan parameter sensor */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
            style={{
              backgroundColor: '#334155',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '1rem',
              appearance: 'none',
              paddingRight: '30px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <option>Suhu (°C)</option>
            <option>Kelembapan (%RH)</option>
            <option>Cahaya (lux)</option>
            <option>Kebisingan (dB)</option>
            <option>Gas/Asap (ppm)</option>
            <option>Getaran (m/s²)</option>
          </select>
          {/* Custom dropdown arrow */}
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#e2e8f0',
            }}
          >
            ▼
          </span>
        </div>
        {/* Tombol pilihan rentang waktu */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['1h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                backgroundColor: timeRange === range ? '#3b82f6' : '#334155', // Biru atau abu-abu
                color: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 15px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      {/* Container untuk grafik */}
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default HistoryChart;