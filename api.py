from flask import Flask, request, jsonify, send_from_directory
import os
import numpy as np
import pandas as pd
from analyze_motor_data import analyze_motor_data
import json
from datetime import datetime

class NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)

app = Flask(__name__, static_folder='.')

@app.route('/')
def home():
    return send_from_directory('./templates', 'dashboard.html')

@app.route('/dashboard.js')
def dashboard_js():
    return send_from_directory('./static/js', 'dashboard.js')

@app.route('/motor_analysis_latest.json')
def latest_analysis():
    # Find the most recent analysis file
    analysis_files = [f for f in os.listdir('.') if f.startswith('motor_analysis_') and f.endswith('.json')]

    if not analysis_files:
        # Return a stub if no analysis exists
        return jsonify({
            "status": "error",
            "message": "No analysis data available. Please analyze data first."
        })

    # Get the most recent file
    latest_file = max(analysis_files, key=lambda x: os.path.getmtime(x))
    print(latest_file)

    with open(latest_file, 'r') as f:
        data = json.load(f)

    return jsonify(data)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file provided"
        })

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "No file selected"
        })

    # Save the uploaded file
    temp_file_path = f"uploaded_data_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    file.save(temp_file_path)

    try:
        # Read the CSV file
        df = pd.read_csv(temp_file_path)

        # Analyze the data
        results = analyze_motor_data(data_path=temp_file_path)

        # Save the analysis result

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Use the custom encoder when dumping the results
        latest_file = 'motor_analysis_latest.json'
        # Also save a timestamped version
        timestamped_file = f'results/motor_analysis_{timestamp}.json'

        # Write both files
        for filename in [latest_file, timestamped_file]:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2, cls=NumpyEncoder)

        # Clean up the temp file
        os.remove(temp_file_path)

        return latest_analysis()

    except Exception as e:
        # Clean up the temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        return jsonify({
            "status": "error",
            "message": f"Error analyzing data: {str(e)}"
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
