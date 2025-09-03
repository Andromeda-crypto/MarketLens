// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const symbolEl = document.getElementById("stock-symbol");
    const priceEl = document.getElementById("price");
    const marketcapEl = document.getElementById("market-cap");
    const changeEl = document.getElementById("change");
    const peRatioEl = document.getElementById("pe-ratio");
    
    const copyBtn = document.getElementById("copy-btn");
    const exportBtn = document.getElementById("export-btn");

    // mock data for demonstration

    const mockData = {
        symbol: "AAPL",
        price: 190.24,
        marketCap: "2.98T",
        peRatio: 32.8,
        change: +1.14 
    };

    // Update UI with data


    function updateUI(data) {
        symbolEl.textContent = data.symbol;
        priceEl.textContent = `$${data.price}`;
        marketcapEl.textContent = data.marketCap;
        peRatioEl.textContent = data.peRatio;

        changeEl.textContent = `${data.change > 0 ? "+" : ""}${data.change}%`;
        changeEl.className = data.change >= 0 ? "gain" : "loss";
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

        URL.revokeObjectURL(url) ;
            
}
    // Wiring up buttons

    copyBtn.addEventListener("click", () => copyData(mockData));
    exportBtn.addEventListener("click", () => exportCSV(mockData));

    // Initial UI update
    
    updateUI(mockData);
});

