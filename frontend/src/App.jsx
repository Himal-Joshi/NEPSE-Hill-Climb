import React, { useState, useEffect } from 'react';
import './index.css';
import StartScreen from './components/StartScreen';
import GameCanvas from './components/GameCanvas';
import GameOverModal from './components/GameOverModal';
import GameFinishedModal from './components/GameFinishedModal';

const SYMBOLS = ['NEPSE', 'NABIL', 'NIMB', 'UPPER', 'NLIC', 'ADBL'];

function App() {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'playing' | 'gameover' | 'finished'
  const [settings, setSettings] = useState({
    symbol: 'NABIL',
    vehicleType: 'dirtbike',
    chartType: 'candle',
    mode: 'sample',
    theme: 'dark',
  });
  const [stats, setStats] = useState({ price: 0, distance: 0, profit: 0, year: 2025 });
  const [gameOverStats, setGameOverStats] = useState({
    distance: 0,
    finalPrice: 0,
    finalProfit: 0,
  });
  const [gameKey, setGameKey] = useState(0);
  const [timeStr, setTimeStr] = useState('');

  // Clock tick in bottom toolbar
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString(undefined, { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const handleStart = () => {
    setStats({ price: 0, distance: 0, profit: 0, year: 2025 });
    setGameKey((k) => k + 1);
    setScreen('playing');
  };

  const handleGameOver = (finalStats) => {
    setGameOverStats(finalStats);
    if (finalStats.isFinished) {
      setScreen('finished');
    } else {
      setScreen('gameover');
    }
  };

  const handleRetry = () => {
    setStats({ price: 0, distance: 0, profit: 0, year: 2025 });
    setGameKey((k) => k + 1);
    setScreen('playing');
  };

  const handleMenu = () => setScreen('menu');

  const handleRestartRide = () => {
    setStats({ price: 0, distance: 0, profit: 0, year: 2025 });
    setGameKey((k) => k + 1);
    setScreen('playing');
  };

  const handleToolbarSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Instantly rebuild and restart the game when toolbar settings change
    setStats({ price: 0, distance: 0, profit: 0, year: 2025 });
    setGameKey((k) => k + 1);
  };

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const isProfitUp = stats.profit >= 0;

  return (
    <div className="tv-portal">
      {/* 1. TradingView Top Navbar */}
      <div className="tv-header">
        <div className="tv-header-left">
          <div className="tv-logo">📈</div>
          <div className="tv-brand">NEPSE Hill Climb</div>
          <div className="tv-divider"></div>

          {/* Symbol Select dropdown */}
          <select
            className="tv-select"
            value={settings.symbol}
            onChange={(e) => handleToolbarSettingChange('symbol', e.target.value)}
          >
            {SYMBOLS.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>

          <div className="tv-divider"></div>

          {/* Timeframe Toggles */}
          <span className="tv-btn active">1D</span>
          <span className="tv-btn">1W</span>

          <div className="tv-divider"></div>

          {/* Chart Style Selector */}
          <select
            className="tv-select"
            value={settings.chartType}
            onChange={(e) => handleToolbarSettingChange('chartType', e.target.value)}
          >
            <option value="candle">📊 Candles</option>
            <option value="line">📈 Line</option>
          </select>
        </div>

        <div className="tv-header-right">
          {/* Vehicle Selector */}
          <select
            className="tv-select"
            value={settings.vehicleType}
            onChange={(e) => handleToolbarSettingChange('vehicleType', e.target.value)}
          >
            <option value="dirtbike">🏍️ Dirt Bike</option>
            <option value="monster">🚙 Monster Truck</option>
          </select>

          <div className="tv-divider"></div>

          {/* Mode Selector */}
          <select
            className="tv-select"
            value={settings.mode}
            onChange={(e) => handleToolbarSettingChange('mode', e.target.value)}
          >
            <option value="sample">📦 Sample Data</option>
            <option value="live">🔴 Live API</option>
          </select>

          <div className="tv-divider"></div>

          {/* Restart Ride */}
          <button className="tv-restart-btn" onClick={handleRestartRide}>
            🔄 Restart
          </button>

          {/* Settings Wheel returns to Menu */}
          <button className="tv-tool-icon" onClick={handleMenu} title="Return to Menu">
            ⚙️
          </button>

          <button className="tv-theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {settings.theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* 2. Main Body (Sidebar + Workspace + Sidebar) */}
      <div className="tv-body">
        {/* Left Drawing Sidebar */}
        <div className="tv-left-toolbar">
          <div className="tv-tool-icon active">✛</div>
          <div className="tv-tool-icon">╱</div>
          <div className="tv-tool-icon">⋔</div>
          <div className="tv-tool-icon">🖌️</div>
          <div className="tv-tool-icon" style={{ fontWeight: 'bold' }}>T</div>
          <div className="tv-tool-icon">📏</div>
          <div className="tv-tool-icon">🔍</div>
          <div className="tv-tool-icon">🧲</div>
          <div className="tv-tool-icon">🔒</div>
          <div className="tv-tool-icon">👁️</div>
          <div className="tv-tool-icon">🗑️</div>
        </div>

        {/* Central Workspace (Canvas + HUD legend + Modals) */}
        <div className="tv-workspace">
          {/* Game Canvas always mounted in background */}
          <GameCanvas
            key={gameKey}
            settings={settings}
            onStats={setStats}
            onGameOver={handleGameOver}
          />

          {/* TradingView Integrated Chart Legend HUD */}
          {screen === 'playing' && (
            <div className="tv-legend">
              <span className="tv-legend-symbol">
                {settings.symbol === 'NEPSE' ? 'NEPSE INDEX' : `${settings.symbol} Bank Ltd.`}
              </span>
              <span className="tv-legend-timeframe">1D</span>
              <span className="tv-legend-val">O<span className="val-up">{stats.price}</span></span>
              <span className="tv-legend-val">H<span className="val-up">{stats.price}</span></span>
              <span className="tv-legend-val">L<span className="val-up">{stats.price}</span></span>
              <span className="tv-legend-val">C<span className="val-up">{stats.price}</span></span>
              <span className="tv-legend-val">
                Distance: <span className="val-accent">{stats.distance}m</span>
              </span>
              <span className={`tv-legend-val profit-${isProfitUp ? 'up' : 'down'}`}>
                P/L:{' '}
                <span className="val-accent">
                  {isProfitUp ? '+' : ''}
                  {stats.profit.toFixed(2)}
                </span>
              </span>
            </div>
          )}

          {/* Mobile controls overlay */}
          {screen === 'playing' && (
            <div className="mobile-controls">
              <div className="mobile-btn" id="btn-brake">
                Brake
              </div>
              <div className="mobile-btn" id="btn-gas">
                Gas
              </div>
            </div>
          )}

          {/* Glassmorphic Modals centered over the chart */}
          {screen === 'menu' && (
            <div className="tv-modal-overlay">
              <StartScreen
                onStart={handleStart}
                settings={settings}
                setSettings={setSettings}
              />
            </div>
          )}

          {screen === 'gameover' && (
            <div className="tv-modal-overlay">
              <GameOverModal
                stats={gameOverStats}
                onRetry={handleRetry}
                onMenu={handleMenu}
              />
            </div>
          )}

          {screen === 'finished' && (
            <div className="tv-modal-overlay">
              <GameFinishedModal
                stats={gameOverStats}
                onRetry={handleRetry}
                onMenu={handleMenu}
              />
            </div>
          )}
        </div>

        {/* Right Watchlist Sidebar */}
        <div className="tv-right-sidebar">
          <div className="tv-tool-icon active">📋</div>
          <div className="tv-tool-icon">🔔</div>
          <div className="tv-tool-icon">📰</div>
          <div className="tv-tool-icon">📅</div>
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="tv-bottom-bar">
        <div className="tv-bottom-left">
          <span className="tv-tab active">Chart Modes</span>
          <span className="tv-tab">Live Scanners</span>
          <span className="tv-tab">Trade Monitor</span>
          <span className="tv-tab">Trade Signals AI</span>
          <span className="tv-tab">Chart Master</span>
          <span className="tv-tab">My Algorithms</span>
          <span className="tv-tab">Portfolios</span>
        </div>
        <div className="tv-bottom-right">
          <span style={{ color: 'var(--accent)', fontWeight: '700', marginRight: '12px' }}>
            📅 Year: {stats.year || 2025}
          </span>
          <div className="tv-divider" style={{ margin: '0 8px 0 0' }}></div>
          <span>{timeStr}</span>
          <span>(UTC+5:45)</span>
          <span className="tv-btn">%</span>
          <span className="tv-btn">log</span>
          <span className="tv-btn active">auto</span>
        </div>
      </div>
    </div>
  );
}

export default App;
