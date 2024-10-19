from pymongo import MongoClient

# Replace with your MongoDB connection string
client = MongoClient("mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db")

# Connect to the 'arduino_data_db' database
db = client["arduino_data_db"]

# Access the 'value' collection
value_collection = db["values"]

# Document to insert
document = {
    "temperatureThreshold": 11
}

# Insert the document into the collection
result = value_collection.insert_one(document)

# Print the inserted document's ID
print(f"Document inserted with ID: {result.inserted_id}")
