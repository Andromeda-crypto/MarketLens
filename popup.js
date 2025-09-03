// popup.js

import API_KEY from './config.js';

document.addEventListener("DOMContentLoaded", async () => {
    const symbolEl = document.getElementById("stock-symbol");
    const priceEl = document.getElementById("price");
    const marketcapEl = document.getElementById("market-cap");
    const changeEl = document.getElementById("change");
    const peRatioEl = document.getElementById("pe-ratio");
    
    const copyBtn = document.getElementById("copy-btn");
    const exportBtn = document.getElementById("export-btn");

    // Fetching data using API key
    async function fetchStockData(symbol) {
        try {
            const response = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
            );
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            return {
                symbol: symbol,
                price: data.c,
                marketCap: "N/A", // Placeholder (needs a different endpoint)
                peRatio: "N/A",   // Placeholder (needs a different endpoint)
                change: data.dp
            };
        }
        catch(error) {
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

    // copy to clipboard functionality
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
        const blob = new Blob([csvContent], {type: "text/csv"});
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.symbol}_data.csv` ;
        a.click();

        URL.revokeObjectURL(url);
    }

    // Fetch and wire everything up
    const stockSymbol = "AAPL";  // You can later make this dynamic
    const stockData = await fetchStockData(stockSymbol);

    if (stockData) {
        updateUI(stockData);

        // Wire buttons AFTER we have real data
        copyBtn.addEventListener("click", () => copyData(stockData));
        exportBtn.addEventListener("click", () => exportCSV(stockData));
    } else {
        symbolEl.textContent = "Error";
        priceEl.textContent = "--";
        changeEl.textContent = "--";
    }
});
