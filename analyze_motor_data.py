import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime
import os

def analyze_motor_data(data_path=None, data_df=None, max_data_points=1000):
    """
    Analyze motor data for anomalies and return results in JSON format

    Args:
        data_path: Path to CSV file (optional)
        data_df: DataFrame containing motor data (optional)
        max_data_points: Maximum number of data points to include in JSON output (default: 1000)

    Returns:
        JSON-compatible dictionary with analysis results
    """
    # Load model
    try:
        model_data = joblib.load('motor_anomaly_model.pkl')
        autoencoder = model_data['autoencoder']
        scaler = model_data['scaler']
        error_threshold = model_data['error_threshold']
        column_names = model_data['column_names']
        column_stats = model_data.get('column_stats', {})
        temp_columns = model_data.get('temp_columns', [])
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to load model: {str(e)}"
        }

    # Load data
    try:
        if data_df is not None:
            df = data_df.copy()
        elif data_path is not None:
            df = pd.read_csv(data_path)
        else:
            df = pd.read_csv('sample_data/sampled_data_100000.csv')
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to load data: {str(e)}"
        }

    # Prepare data for analysis
    omit = ["u_q", "u_d", "i_d", "i_q", "time"]

    # Keep time for visualization if it exists
    time_data = None
    if 'time' in df.columns:
        time_data = df['time'].tolist()

    # Prepare analysis dataframe
    df_analysis = df.drop(columns=[col for col in omit if col in df.columns])

    # Ensure coolant is treated as temperature if needed
    if 'coolant' in df_analysis.columns and 'coolant_temperature' not in df_analysis.columns:
        df_analysis = df_analysis.rename(columns={'coolant': 'coolant_temperature'})

    # Identify temp columns if not provided
    if not temp_columns:
        temp_columns = [col for col in df_analysis.columns if 'temp' in col.lower() or 'temperature' in col.lower()]

    # Ensure we only use columns that were in the training data
    available_columns = [col for col in column_names if col in df_analysis.columns]
    df_analysis = df_analysis[available_columns]

    # Clean data
    df_analysis = df_analysis.apply(pd.to_numeric, errors='coerce')
    df_analysis = df_analysis.fillna(method='ffill').fillna(method='bfill')  # Fill missing values

    # Anomaly detection
    try:
        # Scale data
        X_scaled = scaler.transform(df_analysis.values)

        # Get reconstruction
        X_reconstructed = autoencoder.predict(X_scaled)

        # Calculate errors
        reconstruction_errors = np.mean((X_scaled - X_reconstructed) ** 2, axis=1)

        # Identify anomalies
        anomalies = reconstruction_errors > error_threshold

        # Get specific parameter anomalies (beyond normal ranges)
        parameter_anomalies = {}
        for col in df_analysis.columns:
            if col in column_stats:
                min_val = column_stats[col]['min_normal']
                max_val = column_stats[col]['max_normal']
                param_anomalies = (df_analysis[col] < min_val) | (df_analysis[col] > max_val)
                if param_anomalies.any():
                    parameter_anomalies[col] = param_anomalies.sum()

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error during anomaly detection: {str(e)}"
        }

    # Prepare results
    anomaly_indices = np.where(anomalies)[0]
    anomaly_count = len(anomaly_indices)

    # Get temperature statistics
    temp_stats = {}
    for col in temp_columns:
        if col in df_analysis.columns:
            temp_stats[col] = {
                "mean": float(df_analysis[col].mean()),
                "max": float(df_analysis[col].max()),
                "min": float(df_analysis[col].min()),
                "last": float(df_analysis[col].iloc[-1] if len(df_analysis) > 0 else 0),
                "anomalies": int(((df_analysis[col] < column_stats.get(col, {}).get('min_normal', -float('inf'))) |
                              (df_analysis[col] > column_stats.get(col, {}).get('max_normal', float('inf')))).sum())
            }

    # Downsample data to prevent large JSON files
    data_length = len(df_analysis)
    if data_length > max_data_points:
        # Calculate the step size for downsampling
        step = data_length // max_data_points

        # Downsample time data
        if time_data:
            time_data = time_data[::step]

        # Downsample errors
        downsampled_errors = reconstruction_errors[::step].tolist()

        # Adjust anomaly indices for downsampled data
        downsampled_anomaly_indices = [i // step for i in anomaly_indices if i % step == 0]
    else:
        # Use all data if it's under the limit
        downsampled_errors = reconstruction_errors.tolist()
        downsampled_anomaly_indices = anomaly_indices.tolist()

    # Prepare data for plots with limited data points
    plot_data = {
        "time": time_data if time_data else list(range(0, data_length, step if data_length > max_data_points else 1)),
        "errors": downsampled_errors,
        "threshold": float(error_threshold),
        "anomaly_indices": list(downsampled_anomaly_indices),
        "downsampled": data_length > max_data_points,
        "original_length": data_length
    }

    # Add temperature series data for plotting (downsampled)
    temp_series = {}
    for col in temp_columns:
        if col in df_analysis.columns:
            if data_length > max_data_points:
                temp_series[col] = df_analysis[col].iloc[::step].tolist()
            else:
                temp_series[col] = df_analysis[col].tolist()

    # Create results JSON
    result = {
        "status": "success",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "anomaly_summary": {
            "total_records": len(df_analysis),
            "anomaly_count": anomaly_count,
            "anomaly_percentage": float(anomaly_count / len(df_analysis) * 100) if len(df_analysis) > 0 else 0,
            "parameter_anomalies": parameter_anomalies
        },
        "temperature_analysis": temp_stats,
        "plot_data": plot_data,
        "temperature_series": temp_series,
        "column_stats": column_stats,
        "sample_anomalies": df_analysis.iloc[anomaly_indices[:5]].to_dict('records') if anomaly_count > 0 else []
    }

    return result

if __name__ == "__main__":
    # When run directly, analyze data and save results
    result = analyze_motor_data()

    # Save the results to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Save the latest analysis to a file
    latest_file = 'motor_analysis_latest.json'
    # Also save a timestamped version
    timestamped_file = f'results/motor_analysis_{timestamp}.json'

    # Write both files
    for filename in [latest_file, timestamped_file]:
        with open(filename, 'w') as f:
            json.dump(result, f, indent=2)

    print(f"Analysis completed and saved to motor_analysis_{timestamp}.json")
