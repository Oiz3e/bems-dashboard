'use client';
import React, { useState } from 'react';

interface HeaderProps {
  status: string; // Status koneksi MQTT
}

const Header: React.FC<HeaderProps> = ({ status }) => {
  const [selectedRoom, setSelectedRoom] = useState('Kelas');

  // Warna status koneksi
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
      case 'reconnecting':
        return '#eab308';
      case 'error':
      case 'closed':
        return '#ef4444';
      default:
        return '#cbd5e1';
    }
  };

  return (
    <header
      style={{
        backgroundColor: '#1e293b',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        borderRadius: '0 0 16px 16px',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600, color: '#e2e8f0' }}>
        BEMS Dashboard - Ruang {selectedRoom}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
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
            <option value="Kelas">Kelas</option>
            <option value="Laboratorium">Laboratorium</option>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(status),
              display: 'inline-block',
            }}
          ></span>
          <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;