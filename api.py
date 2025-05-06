from flask import Flask, request, jsonify, send_from_directory
import os
import pandas as pd
from analyze_motor_data import analyze_motor_data
import json
from datetime import datetime

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
        result = analyze_motor_data(data_df=df)

        # Save the analysis result
        output_file = f"motor_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)

        # Also save as latest
        with open('motor_analysis_latest.json', 'w') as f:
            json.dump(result, f, indent=2)

        # Clean up the temp file
        os.remove(temp_file_path)

        return jsonify(result)

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
