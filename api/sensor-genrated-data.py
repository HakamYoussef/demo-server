from pymongo import MongoClient


mongo_uri = "mongodb+srv://fatimaeddaoudi:fatimaD147011474@cluster0.vkuykr8.mongodb.net/arduino_data_db" 
client = MongoClient(mongo_uri)


db = client.arduino_data_db  
control_collection = db.controls  


new_control_document = {
    "Elv1": False,
    "Elv2": False,
    "Elv3": False,
    "Elv4": False,
    "Elv5": False,
    "Elv6": False,
    "F1": False,
    "F2": False,
    "F3": False,
    "F4": False,
    "F5": False,
    "F6": False
}


result = control_collection.insert_one(new_control_document)


print(f"Document inserted with ID: {result.inserted_id}")
