import React from 'react';

const SYMBOLS = ['NEPSE', 'NABIL', 'NIMB', 'UPPER', 'NLIC', 'ADBL'];

const VEHICLES = [
  { label: '🏍️ Dirt Bike', value: 'dirtbike' },
  { label: '🚙 Monster Truck', value: 'monster' },
];

const CHART_STYLES = [
  { label: '📈 Line', value: 'line' },
  { label: '📊 Candles', value: 'candle' },
];

const DATA_SOURCES = [
  { label: '📦 Sample Data', value: 'sample' },
  { label: '🔴 Live API', value: 'live' },
];

const PARTICLES = [
  { text: 'NABIL +2.3%', top: '12%', left: '8%', delay: '0s' },
  { text: 'NIMB -1.1%', top: '22%', left: '78%', delay: '1.2s' },
  { text: 'UPPER +0.8%', top: '68%', left: '5%', delay: '2.4s' },
  { text: 'ADBL -0.5%', top: '75%', left: '82%', delay: '0.6s' },
  { text: 'NLIC +1.7%', top: '35%', left: '88%', delay: '3.1s' },
  { text: 'NEPSE +0.3%', top: '85%', left: '25%', delay: '1.8s' },
  { text: 'SCB -2.1%', top: '8%', left: '55%', delay: '2.8s' },
  { text: 'SBL +1.4%', top: '55%', left: '70%', delay: '0.9s' },
  { text: 'GBIME +0.6%', top: '45%', left: '3%', delay: '3.5s' },
  { text: 'NTC -0.9%', top: '90%', left: '60%', delay: '1.5s' },
];

function StartScreen({ onStart, settings, setSettings }) {
  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTheme = () => {
    updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="start-screen">
      {/* Floating background particles */}
      <div className="start-bg-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            style={{
              top: p.top,
              left: p.left,
              animationDelay: p.delay,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          >
            {p.text}
          </span>
        ))}
      </div>

      {/* Logo */}
      <div className="start-logo">
        NEPSE
        <br />
        HILL CLIMB
      </div>
      <div className="start-subtitle">Ride the Market</div>

      {/* Settings Card */}
      <div className="start-card">
        {/* Stock Symbol */}
        <div className="option-group">
          <span className="option-label">Stock Symbol</span>
          <div className="option-buttons">
            {SYMBOLS.map((sym) => (
              <button
                key={sym}
                className={`option-btn${settings.symbol === sym ? ' active' : ''}`}
                onClick={() => updateSetting('symbol', sym)}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle */}
        <div className="option-group">
          <span className="option-label">Vehicle</span>
          <div className="option-buttons">
            {VEHICLES.map((v) => (
              <button
                key={v.value}
                className={`option-btn${settings.vehicleType === v.value ? ' active' : ''}`}
                onClick={() => updateSetting('vehicleType', v.value)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Style */}
        <div className="option-group">
          <span className="option-label">Chart Style</span>
          <div className="option-buttons">
            {CHART_STYLES.map((c) => (
              <button
                key={c.value}
                className={`option-btn${settings.chartType === c.value ? ' active' : ''}`}
                onClick={() => updateSetting('chartType', c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Source */}
        <div className="option-group">
          <span className="option-label">Data Source</span>
          <div className="option-buttons">
            {DATA_SOURCES.map((d) => (
              <button
                key={d.value}
                className={`option-btn${settings.mode === d.value ? ' active' : ''}`}
                onClick={() => updateSetting('mode', d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button className="start-btn" onClick={onStart}>
          🚀 START RIDE
        </button>
      </div>

      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {settings.theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </div>
  );
}

export default StartScreen;
