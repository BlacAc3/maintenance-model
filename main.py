import pandas as pd
import numpy as np
import joblib
import json
import sys
from datetime import datetime
from analyze_motor_data import analyze_motor_data

def main():
    print("Motor Anomaly Detection System")
    print("==============================")

    # Check if data file was provided as argument
    data_path = None
    if len(sys.argv) > 1:
        data_path = sys.argv[1]
        print(f"Using provided data file: {data_path}")
    else:
        print("Using default data file: measures_v2_with_time.csv")

    # Analyze motor data
    print("Analyzing motor data...")
    results = analyze_motor_data(data_path)

    if results['status'] == 'error':
        print(f"Error: {results['message']}")
        return

    # Display results
    print("\n=== Analysis Results ===")
    print(f"Timestamp: {results['timestamp']}")
    print(f"Total records: {results['anomaly_summary']['total_records']}")
    print(f"Anomalies detected: {results['anomaly_summary']['anomaly_count']} ({results['anomaly_summary']['anomaly_percentage']:.2f}%)")

    # Temperature analysis
    print("\n=== Temperature Analysis ===")
    for temp, stats in results['temperature_analysis'].items():
        print(f"{temp}:")
        print(f"  Average: {stats['mean']:.2f}")
        print(f"  Range: {stats['min']:.2f} - {stats['max']:.2f}")
        print(f"  Last reading: {stats['last']:.2f}")
        print(f"  Anomalies: {stats['anomalies']}")

    # Parameter anomalies
    if results['anomaly_summary']['parameter_anomalies']:
        print("\n=== Parameter Anomalies ===")
        for param, count in results['anomaly_summary']['parameter_anomalies'].items():
            print(f"{param}: {count} anomalies")


    # Create a custom JSON encoder class to handle non-serializable types
    class NumpyEncoder(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, np.integer):
                return int(o)
            if isinstance(o, np.floating):
                return float(o)
            if isinstance(o, np.ndarray):
                return o.tolist()
            return super().default(o)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    # Use the custom encoder when dumping the results
    latest_file = 'motor_analysis_latest.json'
    # Also save a timestamped version
    timestamped_file = f'results/motor_analysis_{timestamp}.json'

    # Write both files
    for filename in [latest_file, timestamped_file]:
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, cls=NumpyEncoder)

    print(f"\nResults saved ")
    print("To view results in web interface, open dashboard.html in a browser")

if __name__ == "__main__":
    main()
