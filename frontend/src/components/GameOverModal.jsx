import React from 'react';

function GameOverModal({ stats, onRetry, onMenu }) {
  const profitColor = stats.finalProfit >= 0 ? 'var(--up)' : 'var(--down)';

  return (
    <div className="gameover-overlay" onClick={onMenu}>
      <div className="gameover-card" onClick={(e) => e.stopPropagation()}>
        <div className="gameover-icon">📉</div>
        <h2 className="gameover-title">MARGIN CALL</h2>
        <p className="gameover-subtitle">Your position has been liquidated</p>

        <div className="gameover-stats">
          <div className="gameover-stat-box">
            <div className="gameover-stat-label">Distance</div>
            <div className="gameover-stat-value">{stats.distance}m</div>
          </div>
          <div className="gameover-stat-box">
            <div className="gameover-stat-label">Last Price</div>
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
          <button className="btn-primary" onClick={onRetry}>
            Try Again
          </button>
          <button className="btn-secondary" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameOverModal;
