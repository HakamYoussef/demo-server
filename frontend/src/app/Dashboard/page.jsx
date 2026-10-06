import React from "react";
import CardC from "../components/CardC";
import Ddd from "../charts/Ddd";
import Sections from "../components/Sections";
import Navbar from "../components/Navbar";
const page = () => {
  const graphs = [
    {
      Rubrique: "O2/CO2",
    },
    {
      Rubrique: "T/H",
    },
    {
      Rubrique: "Rubrique 3",
    },
    {
      Rubrique: "Rubrique 4",
    },
    {
      Rubrique: "Rubrique 5",
    },
  ];
  return (
    <div className="">
      <div className="min-h-screen pt-[90px]">
        <Navbar />
        <div className="flex flex-col min-w-0 w-full max-w-7xl mx-auto px-4">
          <Sections />
          <div className="mb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold px-2.5 py-2">
                Données Actuelles
              </h1>
              <a
                href="/capteurs"
                className="bg-black text-white mt-1.25 mb-1.5 p-1 px-2 rounded-md font-bold"
              >
                Afficher tout
              </a>
            </div>
            <div className="">
              <CardC />
            </div>
          </div>
          <Ddd />
        </div>
      </div>
    </div>
  );
};

export default page;
