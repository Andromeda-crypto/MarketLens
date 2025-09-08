// popup.js

document.addEventListener("DOMContentLoaded", async () => {
    // Main metric elements
    const symbolEl = document.getElementById("stock-symbol");
    const priceEl = document.getElementById("price");
    const marketcapEl = document.getElementById("market-cap");
    const changeEl = document.getElementById("change");
    const peRatioEl = document.getElementById("pe-ratio");

    // Stock card elements
    const stockLogoEl = document.getElementById("company-logo");
    const stockTickerEl = document.getElementById("stock-ticker");
    const companyNameEl = document.getElementById("company-name");
    const stockPriceEl = document.getElementById("stock-price");
    const stockChangeEl = document.getElementById("stock-change");

    const copyBtn = document.getElementById("copy-btn");
    const exportBtn = document.getElementById("export-btn");

    // Fetch stock data from Finnhub
    async function fetchStockData(symbol) {
        try {
            // Quote
            const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
            const quoteData = await quoteRes.json();

            // Profile (logo, name, market cap)
            const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
            const profileData = await profileRes.json();

            // Metrics (P/E ratio)
            const metricsRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`);
            const metricsData = await metricsRes.json();

            return {
                symbol: symbol,
                price: quoteData.c || null,
                change: quoteData.dp || null,
                marketCap: profileData && profileData.marketCapitalization
                           ? `$${(profileData.marketCapitalization / 1e9).toFixed(2)}B`
                           : "N/A",
                peRatio: metricsData && (metricsData.metric.peTTM || metricsData.metric.peNormalizedTTM)
                           ? (metricsData.metric.peTTM || metricsData.metric.peNormalizedTTM).toFixed(2)
                           : "N/A",
                companyName: profileData.name || symbol,
                logo: profileData.logo || ""
            };
        } catch (error) {
            console.error("Fetch error: ", error);
            return null;
        }
    }

    // Update the UI
    function updateUI(data) {
        // Main metrics
        symbolEl.textContent = data.symbol;
        priceEl.textContent = data.price ? `$${data.price}` : "--";
        marketcapEl.textContent = data.marketCap;
        peRatioEl.textContent = data.peRatio;

        // Stock card
        if (stockLogoEl) stockLogoEl.src = data.logo;
        if (stockTickerEl) stockTickerEl.textContent = data.symbol;
        if (companyNameEl) companyNameEl.textContent = data.companyName;
        if (stockPriceEl) stockPriceEl.textContent = data.price ? `$${data.price}` : "--";
        if (stockChangeEl) {
            stockChangeEl.textContent = data.change !== null
                ? `${data.change > 0 ? "+" : ""}${data.change.toFixed(2)}%`
                : "--";
            stockChangeEl.className = data.change >= 0 ? "gain" : "loss";
        }

        // Main change color
        if (data.change !== null) {
            changeEl.className = data.change >= 0 ? "gain" : "loss";
        }
    }

    const tickerInput = document.getElementById("ticker-input");
    const loadBtn = document.getElementById("load-btn");

    // Load stock and update UI
    async function loadStock(symbol) {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            updateUI(stockData);
        } else {
            symbolEl.textContent = "Error";
            priceEl.textContent = "––";
            changeEl.textContent = "––";
            marketcapEl.textContent = "N/A";
            peRatioEl.textContent = "N/A";
            if (stockPriceEl) stockPriceEl.textContent = "––";
            if (stockChangeEl) stockChangeEl.textContent = "––";
        }
    }

    // Load default stock
    loadStock("AAPL");

    // Load button
    if (loadBtn) {
        loadBtn.onclick = () => {
            const symbol = tickerInput.value.trim().toUpperCase();
            if (symbol) loadStock(symbol);
        };
    }

    // Copy data
    if (copyBtn) {
        copyBtn.onclick = async () => {
            const symbol = tickerInput.value.trim().toUpperCase() || "AAPL";
            const data = await fetchStockData(symbol);
            if (data) {
                const text = `Symbol: ${data.symbol}\nPrice: ${data.price}\nMarket Cap: ${data.marketCap}\nP/E Ratio: ${data.peRatio}\nChange: ${data.change > 0 ? "+" : ""}${data.change}%`;
                navigator.clipboard.writeText(text)
                    .then(() => alert("Copied to Clipboard!"))
                    .catch(err => console.error("Copy failed", err));
            }
        };
    }

    // Export CSV
    if (exportBtn) {
        exportBtn.onclick = async () => {
            const symbol = tickerInput.value.trim().toUpperCase() || "AAPL";
            const data = await fetchStockData(symbol);
            if (data) {
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
        };
    }

    console.log("API key used: ", API_KEY);
});
