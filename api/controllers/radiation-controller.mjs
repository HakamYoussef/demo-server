import asyncHandler from "express-async-handler";
import { Radiation } from "../models/Radiation.mjs";       // Collection pour les seuils
import { ArduinoReading } from "../models/ArduinoReading.mjs"; // Collection pour les mesures

/**
 * POST : L'ESP32 envoie le comptage et le pic.
 * Cette fonction enregistre en base et POUSSE l'info vers le Web en temps réel.
 */
const addRadiationData = asyncHandler(async (req, res) => {
  const { comptage, pic } = req.body;

  // 1. Sauvegarde de la mesure dans 'arduino_readings'
  const readingEntry = new ArduinoReading({ 
    comptage, 
    pic,
    time: new Date()
  });
  const savedReading = await readingEntry.save();

  // 2. --- ENVOI TEMPS RÉEL (SOCKET.IO) ---
  // On récupère 'io' définit dans app.mjs
  const io = req.app.get("socketio");
  
  if (io) {
    // On envoie la donnée immédiatement au navigateur pour le graphique
    io.emit("radiationData", savedReading);
    console.log(`[Socket.io] Envoi au Web -> CPS: ${comptage}`);
  }

  res.status(201).json(savedReading);
});

/**
 * GET : L'ESP32 demande les seuils OU le Web demande l'historique.
 */
const getRadiationData = asyncHandler(async (req, res) => {
  // 1. On cherche le dernier réglage de seuil enregistré dans la collection 'radiations'
  const lastConfig = await Radiation.findOne().sort({ timestamp: -1 });

  // 2. Si c'est l'ESP32 qui demande, on lui envoie les seuils
  // Si c'est le Web qui demande l'historique, on peut aussi renvoyer les mesures
  if (req.query.target === 'esp') {
      return res.status(200).json(lastConfig);
  }

  // Par défaut, renvoie les 100 dernières mesures pour le site Web
  const history = await ArduinoReading.find().sort({ time: -1 }).limit(100);
  res.status(200).json(history);
});

export { addRadiationData, getRadiationData };
