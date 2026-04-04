import asyncHandler from "express-async-handler";
import { Radiation } from "../models/Radiation.mjs";

/**
 * Stores radiation values and broadcasts them via Socket.io for real-time display.
 */
const addRadiationData = asyncHandler(async (req, res) => {
  // 1. On récupère les données envoyées par l'ESP32 (Vbas, Vhaut + comptage, pic)
  const { Vbas, Vhaut, comptage, pic } = req.body;

  // 2. On crée l'entrée avec toutes les valeurs dans le modèle Radiation
  const radiation = new Radiation({ 
    Vbas, 
    Vhaut, 
    comptage, 
    pic 
  });

  await radiation.save();

  // 3. --- MODIFICATION TEMPS RÉEL ---
  // On récupère 'io' que nous avons attaché à l'app dans app.mjs
  const io = req.app.get("socketio");
  
  if (io) {
    // On envoie la donnée immédiatement au navigateur
    io.emit("radiationData", radiation);
    console.log("Donnée envoyée au Web en temps réel via Socket.io");
  }

  res.status(201).json(radiation);
});

/**
 * Retrieves all radiation data sorted by timestamp.
 */
const getRadiationData = asyncHandler(async (req, res) => {
  // On trie par -1 pour avoir les plus récents en premier
  const data = await Radiation.find().sort({ timestamp: -1 }).limit(100);
  res.status(200).json(data);
});

export { addRadiationData, getRadiationData };
