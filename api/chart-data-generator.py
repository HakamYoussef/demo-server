import pymongo
from pymongo import MongoClient
from datetime import datetime, timedelta
import random
import json
import time

# MongoDB connection parameters
MONGO_URI = 'mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db'  # Adjust as needed
DB_NAME = 'arduino_data_db'
COLLECTION_NAME = 'sensor_readings'

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Initial timestamp
initial_timestamp = datetime(2024, 7, 28, 12, 34, 56, 789000)

def generate_random_readings(timestamp):
    return {
        "timestamp": timestamp,  # Directly use datetime object
        "F5": random.randint(0, 1),
        "P2_A": round(random.uniform(0, 2), 1),
        "Elv5": random.randint(0, 1),
        "F1": random.randint(0, 1),
        "T_S11": round(random.uniform(20, 25), 1),
        "H_S5": random.randint(50, 80),
        "T_A2": round(random.uniform(20, 25), 1),
        "C_S1": round(random.uniform(1, 2), 1),
        "T_S1": round(random.uniform(20, 25), 1),
        "H_S3": round(random.uniform(50, 60), 1),
        "H_S6": round(random.uniform(50, 60), 1),
        "PH_S11": round(random.uniform(6.5, 7), 1),
        "Elv1": random.randint(0, 1),
        "Elv2": random.randint(0, 1),
        "T_A4": round(random.uniform(20, 25), 1),
        "T_S8": round(random.uniform(20, 25), 1),
        "C_S10": round(random.uniform(1, 2), 1),
        "T_S9": round(random.uniform(20, 25), 1),
        "PH_S10": round(random.uniform(6.5, 7), 1),
        "T_S10": round(random.uniform(20, 25), 1),
        "T_S3": round(random.uniform(20, 25), 1),
        "PH_S1": round(random.uniform(6.5, 7), 1),
        "PH_S6": round(random.uniform(6.5, 7), 1),
        "C_S11": round(random.uniform(1, 2), 1),
        "H_S9": round(random.uniform(50, 60), 1),
        "T_A6": round(random.uniform(20, 25), 1),
        "PH_eau": round(random.uniform(6.5, 7), 1),
        "H_S8": round(random.uniform(50, 60), 1),
        "F4": random.randint(0, 1),
        "Elv6": random.randint(0, 1),
        "T_S7": round(random.uniform(20, 25), 1),
        "T_S5": round(random.uniform(20, 25), 1),
        "PH_S7": round(random.uniform(6.5, 7), 1),
        "H_S12": random.randint(50, 60),
        "H_A6": round(random.uniform(60, 90), 1),
        "H_S2": round(random.uniform(50, 60), 1),
        "C_S3": round(random.uniform(1, 2), 1),
        "C_S9": round(random.uniform(1, 2), 1),
        "C_S8": round(random.uniform(1, 2), 1),
        "H_A2": round(random.uniform(60, 65), 1),
        "T_A5": round(random.uniform(20, 25), 1),
        "H_S10": round(random.uniform(50, 60), 1),
        "T_S12": round(random.uniform(20, 25), 1),
        "H_A5": round(random.uniform(60, 65), 1),
        "P1_A": random.randint(0, 1),
        "LEVEL_eau": random.randint(70, 80),
        "F2": random.randint(0, 1),
        "T_S2": round(random.uniform(20, 25), 1),
        "H_S11": random.randint(50, 60),
        "O2_A": round(random.uniform(20, 25), 1),
        "PH_S4": round(random.uniform(6.5, 7), 1),
        "PH_S9": round(random.uniform(6.5, 7), 1),
        "T_A1": round(random.uniform(20, 25), 1),
        "H_A3": round(random.uniform(60, 65), 1),
        "PH_S5": round(random.uniform(6.5, 7), 1),
        "P": random.randint(0, 1),
        "PH_S3": round(random.uniform(6.5, 7), 1),
        "H_S1": round(random.uniform(50, 60), 1),
        "PH_S8": round(random.uniform(6.5, 7), 1),
        "H_S7": round(random.uniform(50, 60), 1),
        "C_S12": round(random.uniform(1, 2), 1),
        "CO2_A": round(random.uniform(400, 410), 1),
        "C_S5": round(random.uniform(1, 2), 1),
        "T_S6": round(random.uniform(20, 25), 1),
        "C_S7": round(random.uniform(1, 2), 1),
        "F3": random.randint(0, 1),
        "PH_S2": round(random.uniform(6.5, 7), 1),
        "PH_S12": round(random.uniform(6.5, 7), 1),
        "H_A4": round(random.uniform(60, 65), 1),
        "C_S4": round(random.uniform(1, 2), 1),
        "H_S4": random.randint(50, 60),
        "T_A3": round(random.uniform(20, 25), 1),
        "C_S2": round(random.uniform(1, 2), 1),
        "F6": random.randint(0, 1),
        "C": random.randint(0, 1),
        "H_A1": round(random.uniform(60, 65), 1),
        "T_S4": round(random.uniform(20, 25), 1),
        "C_S6": round(random.uniform(1, 2), 1),
        "Elv4": random.randint(0, 1),
        "Elv3": random.randint(0, 1)
    }

if __name__ == "__main__":
    i = 0
    while True:
        timestamp = initial_timestamp + timedelta(minutes=5 * i)
        document = generate_random_readings(timestamp)
        result = collection.insert_one(document)
        inserted_id = result.inserted_id
        # Print document details for debugging
        print(f"Inserted document {i+1}: {json.dumps(document, default=str, indent=2)}")
        i += 1
        time.sleep(5)  # Wait for 2 seconds before the next insertion
