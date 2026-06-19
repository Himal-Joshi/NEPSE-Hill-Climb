import React from 'react';

function GameFinishedModal({ stats, onRetry, onMenu }) {
  const profitColor = stats.finalProfit >= 0 ? 'var(--up)' : 'var(--down)';

  return (
    <div className="gameover-overlay" onClick={onMenu}>
      <div className="gameover-card" style={{ border: '1px solid var(--up)' }} onClick={(e) => e.stopPropagation()}>
        <div className="gameover-icon">🏆</div>
        <h2 className="gameover-title" style={{ color: 'var(--up)' }}>FINANCIAL FREEDOM</h2>
        <p className="gameover-subtitle" style={{ color: 'var(--text-secondary)' }}>You successfully crossed the finish line!</p>

        <div className="gameover-stats">
          <div className="gameover-stat-box">
            <div className="gameover-stat-label">Distance</div>
            <div className="gameover-stat-value">{stats.distance}m</div>
          </div>
          <div className="gameover-stat-box">
            <div className="gameover-stat-label">Final Price</div>
            <div className="gameover-stat-value">
              {stats.finalPrice.toFixed(2)}
            </div>
          </div>
          <div className="gameover-stat-box">
            <div className="gameover-stat-label">P / L</div>
            <div className="gameover-stat-value" style={{ color: profitColor }}>
              {stats.finalProfit >= 0 ? '+' : ''}
              {stats.finalProfit.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="gameover-buttons">
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--up), #2e7d32)' }} onClick={onRetry}>
            Ride Again
          </button>
          <button className="btn-secondary" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameFinishedModal;
