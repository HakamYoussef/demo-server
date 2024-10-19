import pymongo
from pymongo import MongoClient
from datetime import datetime

# MongoDB connection details
MONGO_URI = 'mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db'
DATABASE_NAME = 'arduino_data_db'
COLLECTION_NAME = 'sensor_readings'

def delete_latest_files(uri, db_name, collection_name, num_files=100000):
    # Create a MongoDB client
    client = MongoClient(uri)
    
    # Access the specified database and collection
    db = client[db_name]
    collection = db[collection_name]

    try:
        # Fetch the 100 most recent documents based on the timestamp field
        latest_files = collection.find().sort('timestamp', pymongo.DESCENDING).limit(num_files)

        # Delete the fetched documents
        for file in latest_files:
            collection.delete_one({'_id': file['_id']})
            print(f"Deleted file with _id: {file['_id']} and timestamp: {file['timestamp']}")

        print(f"Successfully deleted {num_files} latest files from the collection.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Close the MongoDB client connection
        client.close()

if __name__ == "__main__":
    delete_latest_files(MONGO_URI, DATABASE_NAME, COLLECTION_NAME)
