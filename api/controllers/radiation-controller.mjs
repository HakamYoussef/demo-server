import asyncHandler from "express-async-handler";
import { Radiation } from "../models/Radiation.mjs";       // Pour Vbas, Vhaut
import { ArduinoReading } from "../models/ArduinoReading.mjs"; // Pour comptage, pic

/**
 * UNIQUE POST : Reçoit tout de l'ESP32, enregistre dans 2 collections 
 * et envoie en temps réel au Web.
 */
const addRadiationData = asyncHandler(async (req, res) => {
  // 1. L'ESP32 envoie tout dans le corps (body) de la requête
  const { Vbas, Vhaut, comptage, pic } = req.body;

  // 2. Enregistrement dans la collection 'radiations' (Schéma 1)
  const radiationEntry = new Radiation({ 
    Vbas, 
    Vhaut 
  });
  const savedRadiation = await radiationEntry.save();

  // 3. Enregistrement dans la collection 'arduino_readings' (Schéma 2)
  const readingEntry = new ArduinoReading({ 
    comptage, 
    pic 
  });
  const savedReading = await readingEntry.save();

  // 4. --- ENVOI TEMPS RÉEL VIA SOCKET.IO ---
  const io = req.app.get("socketio");
  if (io) {
    // On crée un objet unique pour le Front-end avec TOUTES les infos
    const dataForWeb = {
      Vbas: savedRadiation.Vbas,
      Vhaut: savedRadiation.Vhaut,
      comptage: savedReading.comptage,
      pic: savedReading.pic,
      time: savedReading.time // Date de la mesure
    };

    io.emit("radiationData", dataForWeb);
    console.log(`[Push] Donnée envoyée au Web : CPS=${comptage}`);
  }

  // 5. Réponse à l'ESP32 (201 Created)
  res.status(201).json({ message: "Success", radiation: savedRadiation, reading: savedReading });
});

/**
 * GET : Récupère l'historique pour l'affichage initial de la page
 */
const getRadiationData = asyncHandler(async (req, res) => {
  // On récupère les mesures les plus récentes
  const data = await ArduinoReading.find().sort({ time: -1 }).limit(100);
  res.status(200).json(data);
});

export { addRadiationData, getRadiationData };
