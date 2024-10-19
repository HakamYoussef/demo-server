import React from "react";
import { FaTemperatureHigh } from "react-icons/fa";
import { FiWind } from "react-icons/fi";
import Navbar from "../components/Navbar";
import {
  GiWindsock,
  GiThermometerHot,
  GiThermometerScale,
  GiThermometerCold,
} from "react-icons/gi";
import { WiDayRainWind } from "react-icons/wi";
import { TiWeatherSunny, TiWeatherStormy } from "react-icons/ti";
import { IoIosSpeedometer } from "react-icons/io";
const page = () => {
  const props = [
    {
      title: `MOY`,
      moy: 0.0,
      max: 0.0,
      min: 0.0,
      variation: 0.0,
      ecart_type: 0.0,
      col: "brd",
    },
    {
      title: `MAX`,
      moy: 0.0,
      max: 0.0,
      min: 0.0,
      variation: 0.0,
      ecart_type: 0.0,
      col: "black",
    },
    {
      title: `MIN`,
      moy: 0.0,
      max: 0.0,
      min: 0.0,
      variation: 0.0,
      ecart_type: 0.0,
      col: "brd",
    },
    {
      title: `Variation`,
      moy: 0.0,
      max: 0.0,
      min: 0.0,
      variation: 0.0,
      ecart_type: 0.0,
      col: "black",
    },
    {
      title: `Ecart type`,
      moy: 0.0,
      max: 0.0,
      min: 0.0,
      variation: 0.0,
      ecart_type: 0.0,
      col: "black",
    },
  ];
  return (
    <div className="flex">
      <Navbar />
      <div>
        <h1 className="text-5xl font-bold pl-7 pt-3">Conditions actuelles</h1>
        <div className="flex gap-2 pl-5 py-2.5">
          <div className="">
            <FaTemperatureHigh size={40} className="pb-2" />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <FiWind size={40} className="" />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <GiWindsock size={40} className="" />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <WiDayRainWind size={40} />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <TiWeatherSunny size={40} />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <FaTemperatureHigh size={40} className="" />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <IoIosSpeedometer size={40} />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <GiThermometerHot size={40} />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <GiThermometerScale size={40} />
            <p className="text-xl">0.00</p>
          </div>
          <div>
            <GiThermometerCold size={40} />
            <p className="text-xl">0.00</p>
          </div>
        </div>
        <div>
          <h1 className="text-3xl pt-2">Statistiques génerales :</h1>
          <div className="grid grid-cols-[1fr_6fr]">
            <div className="flex flex-col gap-0.5 pt-3.5 ">
              <h3>Ajourd'hui</h3>
              <h3>Hier</h3>
              <h3>Dernière 24h</h3>
              <h3>Ce mois</h3>
              <h3>Cette année</h3>
            </div>
            <div className="flex gap-0.5 mt-2 ">
              {props.map((prop, index) => (
                <Trow
                  key={index}
                  title={prop.title}
                  moy={prop.moy}
                  max={prop.max}
                  min={prop.min}
                  variation={prop.variation}
                  ecart_type={prop.ecart_type}
                  col={prop.col}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Trow = ({ title, moy, max, min, variation, ecart_type, col }) => {
  return (
    <div className="flex flex-col pl-5 ">
      <h3>{title}</h3>
      <p className={`mt-0.5 text-center text-${col}`}>{moy}</p>
      <p className={`mt-0.5 text-center text-${col}`}>{max}</p>
      <p className={`mt-0.5 text-center text-${col}`}>{min}</p>
      <p className={`mt-0.5 text-center text-${col}`}>{variation}</p>
      <p className={`mt-0.5 text-center text-${col}`}>{ecart_type}</p>
    </div>
  );
};

export default page;
