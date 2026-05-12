import { useState, useEffect, useCallback } from 'react';
import { loadAppData, saveAppData, loadLanguages, saveLanguages as saveLanguagesLocal } from '../utils/storage';
import { buildInitialCatalog } from '../pages/CatalogPage';
import { supabase } from '../utils/supabase';
import { loadAllData, insertRow, updateRow, deleteRow, saveLanguages as saveLanguagesDB } from '../utils/db';

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
  const [loading, setLoading] = useState(!!supabase);
  const [dbReady, setDbReady] = useState(!supabase);

  // Load from Supabase on mount
  useEffect(() => {
    if (!supabase) return;

    loadAllData().then(data => {
      if (data) {
        if (data.guides?.length) setGuides(data.guides);
        if (data.fuel?.length) setFuel(data.fuel);
        if (data.stopsCarBus?.length) setStopsCarBus(data.stopsCarBus);
        if (data.fines?.length) setFines(data.fines);
        if (data.carTasks?.length) setCarTasks(data.carTasks);
        if (data.stopsGuide?.length) setStopsGuide(data.stopsGuide);
        if (data.tours?.length) setTours(data.tours);
        if (data.vehicles?.length) setVehicles(data.vehicles);
        if (data.roundTrips?.length) setRoundTrips(data.roundTrips);
        if (data.catalog?.length) setCatalog(data.catalog);
        if (data.carRentals?.length) setCarRentals(data.carRentals);
        if (data.tourLanguages?.length) setTourLanguages(data.tourLanguages);
      }
      setLoading(false);
      setDbReady(true);
    });
  }, []);

  // Keep localStorage as backup/cache
  useEffect(() => {
    if (!dbReady) return;
    saveLanguagesLocal(tourLanguages);
  }, [tourLanguages, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveAppData({
      guides, fuel, stopsCarBus, fines, carTasks, stopsGuide,
      tours, vehicles, roundTrips, catalog, carRentals
    });
  }, [guides, fuel, stopsCarBus, fines, carTasks, stopsGuide, tours, vehicles, roundTrips, catalog, carRentals, dbReady]);

  // Sync languages to DB
  useEffect(() => {
    if (!dbReady || !supabase) return;
    saveLanguagesDB(tourLanguages);
  }, [tourLanguages, dbReady]);

  /**
   * Create a CRUD helper that syncs with Supabase
   * @param {string} stateKey - e.g. 'tours'
   * @param {Function} setter - the setState function
   * @returns {{ add: Function, update: Function, remove: Function }}
   */
  const makeCrud = useCallback((stateKey, setter) => ({
    add: async (item) => {
      if (supabase) {
        const inserted = await insertRow(stateKey, item);
        if (inserted) {
          setter(prev => [...prev, inserted]);
          return inserted;
        }
      }
      // Fallback: use local item as-is
      setter(prev => [...prev, item]);
      return item;
    },
    update: async (id, updates) => {
      if (supabase) {
        const updated = await updateRow(stateKey, id, updates);
        if (updated) {
          setter(prev => prev.map(r => r.id === id ? updated : r));
          return updated;
        }
      }
      setter(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return { id, ...updates };
    },
    remove: async (id) => {
      if (supabase) {
        await deleteRow(stateKey, id);
      }
      setter(prev => prev.filter(r => r.id !== id));
    },
  }), []);

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
    loading,
    dbReady,
    // CRUD helpers
    crud: {
      tours: makeCrud('tours', setTours),
      guides: makeCrud('guides', setGuides),
      vehicles: makeCrud('vehicles', setVehicles),
      fuel: makeCrud('fuel', setFuel),
      fines: makeCrud('fines', setFines),
      carTasks: makeCrud('carTasks', setCarTasks),
      stopsCarBus: makeCrud('stopsCarBus', setStopsCarBus),
      stopsGuide: makeCrud('stopsGuide', setStopsGuide),
      roundTrips: makeCrud('roundTrips', setRoundTrips),
      catalog: makeCrud('catalog', setCatalog),
      carRentals: makeCrud('carRentals', setCarRentals),
    },
  };
}
