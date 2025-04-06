const API_KEY = "1ZGZ5F486VLFBOB8";
let stockChart = null;

const searchButton = document.getElementById("searchButton");
const stockSymbolInput = document.getElementById("stockSymbol");
const timePeriodSelect = document.getElementById("timePeriod");
const stockInfo = document.getElementById("stockInfo");

searchButton.addEventListener("click", async () => {
  const symbol = stockSymbolInput.value.trim().toUpperCase();
  const timePeriod = timePeriodSelect.value;

  if (!symbol) {
    alert("Please enter a stock symbol");
    return;
  }

  stockInfo.style.display = "none";

  try {
    const [overviewResponse, quoteResponse, historicalResponse] =
      await Promise.all([
        fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
        ),
        fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
        ),
        fetch(
          `https://www.alphavantage.co/query?function=${getHistoricalDataFunction(
            timePeriod
          )}&symbol=${symbol}&apikey=${API_KEY}`
        ),
      ]);

    // Parse responses
    const overviewData = await overviewResponse.json();
    const quoteData = await quoteResponse.json();
    const historicalData = await historicalResponse.json();

    // Validate data
    if (!overviewData || !quoteData || !historicalData) {
      throw new Error("Failed to fetch stock data");
    }

    // Check for API error messages
    if (overviewData.Note || quoteData.Note || historicalData.Note) {
      throw new Error("API rate limit reached. Please try again later.");
    }

    // Validate specific data points
    if (!overviewData.Name || !quoteData["Global Quote"]) {
      alert("Stock symbol not found. Please check and try again.");
      return;
    }

    // Display stock information
    displayStockInfo(
      overviewData,
      quoteData["Global Quote"],
      historicalData,
      timePeriod
    );
  } catch (error) {
    console.error("Error fetching stock data:", error);
    alert(
      `Error: ${error.message}. Please check your stock symbol and API key.`
    );
  }
});

function getHistoricalDataFunction(timePeriod) {
  switch (timePeriod) {
    case "daily":
      return "TIME_SERIES_DAILY";
    case "weekly":
      return "TIME_SERIES_WEEKLY";
    case "monthly":
      return "TIME_SERIES_MONTHLY";
    default:
      return "TIME_SERIES_DAILY";
  }
}

function getTimeSeriesKey(timePeriod) {
  switch (timePeriod) {
    case "daily":
      return "Time Series (Daily)";
    case "weekly":
      return "Weekly Time Series";
    case "monthly":
      return "Monthly Time Series";
    default:
      return "Time Series (Daily)";
  }
}

function displayStockInfo(overview, quote, historicalData, timePeriod) {
  try {
    // Company and Stock Details
    document.getElementById("companyName").textContent = overview.Name || "N/A";
    document.getElementById("companyDescription").textContent =
      overview.Description || "No description available.";
    document.getElementById("companySector").textContent =
      overview.Sector || "N/A";
    document.getElementById("companyIndustry").textContent =
      overview.Industry || "N/A";

    const currentPrice = parseFloat(quote["05. price"] || 0);
    const priceChange = parseFloat(quote["09. change"] || 0);
    const percentChange = quote["10. change percent"] || "0%";

    document.getElementById(
      "currentPrice"
    ).textContent = `$${currentPrice.toFixed(2)}`;

    const priceChangeElement = document.getElementById("priceChange");
    priceChangeElement.textContent = `${
      priceChange > 0 ? "+" : ""
    }${priceChange.toFixed(2)} (${percentChange})`;
    priceChangeElement.classList.remove("positive", "negative");
    priceChangeElement.classList.add(
      priceChange >= 0 ? "positive" : "negative"
    );

    // Stock Statistics
    document.getElementById("exchange").textContent =
      overview.Exchange || "N/A";
    document.getElementById("marketCap").textContent =
      overview.MarketCapitalization
        ? `$${formatLargeNumber(overview.MarketCapitalization)}`
        : "N/A";
    document.getElementById("peRatio").textContent = overview.PERatio || "N/A";
    document.getElementById("dividendYield").textContent =
      overview.DividendYield ? `${overview.DividendYield}%` : "N/A";
    document.getElementById("weekHigh").textContent = overview["52WeekHigh"]
      ? `$${overview["52WeekHigh"]}`
      : "N/A";
    document.getElementById("weekLow").textContent = overview["52WeekLow"]
      ? `$${overview["52WeekLow"]}`
      : "N/A";

    // Create Stock Price Chart
    createStockChart(historicalData, timePeriod);

    // Show stock info
    stockInfo.style.display = "block";
  } catch (error) {
    console.error("Error displaying stock info:", error);
    alert("Error displaying stock information. Please try again.");
  }
}

function createStockChart(historicalData, timePeriod) {
  try {
    const timeSeriesKey = getTimeSeriesKey(timePeriod);
    const seriesData = historicalData[timeSeriesKey];

    if (!seriesData) {
      console.error("No historical data found");
      return;
    }

    // Prepare chart data
    const labels = [];
    const prices = [];

    // Take first 10 data points
    const dataPoints = Object.entries(seriesData).slice(0, 10);

    dataPoints.reverse().forEach(([date, values]) => {
      labels.push(date);
      prices.push(parseFloat(values["4. close"]));
    });

    // Destroy existing chart if it exists
    if (stockChart) {
      stockChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById("stockChart").getContext("2d");
    stockChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Closing Price",
            data: prices,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Stock Price (${
              timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
            })`,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error creating stock chart:", error);
  }
}

function formatLargeNumber(num) {
  const number = parseFloat(num);
  if (number >= 1e12) return (number / 1e12).toFixed(2) + "T";
  if (number >= 1e9) return (number / 1e9).toFixed(2) + "B";
  if (number >= 1e6) return (number / 1e6).toFixed(2) + "M";
  return number.toLocaleString();
}
