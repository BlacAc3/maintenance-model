// Global chart objects
let anomalyChart = null;
let temperatureChart = null;
let motorData = null;

// Colors for temperature chart
const colorPalette = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#2ECC71",
  "#E74C3C",
  "#3498DB",
  "#F39C12",
];

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", function () {
  // Try to load default data
  fetchMotorData();

  // Set up file upload and analysis
  document
    .getElementById("analyzeButton")
    .addEventListener("click", function () {
      const fileInput = document.getElementById("dataFileInput");
      if (fileInput.files.length > 0) {
        uploadAndAnalyzeData(fileInput.files[0]);
      } else {
        document.getElementById("uploadStatus").innerHTML =
          '<div class="alert alert-warning">Please select a file first</div>';
      }
    });

  // Update last updated time
  updateLastUpdated();

  // Auto-refresh every 30 seconds
  setInterval(function () {
    updateLastUpdated();
  }, 30000);
});

// Fetch motor data from the latest analysis file
function fetchMotorData() {
  // In a real application, you would have an API endpoint
  // For this demo, we'll use a static JSON file
  fetch("motor_analysis_latest.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "No analysis data found. Please upload a file to analyze.",
        );
      }
      return response.json();
    })
    .then((data) => {
      motorData = data;
      updateDashboard(data);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      document.getElementById("statusText").textContent = "No Data";
      document.getElementById("statusIndicator").className = "status-indicator";
    });
}

// Upload and analyze a data file
function uploadAndAnalyzeData(file) {
  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerHTML =
    '<div class="alert alert-info">Analyzing data, please wait...</div>';

  // Create FormData object
  const formData = new FormData();
  formData.append("file", file);

  // In a real application, you would send this to a server endpoint
  // For this demo, we'll simulate the analysis with a timeout
  setTimeout(() => {
    fetch("motor_analysis_latest.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Analysis failed. Please try again.");
        }
        return response.json();
      })
      .then((data) => {
        motorData = data;
        updateDashboard(data);
        statusElement.innerHTML =
          '<div class="alert alert-success">Analysis completed successfully</div>';
      })
      .catch((error) => {
        console.error("Error analyzing data:", error);
        statusElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
      });
  }, 2000);
}

// Update the dashboard with new data
function updateDashboard(data) {
  if (data.status !== "success") {
    document.getElementById("statusText").textContent = "Error";
    document.getElementById("statusIndicator").className =
      "status-indicator status-critical";
    return;
  }

  // Update system status
  updateSystemStatus(data);

  // Update anomaly detection metrics
  updateAnomalyMetrics(data.anomaly_summary);

  // Update temperature analysis
  updateTemperatureAnalysis(data.temperature_analysis);

  // Update parameter anomalies
  updateParameterAnomalies(data.anomaly_summary.parameter_anomalies);

  // Update sample anomalies
  updateSampleAnomalies(data.sample_anomalies);

  // Update parameter stats
  updateParameterStats(data.column_stats);

  // Update timestamp
  document.getElementById("analysisTimestamp").textContent = data.timestamp;
}

// Update system status indicators
function updateSystemStatus(data) {
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  const anomalyPercentage = data.anomaly_summary.anomaly_percentage;

  if (anomalyPercentage < 1) {
    statusIndicator.className = "status-indicator status-normal";
    statusText.textContent = "Normal";
  } else if (anomalyPercentage < 5) {
    statusIndicator.className = "status-indicator status-warning";
    statusText.textContent = "Warning";
  } else {
    statusIndicator.className = "status-indicator status-critical";
    statusText.textContent = "Critical";
  }
}

// Update anomaly metrics
function updateAnomalyMetrics(summary) {
  document.getElementById("totalRecords").textContent = summary.total_records;
  document.getElementById("anomalyCount").textContent = summary.anomaly_count;
  document.getElementById("anomalyPercentage").textContent =
    summary.anomaly_percentage.toFixed(2);
}

// Update temperature analysis cards
function updateTemperatureAnalysis(tempData) {
  const container = document.getElementById("temperatureCards");
  container.innerHTML = "";

  if (!tempData || Object.keys(tempData).length === 0) {
    container.innerHTML = "<p>No temperature data available</p>";
    return;
  }

  const row = document.createElement("div");
  row.className = "row";

  for (const [sensor, stats] of Object.entries(tempData)) {
    const col = document.createElement("div");
    col.className = "col-md-6 mb-3";

    let statusClass = "text-success";
    if (stats.anomalies > 0) {
      statusClass = stats.anomalies > 5 ? "text-danger" : "text-warning";
    }

    col.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${formatSensorName(sensor)}</h5>
                    <p class="card-text mb-1">Current: <strong>${stats.last.toFixed(2)}°</strong></p>
                    <p class="card-text mb-1">Avg: ${stats.mean.toFixed(2)}° | Range: ${stats.min.toFixed(1)}° - ${stats.max.toFixed(1)}°</p>
                    <p class="card-text ${statusClass}">
                        <strong>Anomalies: ${stats.anomalies}</strong>
                    </p>
                </div>
            </div>
        `;

    row.appendChild(col);
  }

  container.appendChild(row);
}

// Update anomaly chart
function updateAnomalyChart(plotData) {
  const ctx = document.getElementById("anomalyChart").getContext("2d");

  if (anomalyChart) {
    anomalyChart.destroy();
  }

  // Prepare data for normal vs anomaly points
  const normalIndices = [];
  const normalErrors = [];
  const anomalyIndices = [];
  const anomalyErrors = [];

  for (let i = 0; i < plotData.errors.length; i++) {
    if (plotData.anomaly_indices.includes(i)) {
      anomalyIndices.push(plotData.time[i]);
      anomalyErrors.push(plotData.errors[i]);
    } else {
      normalIndices.push(plotData.time[i]);
      normalErrors.push(plotData.errors[i]);
    }
  }

  anomalyChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Reconstruction Error",
          data: plotData.errors.map((error, index) => ({
            x: plotData.time[index],
            y: error,
          })),
          borderColor: "rgba(54, 162, 235, 0.5)",
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "Anomalies",
          data: anomalyErrors.map((error, index) => ({
            x: anomalyIndices[index],
            y: error,
          })),
          backgroundColor: "rgba(255, 99, 132, 1)",
          borderColor: "rgba(255, 99, 132, 1)",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        {
          label: "Threshold",
          data: plotData.time.map((time) => ({
            x: time,
            y: plotData.threshold,
          })),
          borderColor: "rgba(255, 99, 132, 0.7)",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Reconstruction Error",
          },
          beginAtZero: true,
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Motor Anomaly Detection Results",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              label += context.parsed.y.toFixed(4);
              return label;
            },
          },
        },
      },
    },
  });
}

// Update temperature chart
function updateTemperatureChart(tempSeries, timeData) {
  const ctx = document.getElementById("temperatureChart").getContext("2d");

  if (temperatureChart) {
    temperatureChart.destroy();
  }

  if (!tempSeries || Object.keys(tempSeries).length === 0) {
    return;
  }

  // Prepare datasets
  const datasets = [];
  let colorIndex = 0;

  for (const [sensor, values] of Object.entries(tempSeries)) {
    datasets.push({
      label: formatSensorName(sensor),
      data: values.map((value, index) => ({ x: timeData[index], y: value })),
      borderColor: colorPalette[colorIndex % colorPalette.length],
      backgroundColor: colorPalette[colorIndex % colorPalette.length] + "20", // Add transparency
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
    });
    colorIndex++;
  }

  temperatureChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Temperature (°)",
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Temperature Trends",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  });
}

// Update parameter anomalies section
function updateParameterAnomalies(paramAnomalies) {
  const container = document.getElementById("parameterAnomalies");

  if (!paramAnomalies || Object.keys(paramAnomalies).length === 0) {
    container.innerHTML = "<p>No parameter anomalies detected</p>";
    return;
  }

  let html =
    '<div class="table-responsive"><table class="table table-sm table-striped">';
  html +=
    "<thead><tr><th>Parameter</th><th>Anomaly Count</th><th>Status</th></tr></thead><tbody>";

  for (const [param, count] of Object.entries(paramAnomalies)) {
    let statusClass = count > 5 ? "bg-danger text-white" : "bg-warning";
    html += `<tr>
              <td>${formatSensorName(param)}</td>
              <td>${count}</td>
              <td><span class="badge ${statusClass}">${count > 5 ? "Critical" : "Warning"}</span></td>
          </tr>`;
  }

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// Update sample anomalies table
function updateSampleAnomalies(samples) {
  const container = document.getElementById("sampleAnomalies");

  if (!samples || samples.length === 0) {
    container.innerHTML = "<p>No anomalies to display</p>";
    return;
  }

  // Get all columns from the first sample
  const columns = Object.keys(samples[0]);

  let html =
    '<div class="table-responsive"><table class="table table-sm table-hover">';
  html += "<thead><tr>";

  // Create table headers
  columns.forEach((col) => {
    html += `<th>${formatSensorName(col)}</th>`;
  });
  html += "</tr></thead><tbody>";

  // Add sample data rows
  samples.forEach((sample) => {
    html += "<tr>";
    columns.forEach((col) => {
      const value =
        typeof sample[col] === "number" ? sample[col].toFixed(2) : sample[col];
      html += `<td>${value}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// Update parameter statistics
function updateParameterStats(columnStats) {
  const container = document.getElementById("parameterStats");

  if (!columnStats || Object.keys(columnStats).length === 0) {
    container.innerHTML = "<p>No parameter statistics available</p>";
    return;
  }

  container.innerHTML = "";

  for (const [column, stats] of Object.entries(columnStats)) {
    const card = document.createElement("div");
    card.className = "parameter-card";

    card.innerHTML = `
              <div class="parameter-name">${formatSensorName(column)}</div>
              <div class="parameter-value">
                  <small>Normal Range:</small><br>
                  ${stats.min_normal.toFixed(2)} - ${stats.max_normal.toFixed(2)}
              </div>
              <div class="mt-2">
                  <small>Mean: ${stats.mean.toFixed(2)}</small><br>
                  <small>Std Dev: ${stats.std.toFixed(2)}</small>
              </div>
          `;

    container.appendChild(card);
  }
}

// Helper to format sensor names for display
function formatSensorName(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Update the "last updated" time
function updateLastUpdated() {
  const now = new Date();
  document.getElementById("lastUpdated").textContent = now.toLocaleTimeString();
}
