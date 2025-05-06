import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest
import joblib

def train_motor_anomaly_model(file_path='measures_v2_with_time.csv'):
    """
    Train an anomaly detection model on motor data with autoencoder

    Args:
        file_path (str): Path to the CSV file containing motor data
                         Defaults to 'measures_v2_with_time.csv'

    Returns:
        dict: Model data including autoencoder, scaler, threshold, and columns
    """
    # Load CSV
    print(f"Loading dataset from {file_path}...")
    df = pd.read_csv(file_path)

    # Identify columns to exclude from analysis
    omit = ["u_q", "u_d", "i_d", "i_q", "time"]
    df_analysis = df.drop(columns=[col for col in omit if col in df.columns])

    # Explicitly recognize coolant column as temperature
    if 'coolant' in df_analysis.columns:
        df_analysis = df_analysis.rename(columns={'coolant': 'coolant_temperature'})

    # Extract temperature columns for focused analysis
    temp_columns = [col for col in df_analysis.columns if 'temp' in col.lower() or 'temperature' in col.lower()]
    print(f"Identified temperature columns: {temp_columns}")

    # Clean up data
    df_analysis = df_analysis.apply(pd.to_numeric, errors='coerce')
    df_analysis = df_analysis.dropna().reset_index(drop=True)

    print("Dataset overview:")
    print(df_analysis.head())
    print("\nSummary statistics:")
    print(df_analysis.describe())

    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_analysis.values)

    # Train-test split
    X_train, X_test = train_test_split(X_scaled, test_size=0.2, random_state=42)

    # Define and train autoencoder
    print("\nTraining autoencoder for anomaly detection...")
    autoencoder = MLPRegressor(
        hidden_layer_sizes=(20, 10, 5, 10, 20),
        activation='relu',
        solver='adam',
        learning_rate_init=0.001,
        max_iter=500,
        alpha=0.0001,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=42
    )

    # Train to reconstruct input
    autoencoder.fit(X_train, X_train)

    # Calculate reconstruction error on test set
    test_predictions = autoencoder.predict(X_test)
    reconstruction_error = np.mean(np.power(X_test - test_predictions, 2), axis=1)
    error_threshold = np.percentile(reconstruction_error, 95)  # 95th percentile as threshold

    print(f"\nReconstruction error threshold: {error_threshold:.4f}")
    print(f"Average reconstruction error: {np.mean(reconstruction_error):.4f}")

    # Save model components
    model_data = {
        'autoencoder': autoencoder,
        'scaler': scaler,
        'error_threshold': error_threshold,
        'column_names': df_analysis.columns.tolist(),
        'temp_columns': temp_columns
    }

    joblib.dump(model_data, 'motor_anomaly_model.pkl')
    print("✅ Model saved as motor_anomaly_model.pkl")

    return model_data

# Run with default if executed as a script
if __name__ == "__main__":
    train_motor_anomaly_model()
