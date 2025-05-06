import pandas as pd
from datetime import datetime, timedelta

def add_time_columns(input_file, output_file):
    """
    Adds time and seconds columns to a CSV file, with times incrementing by 10 seconds.

    Args:
        input_file (str): Path to the input CSV file
        output_file (str): Path to the output CSV file
    """
    # Read the CSV file
    print(f"Reading file: {input_file}")
    df = pd.read_csv(input_file)

    # Define a starting time
    start_time = datetime(2023, 1, 1, 0, 0, 0)

    # Create lists to hold the time and seconds values
    time_values = []
    seconds_values = []

    # Generate time values for each row
    for i in range(len(df)):
        current_time = start_time + timedelta(seconds=i*10)
        time_values.append(current_time.strftime('%H:%M:%S'))
        seconds_values.append(i*10)

    # Add the new columns to the dataframe
    df['time'] = time_values
    df['seconds'] = seconds_values

    # Save the modified dataframe to a new CSV file
    print(f"Writing file with added time columns: {output_file}")
    df.to_csv(output_file, index=False)
    print(f"Successfully added time columns to {output_file}")

if __name__ == "__main__":
    input_file = "measures_v2.csv"
    output_file = "measures_v2_with_time.csv"
    add_time_columns(input_file, output_file)
