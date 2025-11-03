import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: '#1e293b',
        padding: '15px 24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#94a3b8',
        marginTop: 'auto',
        boxShadow: '0 -4px 6px rgba(0,0,0,0.1)',
        borderRadius: '16px 16px 0 0'
      }}
    >
      <p style={{ margin: 0 }}>BEMS Dashboard © 2025 – IoT x ML System</p>
    </footer>
  );
};

export default Footer;