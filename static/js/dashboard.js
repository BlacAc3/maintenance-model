// Global chart objects
let anomalyChart = null;
let temperatureChart = null;
let motorData = null;

// Colors for temperature chart
const colorPalette = [
  "#3772FF", // Primary
  "#F38375", // Secondary
  "#3AD29F", // Success
  "#FCAB64", // Warning
  "#F45B69", // Danger
  "#2D3142", // Dark
  "#90ADC6", // Info
  "#E9D985", // Yellow
  "#9C89B8", // Purple
  "#0A8754", // Green
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
          '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Please select a file first</div>';
      }
    });

  // Add drag and drop functionality to the upload container
  const uploadContainer = document.getElementById("uploadContainer");
  const fileInput = document.getElementById("dataFileInput");

  uploadContainer.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadContainer.style.borderColor = "#3772FF";
    uploadContainer.style.backgroundColor = "rgba(55, 114, 255, 0.1)";
  });

  uploadContainer.addEventListener("dragleave", function () {
    uploadContainer.style.borderColor = "#ccc";
    uploadContainer.style.backgroundColor = "white";
  });

  uploadContainer.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadContainer.style.borderColor = "#ccc";
    uploadContainer.style.backgroundColor = "white";

    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      const fileName = e.dataTransfer.files[0].name;
      document.getElementById("uploadStatus").innerHTML =
        `<div class="alert alert-info"><i class="bi bi-file-earmark-check me-2"></i>File selected: ${fileName}</div>`;
    }
  });

  // Update last updated time
  updateLastUpdated();

  // Auto-refresh every 60 seconds
  setInterval(function () {
    updateLastUpdated();
  }, 60000);

  // Allow file input to show filename
  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      const fileName = this.files[0].name;
      document.getElementById("uploadStatus").innerHTML =
        `<div class="alert alert-info"><i class="bi bi-file-earmark-check me-2"></i>File selected: ${fileName}</div>`;
    }
  });
});

// Fetch motor data from the latest analysis file
function fetchMotorData() {
  fetch("/motor_analysis_latest.json")
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

// Show loading overlay
function showLoading() {
  document.getElementById("loadingOverlay").classList.add("active");
}

// Hide loading overlay
function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("active");
}

// Upload and analyze a data file
function uploadAndAnalyzeData(file) {
  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerHTML =
    '<div class="alert alert-info"><i class="bi bi-arrow-repeat me-2"></i>Preparing data for analysis...</div>';

  // Show loading overlay
  showLoading();

  // Create FormData object
  const formData = new FormData();
  formData.append("file", file);

  // Send the data to the server endpoint for analysis
  fetch("/api/analyze", {
    method: "POST",
    body: formData,
  })
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
        '<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>Analysis completed successfully</div>';
      hideLoading();
    })
    .catch((error) => {
      console.error("Error analyzing data:", error);
      statusElement.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>Error: ${error.message}</div>`;
      hideLoading();
    });
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

  // Update charts
  updateAnomalyChart(data.plot_data);
  updateTemperatureChart(data.temperature_series, data.plot_data.time);

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
  document.getElementById("totalRecords").textContent =
    summary.total_records.toLocaleString();
  document.getElementById("anomalyCount").textContent =
    summary.anomaly_count.toLocaleString();
  document.getElementById("anomalyPercentage").textContent =
    summary.anomaly_percentage.toFixed(2) + "%";
}

// Update temperature analysis cards
function updateTemperatureAnalysis(tempData) {
  const container = document.getElementById("temperatureCards");
  container.innerHTML = "";

  if (!tempData || Object.keys(tempData).length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-4">
                            <i class="bi bi-thermometer" style="font-size: 2rem;"></i>
                            <p class="mt-2">No temperature data available</p>
                          </div>`;
    return;
  }

  // We'll use this to determine temperature trend icons
  const tempTrends = {};
  if (motorData && motorData.temperature_series) {
    for (const [sensor, values] of Object.entries(
      motorData.temperature_series,
    )) {
      if (values.length >= 2) {
        const lastValue = values[values.length - 1];
        const prevValue = values[values.length - 2];

        if (lastValue > prevValue + 0.2) {
          tempTrends[sensor] = {
            trend: "up",
            icon: "bi-arrow-up-circle-fill",
            label: "Rising",
          };
        } else if (lastValue < prevValue - 0.2) {
          tempTrends[sensor] = {
            trend: "down",
            icon: "bi-arrow-down-circle-fill",
            label: "Falling",
          };
        } else {
          tempTrends[sensor] = {
            trend: "stable",
            icon: "bi-dash-circle-fill",
            label: "Stable",
          };
        }
      }
    }
  }

  for (const [sensor, stats] of Object.entries(tempData)) {
    const col = document.createElement("div");
    col.className = "col-md-6 mb-3";

    let statusClass = "temp-normal";
    let statusIcon = "bi-check-circle-fill";
    if (stats.anomalies > 0) {
      statusClass = stats.anomalies > 5 ? "temp-critical" : "temp-warning";
      statusIcon =
        stats.anomalies > 5
          ? "bi-exclamation-circle-fill"
          : "bi-exclamation-triangle-fill";
    }

    // Get trend info if available
    const trendInfo = tempTrends[sensor] || {
      trend: "stable",
      icon: "bi-dash-circle-fill",
      label: "Stable",
    };

    col.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title d-flex justify-content-between">
                        ${formatSensorName(sensor)}
                    </h5>
                    <p class="card-text mb-2">
                        <span class="fw-bold">${stats.last.toFixed(2)}°</span>
                        <span class="temp-trend-icon trend-${trendInfo.trend}" title="${trendInfo.label}">
                            <i class="bi ${trendInfo.icon}"></i>
                        </span>
                    </p>
                    <p class="card-text mb-1 text-muted small">
                        <span title="Average">Avg: ${stats.mean.toFixed(2)}°</span> |
                        <span title="Range">Range: ${stats.min.toFixed(1)}° - ${stats.max.toFixed(1)}°</span>
                    </p>
                </div>
            </div>
        `;

    container.appendChild(col);
  }
}

// Update anomaly chart
function updateAnomalyChart(plotData) {
  const ctx = document.getElementById("anomalyChart");
  if (!ctx) return;

  if (anomalyChart) {
    anomalyChart.destroy();
  }

  if (!plotData || !plotData.errors) {
    return;
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
          borderColor: "rgba(55, 114, 255, 0.5)",
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
          backgroundColor: "rgba(244, 91, 105, 1)",
          borderColor: "rgba(244, 91, 105, 1)",
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
          borderColor: "rgba(244, 91, 105, 0.7)",
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
  const ctx = document.getElementById("temperatureChart");
  if (!ctx) return;

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
    container.innerHTML = `<div class="text-center text-muted py-4">
                              <i class="bi bi-shield-check" style="font-size: 2rem;"></i>
                              <p class="mt-2">No parameter anomalies detected</p>
                           </div>`;
    return;
  }

  let html =
    '<div class="table-responsive"><table class="table table-sm table-hover">';
  html +=
    "<thead><tr><th>Parameter</th><th>Anomaly Count</th><th>Status</th></tr></thead><tbody>";

  for (const [param, count] of Object.entries(paramAnomalies)) {
    const severity = count > 5 ? "danger" : "warning";
    const status = count > 5 ? "Critical" : "Warning";
    const icon =
      count > 5 ? "bi-exclamation-circle-fill" : "bi-exclamation-triangle-fill";

    html += `<tr>
              <td>${formatSensorName(param)}</td>
              <td>${count}</td>
              <td><span class="badge bg-${severity}"><i class="bi ${icon} me-1"></i>${status}</span></td>
          </tr>`;
  }

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// Update sample anomalies table
function updateSampleAnomalies(samples) {
  const container = document.getElementById("sampleAnomalies");

  if (!samples || samples.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-4">
                              <i class="bi bi-clipboard-check" style="font-size: 2rem;"></i>
                              <p class="mt-2">No anomalies to display</p>
                           </div>`;
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
    container.innerHTML = `<div class="col-12 text-center text-muted py-4">
                              <i class="bi bi-bar-chart" style="font-size: 2rem;"></i>
                              <p class="mt-2">No parameter statistics available</p>
                           </div>`;
    return;
  }

  container.innerHTML = "";

  for (const [column, stats] of Object.entries(columnStats)) {
    const card = document.createElement("div");
    card.className = "parameter-card";

    card.innerHTML = `
              <div class="parameter-name">${formatSensorName(column)}</div>
              <div class="parameter-value">
                  <div class="mb-1">Normal Range:</div>
                  <strong>${stats.min_normal.toFixed(2)} - ${stats.max_normal.toFixed(2)}</strong>
              </div>
              <div class="mt-2 text-muted small">
                  <div><i class="bi bi-calculator me-1"></i>Mean: ${stats.mean.toFixed(2)}</div>
                  <div><i class="bi bi-distribute-vertical me-1"></i>Std Dev: ${stats.std.toFixed(2)}</div>
              </div>
          `;

    container.appendChild(card);
  }
}

// Helper to format sensor names for display
function formatSensorName(name) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace("Temperature", "Temp");
}

// Update the "last updated" time
function updateLastUpdated() {
  const now = new Date();
  document.getElementById("lastUpdated").textContent = now.toLocaleTimeString();
}
