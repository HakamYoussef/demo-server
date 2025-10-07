from datetime import datetime

from pymongo import MongoClient

# Replace with your MongoDB connection string
client = MongoClient("mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db")

# Connect to the 'arduino_data_db' database
db = client["arduino_data_db"]

# Access the 'arduino_readings' collection
reading_collection = db["arduino_readings"]

# Document to insert
reading_document = {
    "comptage": 123,
    "pic": 45.6,
    "time": datetime.utcnow()
}

# Insert the document into the collection
result = reading_collection.insert_one(reading_document)

# Print the inserted document's ID
print(f"Reading document inserted with ID: {result.inserted_id}")
