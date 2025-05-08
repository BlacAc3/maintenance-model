from flask import Flask, request, jsonify, send_from_directory, render_template
import os
import numpy as np
from analyze_motor_data import analyze_motor_data
import json
from datetime import datetime
import traceback

# Create custom encoder for numpy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)

# Helper function to convert numpy types in nested dictionaries and lists
def convert_numpy_types(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route('/')
def home():
    return render_template('dashboard.html')

@app.route('/dashboard.js')
def dashboard_js():
    return send_from_directory('static/js', 'dashboard.js')

@app.route('/motor_analysis_latest.json')
def latest_analysis():
    # First check if we have the latest file directly
    if os.path.exists('motor_analysis_latest.json'):
        with open('motor_analysis_latest.json', 'r') as f:
            try:
                data = json.load(f)
                return jsonify(data)
            except json.JSONDecodeError:
                pass  # If latest file is corrupt, continue to look for timestamped files

    # Find the most recent analysis file
    results_dir = 'results'
    if not os.path.exists(results_dir):
        os.makedirs(results_dir, exist_ok=True)

    analysis_files = []
    # Look in the results directory
    if os.path.exists(results_dir):
        analysis_files.extend([os.path.join(results_dir, f) for f in os.listdir(results_dir)
                              if f.startswith('motor_analysis_') and f.endswith('.json')])
    # Also look in the root directory
    analysis_files.extend([f for f in os.listdir('.')
                          if f.startswith('motor_analysis_') and f.endswith('.json') and f != 'motor_analysis_latest.json'])

    if not analysis_files:
        # Return a stub if no analysis exists
        return jsonify({
            "status": "error",
            "message": "No analysis data available. Please analyze data first."
        })

    # Get the most recent file
    latest_file = max(analysis_files, key=lambda x: os.path.getmtime(x))
    print(f"Serving analysis from: {latest_file}")

    try:
        with open(latest_file, 'r') as f:
            data = json.load(f)

        # Also update the latest file
        with open('motor_analysis_latest.json', 'w') as f:
            json.dump(data, f, indent=2, cls=NumpyEncoder)

        # Convert numpy types to standard Python types before JSON serialization
        return jsonify(convert_numpy_types(data))
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error reading analysis file: {str(e)}"
        })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file provided"
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "No file selected"
        }), 400

    # Create sample_data directory if it doesn't exist
    sample_dir = 'sample_data'
    if not os.path.exists(sample_dir):
        os.makedirs(sample_dir, exist_ok=True)

    # Create results directory if it doesn't exist
    results_dir = 'results'
    if not os.path.exists(results_dir):
        os.makedirs(results_dir, exist_ok=True)

    # Save the uploaded file with a timestamp and UUID
    import uuid
    file_uuid = str(uuid.uuid4())
    temp_file_path = f"{sample_dir}/sampled_data_{file_uuid}.csv"
    file.save(temp_file_path)

    try:
        # Analyze the data
        results = analyze_motor_data(data_path=temp_file_path)

        if results["status"] != "success":
            return jsonify(convert_numpy_types(results)), 500

        # Save the analysis result
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Use the custom encoder when dumping the results
        latest_file = 'motor_analysis_latest.json'
        # Also save a timestamped version
        timestamped_file = f'{results_dir}/motor_analysis_{timestamp}.json'

        # Write both files
        for filename in [latest_file, timestamped_file]:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2, cls=NumpyEncoder)

        # Convert numpy types to standard Python types before JSON serialization
        os.remove(temp_file_path)
        return jsonify(convert_numpy_types(results))

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error during analysis: {error_details}")

        return jsonify({
            "status": "error",
            "message": f"Error analyzing data: {str(e)}"
        }), 500

# Add a route to serve static files from the static folder
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    # Make sure directories exist
    os.makedirs('results', exist_ok=True)
    os.makedirs('sample_data', exist_ok=True)

    app.run(debug=True, port=5000)
