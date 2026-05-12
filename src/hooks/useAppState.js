import { useState, useEffect } from 'react';
import { loadAppData, saveAppData, loadLanguages, saveLanguages } from '../utils/storage';
import { buildInitialCatalog } from '../pages/CatalogPage';

export function useAppState() {
  const INIT = loadAppData();

  const [guides, setGuides] = useState(INIT.guides);
  const [fuel, setFuel] = useState(INIT.fuel);
  const [stopsCarBus, setStopsCarBus] = useState(INIT.stopsCarBus);
  const [fines, setFines] = useState(INIT.fines);
  const [carTasks, setCarTasks] = useState(INIT.carTasks);
  const [stopsGuide, setStopsGuide] = useState(INIT.stopsGuide);
  const [tours, setTours] = useState(INIT.tours);
  const [catalog, setCatalog] = useState(() => INIT.catalog || buildInitialCatalog(INIT.tours));
  const [carRentals, setCarRentals] = useState(INIT.carRentals || []);
  const [roundTrips, setRoundTrips] = useState(INIT.roundTrips || []);
  const [vehicles, setVehicles] = useState(INIT.vehicles);
  const [tourLanguages, setTourLanguages] = useState(loadLanguages);

  useEffect(() => {
    saveLanguages(tourLanguages);
  }, [tourLanguages]);

  useEffect(() => {
    saveAppData({
      guides, fuel, stopsCarBus, fines, carTasks, stopsGuide,
      tours, vehicles, roundTrips, catalog, carRentals
    });
  }, [guides, fuel, stopsCarBus, fines, carTasks, stopsGuide, tours, vehicles, roundTrips, catalog, carRentals]);

  return {
    guides, setGuides,
    fuel, setFuel,
    stopsCarBus, setStopsCarBus,
    fines, setFines,
    carTasks, setCarTasks,
    stopsGuide, setStopsGuide,
    tours, setTours,
    catalog, setCatalog,
    carRentals, setCarRentals,
    roundTrips, setRoundTrips,
    vehicles, setVehicles,
    tourLanguages, setTourLanguages,
  };
}
