import React from 'react';

export default function Page() {
    const handleClick = () => {
        alert('Bouton rouge cliqué');
    };

    return (
        <button
            style={{
                backgroundColor: '#ff0000',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                borderRadius: '4px'
            }}
            onClick={handleClick}
        >
            Clique‑moi
        </button>
    );
}
