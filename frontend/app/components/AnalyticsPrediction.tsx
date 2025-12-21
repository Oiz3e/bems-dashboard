import React from 'react';

const AnalyticsPrediction: React.FC = () => {
  // Data dummy untuk simulasi hasil prediksi
  const energyPrediction = 1.42; // kWh
  const comfortIndex = 82; // %
  const airQualityRisk = 'Rendah';

  // Fungsi helper untuk menentukan warna status konsumsi energi
  const getEnergyStatusColor = (kwh: number) => {
    if (kwh > 2.0) return '#ef4444'; // Merah (Tinggi)
    if (kwh > 1.0) return '#eab308'; // Kuning (Sedang)
    return '#22c55e'; // Hijau (Rendah/Optimal)
  };

  // Fungsi helper untuk menentukan warna status comfort index
  const getComfortStatusColor = (index: number) => {
    if (index < 60) return '#ef4444'; // Merah (Buruk)
    if (index < 80) return '#eab308'; // Kuning (Cukup)
    return '#22c55e'; // Hijau (Optimal)
  };

  // Fungsi helper untuk menentukan warna status risiko kualitas udara
  const getAirQualityStatusColor = (risk: string) => {
    switch (risk) {
      case 'Tinggi':
        return '#ef4444';
      case 'Sedang':
        return '#eab308';
      case 'Rendah':
        return '#22c55e';
      default:
        return '#cbd5e1';
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '25px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#e2e8f0', fontWeight: 600 }}>Hasil Analitik & Prediksi</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>Prediksi Konsumsi Energi Hari Ini:</span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: getEnergyStatusColor(energyPrediction),
            }}
          >
            {energyPrediction} kWh
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>Comfort Index:</span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: getComfortStatusColor(comfortIndex),
            }}
          >
            {comfortIndex}% <span style={{ fontSize: '1rem', fontWeight: 500 }}>(Optimal)</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>Risiko Kualitas Udara:</span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: getAirQualityStatusColor(airQualityRisk),
            }}
          >
            {airQualityRisk}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '15px',
          padding: '12px 15px',
          backgroundColor: '#334155',
          borderRadius: '10px',
          fontSize: '0.9rem',
          color: '#cbd5e1',
          borderLeft: `5px solid #3b82f6`, // Aksen biru
        }}
      >
        <p style={{ margin: 0 }}>
          Analisis menunjukkan lingkungan saat ini sangat optimal. Konsumsi energi stabil dan kualitas udara bagus.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPrediction;