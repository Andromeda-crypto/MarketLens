// popup.js
// Robust market cap detection + formatting
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

    // small helpers
    function fmtUSDShort(rawUsd) {
        if (rawUsd === null || rawUsd === undefined || isNaN(rawUsd)) return "N/A";
        // trillions, billions, millions
        if (Math.abs(rawUsd) >= 1e12) return `$${(rawUsd / 1e12).toFixed(2)}T`;
        if (Math.abs(rawUsd) >= 1e9)  return `$${(rawUsd / 1e9).toFixed(2)}B`;
        if (Math.abs(rawUsd) >= 1e6)  return `$${(rawUsd / 1e6).toFixed(2)}T`;
        return `$${rawUsd.toFixed(2)}`;
    }

    function fmtPrice(val) {
        if (val === null || val === undefined || isNaN(val)) return "--";
        return `$${Number(val).toFixed(2)}`;
    }

    function fmtChange(val) {
        if (val === null || val === undefined || isNaN(val)) return "–";
        return `${val > 0 ? "+" : ""}${Number(val).toFixed(2)}%`;
    }

    function fmtPE(val) {
        if (val === null || val === undefined || isNaN(val)) return "N/A";
        return Number(val).toFixed(2);
    }

    // Robust market cap derivation & formatting
    async function fetchStockData(symbol) {
        try {
            // 1) Quote
            const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`);
            const quoteData = await quoteRes.json();

            // 2) Profile (logo, name, marketCapitalization, shareOutstanding)
            const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`);
            const profileData = await profileRes.json();

            // 3) Metrics
            const metricsRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${API_KEY}`);
            const metricsData = await metricsRes.json();

            // raw numeric values
            const price = Number(quoteData?.c) || null;
            const rawReported = profileData && profileData.marketCapitalization !== undefined && profileData.marketCapitalization !== null
                ? Number(profileData.marketCapitalization)
                : null;
            const shares = profileData && profileData.shareOutstanding ? Number(profileData.shareOutstanding) : null;

            // Try computed market cap if we have shares and price (raw USD)
            const computedFromShares = (!isNaN(shares) && shares > 0 && price !== null && !isNaN(price))
                ? shares * price
                : null;

            // Candidate multipliers to transform reported -> raw USD
            // e.g. reported * multiplier = raw USD
            const multipliers = [1, 1e3, 1e6, 1e9, 1e12];

            let chosenRawMarketCap = null;
            let chosenMultiplier = null;
            let reason = "";

            if (computedFromShares && rawReported !== null && !isNaN(rawReported) && rawReported !== 0) {
                let best = { m: null, score: Infinity, scaled: null };
                multipliers.forEach(m => {
                    const scaled = rawReported * m;
                    // avoid division by zero
                    if (!isFinite(scaled) || scaled <= 0) return;
                    // use ratio error in log space to handle magnitudes
                    const rel = computedFromShares / scaled; // ideally ≈ 1
                    const score = Math.abs(Math.log10(rel)); // lower is better
                    if (score < best.score) best = { m, score, scaled };
                });
                if (best.m !== null && best.score < 0.5) {
                    // good match
                    chosenMultiplier = best.m;
                    chosenRawMarketCap = best.scaled;
                    reason = "matched to computedFromShares";
                } else {
                    // no good match; prefer computedFromShares (more direct)
                    chosenMultiplier = null;
                    chosenRawMarketCap = computedFromShares;
                    reason = "using computedFromShares fallback (no good match)";
                }
            } else if (rawReported !== null && !isNaN(rawReported)) {
                // no computedFromShares available: try reasonable heuristic
                // If reported is large (>=1000000) it's probably already raw USD
                if (Math.abs(rawReported) > 1e6) {
                    chosenMultiplier = 1;
                    chosenRawMarketCap = rawReported;
                    reason = "reported looks like raw USD (large)";
                } else if (rawReported >= 1000) {
                    // likely in billions -> multiply by 1e9
                    chosenMultiplier = 1e9;
                    chosenRawMarketCap = rawReported * 1e9;
                    reason = "reported likely in billions -> *1e9";
                } else if (rawReported > 1) {
                    // value between 1 and 1000 -> likely billions (common for Finnhub)
                    chosenMultiplier = 1e9;
                    chosenRawMarketCap = rawReported * 1e9;
                    reason = "reported between 1 and 1000 -> assume billions *1e9";
                } else {
                    // small number (<1) -> maybe millions? default to millions *1e6
                    chosenMultiplier = 1e6;
                    chosenRawMarketCap = rawReported * 1e6;
                    reason = "reported <1 -> assume millions *1e6";
                }
            } else if (computedFromShares) {
                // only computed available
                chosenRawMarketCap = computedFromShares;
                chosenMultiplier = null;
                reason = "only computedFromShares available";
            } else {
                chosenRawMarketCap = null;
                reason = "no market cap data";
            }

            // Format final market cap into readable string
            const formattedMarketCap = fmtUSDShort(chosenRawMarketCap);

            // Debug info (useful while testing)
            console.debug("MarketCap Debug:", {
                symbol,
                price,
                shares,
                rawReported,
                computedFromShares,
                chosenMultiplier,
                chosenRawMarketCap,
                formattedMarketCap,
                reason
            });

            return {
                symbol,
                price: fmtPrice(price),
                change: fmtChange(Number(quoteData?.dp)),
                marketCap: formattedMarketCap,
                peRatio: fmtPE(metricsData?.metric?.peTTM || metricsData?.metric?.peNormalizedTTM),
                companyName: profileData?.name || symbol,
                logo: profileData?.logo || "",
                // raw values for color logic or CSV if needed for future analysis
                __raw: {
                    price: price,
                    changeRaw: Number(quoteData?.dp),
                    marketCapRawUSD: chosenRawMarketCap
                }
            };
        } catch (err) {
            console.error("fetchStockData error:", err);
            return null;
        }
    }

    // Update UI 
    function updateUI(data) {
        if (!data) return;
        symbolEl.textContent = data.symbol;
        priceEl.textContent = data.price;
        marketcapEl.textContent = data.marketCap;
        peRatioEl.textContent = data.peRatio;
        changeEl.textContent = data.change;

        if (stockLogoEl) stockLogoEl.src = data.logo || "";
        if (stockTickerEl) stockTickerEl.textContent = data.symbol;
        if (companyNameEl) companyNameEl.textContent = data.companyName;
        if (stockPriceEl) stockPriceEl.textContent = data.price;
        if (stockChangeEl) {
            stockChangeEl.textContent = data.change;
            const c = data.__raw && typeof data.__raw.changeRaw === "number" ? data.__raw.changeRaw : null;
            stockChangeEl.className = c >= 0 ? "gain" : "loss";
        }
        // main change color
        const mainRaw = data.__raw && typeof data.__raw.changeRaw === "number" ? data.__raw.changeRaw : null;
        if (mainRaw !== null) changeEl.className = mainRaw >= 0 ? "gain" : "loss";
    }

    // wiring & handlers
    const tickerInput = document.getElementById("ticker-input");
    const loadBtn = document.getElementById("load-btn");

    async function loadStock(symbol) {
        const d = await fetchStockData(symbol);
        if (d) updateUI(d);
        else {
            symbolEl.textContent = "Error";
            priceEl.textContent = "––";
            changeEl.textContent = "––";
            marketcapEl.textContent = "N/A";
            peRatioEl.textContent = "N/A";
            if (stockPriceEl) stockPriceEl.textContent = "––";
            if (stockChangeEl) stockChangeEl.textContent = "––";
        }
    }

    // default stock
    loadStock("AAPL");

    if (loadBtn) {
        loadBtn.onclick = () => {
            const s = tickerInput.value.trim().toUpperCase();
            if (s) loadStock(s);
        };
    }

    if (copyBtn) {
        copyBtn.onclick = async () => {
            const s = tickerInput.value.trim().toUpperCase() || "AAPL";
            const d = await fetchStockData(s);
            if (!d) return alert("Unable to fetch data");
            const text = `Symbol: ${d.symbol}\nPrice: ${d.price}\nMarket Cap: ${d.marketCap}\nP/E Ratio: ${d.peRatio}\nChange: ${d.change}`;
            navigator.clipboard.writeText(text).then(() => alert("Copied to Clipboard!"));
        };
    }

    if (exportBtn) {
        exportBtn.onclick = async () => {
            const s = tickerInput.value.trim().toUpperCase() || "AAPL";
            const d = await fetchStockData(s);
            if (!d) return alert("Unable to fetch data");
            const rows = [
                ["Symbol", "Price", "Market Cap (USD)", "P/E Ratio", "Change"],
                [d.symbol, d.__raw.price ?? "", d.__raw.marketCapRawUSD ?? d.marketCap, d.peRatio, d.__raw.changeRaw ?? d.change]
            ];
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${d.symbol}_data.csv`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }

    console.log("popup.js loaded");
});

