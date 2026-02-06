from pymongo import MongoClient

# Replace with your MongoDB connection string
client = MongoClient("mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db")

# Connect to the 'arduino_data_db' database
db = client["arduino_data_db"]

# Access the 'radiations' collection
radiation_collection = db["radiations"]

# Radiation document to insert
radiation_document = {
    "Vbas": 0.12,
    "Vhaut": 0.34,
    # timestamp will be automatically added by MongoDB if not provided
}

# Insert the document into the collection
result = radiation_collection.insert_one(radiation_document)

# Print the inserted document's ID
print(f"Radiation document inserted with ID: {result.inserted_id}")

