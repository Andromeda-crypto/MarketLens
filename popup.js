// popup.js

document.addEventListener("DOMContentLoaded", async () => {
    // ===== Elements =====
    const symbolEl = document.getElementById("stock-symbol");
    const priceEl = document.getElementById("price");
    const marketcapEl = document.getElementById("market-cap");
    const changeEl = document.getElementById("change");
    const peRatioEl = document.getElementById("pe-ratio");

    const stockLogoEl = document.getElementById("company-logo");
    const stockTickerEl = document.getElementById("stock-ticker");
    const companyNameEl = document.getElementById("company-name");
    const stockPriceEl = document.getElementById("stock-price");
    const stockChangeEl = document.getElementById("stock-change");

    const copyBtn = document.getElementById("copy-btn");
    const exportBtn = document.getElementById("export-btn");
    const tickerInput = document.getElementById("ticker-input");
    const loadBtn = document.getElementById("load-btn");

    // ===== Fetch stock data =====
    async function fetchStockData(symbol) {
        try {
            const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
            const quoteData = await quoteRes.json();

            const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
            const profileData = await profileRes.json();

            const metricsRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`);
            const metricsData = await metricsRes.json();

            return {
                symbol: symbol,
                price: quoteData.c || null,
                change: quoteData.dp || null,
                marketCap: profileData.marketCapitalization
                    ? (profileData.marketCapitalization >= 1000
                        ? `$${(profileData.marketCapitalization / 1000).toFixed(2)}T`
                        : `$${profileData.marketCapitalization.toFixed(2)}B`)
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

    // ===== Update stock UI =====
    function updateUI(data) {
        symbolEl.textContent = data.symbol;
        priceEl.textContent = data.price ? `$${data.price}` : "--";
        marketcapEl.textContent = data.marketCap;
        peRatioEl.textContent = data.peRatio;
        changeEl.textContent = data.change !== null
            ? `${data.change > 0 ? "+" : ""}${data.change.toFixed(2)}%`
            : "–";

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

        if (data.change !== null) {
            changeEl.className = data.change >= 0 ? "gain" : "loss";
        }
    }

    // ===== Market Trends =====
    async function fetchMarketTrend(symbol) {
        const now = Math.floor(Date.now() / 1000);
        const weekAgo = now - 5 * 24 * 60 * 60; // past 5 days

        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=60&from=${weekAgo}&to=${now}&token=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.s !== "ok") {
            console.warn(`No data for ${symbol}`);
            return [];
        }
        return data.c; // close prices
    }

    async function loadMarketTrends() {
        const datasets = [];
        const labels = [];

        const indices = [
            { name: "NASDAQ", symbol: "^IXIC", color: "rgba(75,192,192,1)" },
            { name: "NYSE", symbol: "^NYA", color: "rgba(255,159,64,1)" },
            { name: "BSE", symbol: "^BSESN", color: "rgba(153,102,255,1)" }
        ];

        for (const index of indices) {
            const prices = await fetchMarketTrend(index.symbol);
            if (prices.length > 0) {
                if (labels.length === 0) {
                    labels.push(...prices.map((_, i) => i));
                }
                datasets.push({
                    label: index.name,
                    data: prices,
                    borderColor: index.color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.2
                });
            }
        }

        if (datasets.length > 0) {
            const ctx = document.getElementById("market-chart").getContext("2d");
            new Chart(ctx, {
                type: "line",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    plugins: { legend: { display: true, position: "bottom" } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        }
    }

    // ===== Load stock =====
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

    // ===== Button listeners =====
    loadBtn.onclick = () => {
        const symbol = tickerInput.value.trim().toUpperCase();
        if (symbol) loadStock(symbol);
    };

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


    loadStock("AAPL");
    loadMarketTrends();

    console.log("API key used: ", API_KEY);
});

