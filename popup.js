// popup.js

document.addEventListener("DOMContentLoaded", async () => {
    const symbolEl = document.getElementById("stock-symbol");
    const priceEl = document.getElementById("price");
    const marketcapEl = document.getElementById("market-cap");
    const changeEl = document.getElementById("change");
    const peRatioEl = document.getElementById("pe-ratio");
    
    const copyBtn = document.getElementById("copy-btn");
    const exportBtn = document.getElementById("export-btn");

    // Format large numbers into human-readable values
    function formatMarketCap(value) {
        if (!value) return "N/A";
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
        return `$${value.toFixed(2)}`;
    }

    // Fetching data using API key
    async function fetchStockData(symbol) {
        try {
            const quoteRes = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
            );
            const quoteData = await quoteRes.json();

            const profileRes = await fetch(
                `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`
            );
            const profileData = await profileRes.json();

            const metricsRes = await fetch(
                `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`
            );
            const metricsData = await metricsRes.json();

            return {
                symbol: symbol,
                price: quoteData.c,
                change: quoteData.dp,
                marketCap: profileData.marketCapitalization
                    ? formatMarketCap(profileData.marketCapitalization)
                    : "N/A",
                peRatio: metricsData.metric.peTTM
                    ? metricsData.metric.peTTM.toFixed(2)
                    : "N/A"
            };
        } catch (error) {
            console.error("Fetch error: ", error); 
            return null;
        }
    }

    // Update UI with data
    function updateUI(data) {
        symbolEl.textContent = data.symbol;
        priceEl.textContent = data.price ? `$${data.price}` : "--";
        marketcapEl.textContent = data.marketCap;
        peRatioEl.textContent = data.peRatio;

        if (data.change !== undefined && data.change !== null) {
            changeEl.textContent = `${data.change > 0 ? "+" : ""}${data.change}%`;
            changeEl.className = data.change >= 0 ? "gain" : "loss";
        } else {
            changeEl.textContent = "--";
        }
    }

    // Copy to clipboard functionality
    function copyData(data) { 
        const text = `Symbol: ${data.symbol}\nPrice: $${data.price}\nMarket Cap: ${data.marketCap}\nP/E Ratio: ${data.peRatio}\nChange: ${data.change > 0 ? "+" : ""}${data.change}%`;
        navigator.clipboard.writeText(text)
            .then(() => alert("Copied to Clipboard!"))
            .catch(err => console.error("Copy failed", err));
    }

    // Export as CSV functionality
    function exportCSV(data) {
        const rows = [
            ["Symbol", "Price", "Market Cap", "P/E Ratio", "Change"],
            [data.symbol, data.price, data.marketCap, data.peRatio, data.change]
        ];

        const csvContent = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.symbol}_data.csv`;
        a.click();

        URL.revokeObjectURL(url);
    }

    // Fetch and wire everything up
    const tickerInput = document.getElementById("ticker-input");
    const loadBtn = document.getElementById("load-btn");

    async function loadStock(symbol) { 
        const stockData = await fetchStockData(symbol);
        if (stockData) { 
            updateUI(stockData);
            copyBtn.onclick = () => copyData(stockData);
            exportBtn.onclick = () => exportCSV(stockData);
        } else {
            symbolEl.textContent = "Error";
            priceEl.textContent = "––";
            changeEl.textContent = "––";
        }
    }

    // Default stock
    loadStock("AAPL");

    // Load new stock from input
    loadBtn.onclick = () => {
        const symbol = tickerInput.value.trim().toUpperCase();
        if (symbol) {
            loadStock(symbol);
        }
    };

    console.log("API key used: ", API_KEY);
});
