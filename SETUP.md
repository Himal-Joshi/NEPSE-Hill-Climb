# Setup Instructions for NEPSE Hill Climb (Live Data Mode)

The "NEPSE Hill Climb" game works out-of-the-box using embedded sample data. However, if you want to play using real-time/live historical data from NEPSE, you need to run the local proxy server included in this folder.

This server acts as a bridge to fetch data from NEPSE and provide it to the game with the necessary CORS headers (which browsers require).

## Prerequisites

- Python 3.8 or higher installed on your system.

## Setup Steps

1. **Open a terminal** and navigate to this folder (`e:\Projects\NEPSE-Hill-Climb`).

2. **Install the required Python packages**:
   It is recommended (but not required) to use a virtual environment.
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the local proxy server**:
   ```bash
   python server.py
   ```

4. **Verify it's running**:
   You should see terminal output like: `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`

5. **Play the game**:
   - Open `index.html` in your web browser.
   - Click the "Live Data" toggle at the top of the screen.
   - The game will now fetch real OHLC data from your local server!

> **Note**: This proxy server uses unofficial data sources intended for educational and personal use only. Do not use this data for actual financial trading decisions.
