import time
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="NEPSE Proxy Server")

# Allow CORS for the local browser game to fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ohlc")
async def get_ohlc(symbol: str = "NABIL", days: int = 220):
    try:
        now = int(time.time())
        # Roughly estimate 1.5x days to account for weekends/holidays
        past = now - int(days * 86400 * 1.5) 
        
        # NepseAlpha TradingView UDF API is usually public and reliable
        url = f"https://nepsealpha.com/trading/1/history?symbol={symbol}&resolution=1D&from={past}&to={now}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://nepsealpha.com/"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch data from source")
                
            data = response.json()
            
            if data.get('s') != 'ok':
                raise HTTPException(status_code=404, detail="Symbol not found or no data available")
                
            # Transform TradingView UDF format to array of objects
            bars = []
            for i in range(len(data['t'])):
                bars.append({
                    "t": data['t'][i],
                    "o": data['o'][i],
                    "h": data['h'][i],
                    "l": data['l'][i],
                    "c": data['c'][i],
                    "v": data['v'][i]
                })
            
            # Slice to only return the requested number of days (most recent)
            bars = bars[-days:]
            
            return {
                "symbol": symbol.upper(),
                "bars": bars
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting NEPSE Local Proxy Server on http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
