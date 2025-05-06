import pandas as pd
import numpy as np
import uuid
import time

def get_random_rows(input_file="measures_v2_with_time.csv", output_file=None, num_rows=3000):
    print(f"Starting random sampling process...")

    # Generate a UUID for the output file if not provided
    if output_file is None:
        unique_id = str(uuid.uuid4())
        output_file = f"sample_data/sampled_data_{unique_id}.csv"
        print(f"Output file generated: {output_file}")

    # Read data using pandas
    print(f"Reading data from {input_file}...")
    start_time = time.time()
    df = pd.read_csv(input_file)
    load_time = time.time() - start_time
    print(f"Data loaded successfully. {len(df)} rows found. (Took {load_time:.2f} seconds)")

    # Determine how many rows to sample
    sample_size = min(num_rows, len(df))
    print(f"Preparing to sample {sample_size} rows...")

    # Sample rows using pandas
    print("Sampling data...")
    start_time = time.time()
    sampled_df = df.sample(n=sample_size, random_state=np.random.RandomState())
    sample_time = time.time() - start_time
    print(f"Sampling completed. (Took {sample_time:.2f} seconds)")

    # Write to csv
    print(f"Writing sampled data to {output_file}...")
    start_time = time.time()
    sampled_df.to_csv(output_file, index=False)
    write_time = time.time() - start_time
    print(f"CSV file written successfully. (Took {write_time:.2f} seconds)")

    print(f"Successfully sampled {sample_size} rows from {input_file} to {output_file}")
    return output_file

# Example usage
if __name__ == "__main__":
    # Generate output filename with UUID
    unique_id = str(uuid.uuid4())
    output_file = f"sample_data/sampled_data_{unique_id}.csv"
    print(f"Starting script with target of 100,000 rows...")
    get_random_rows(output_file=output_file, num_rows=100000)
