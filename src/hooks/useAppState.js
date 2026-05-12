import { useState, useEffect, useCallback, useRef } from 'react';
import { loadAppData, saveAppData, loadLanguages, saveLanguages as saveLanguagesLocal } from '../utils/storage';
import { buildInitialCatalog } from '../pages/CatalogPage';
import { supabase } from '../utils/supabase';
import { loadAllData, syncDiff, saveLanguagesDB } from '../utils/db';

/**
 * Creates a setState wrapper that auto-syncs changes to Supabase.
 * Pages keep using setX(prev => [...prev, item]) as before —
 * the wrapper detects the diff and syncs in the background.
 */
function useSyncedState(stateKey, initialValue) {
  const [value, setValue] = useState(initialValue);
  const prevRef = useRef(initialValue);

  const setSynced = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to Supabase in background (fire and forget)
      if (supabase && Array.isArray(prev) && Array.isArray(next)) {
        syncDiff(stateKey, prev, next);
      }
      prevRef.current = next;
      return next;
    });
  }, [stateKey]);

  // Allow overwriting value without syncing (used for initial load from DB)
  const setDirect = useCallback((val) => {
    setValue(val);
    prevRef.current = val;
  }, []);

  return [value, setSynced, setDirect];
}

export function useAppState() {
  const INIT = loadAppData();

  const [guides, setGuides, setGuidesDirect] = useSyncedState('guides', INIT.guides);
  const [fuel, setFuel, setFuelDirect] = useSyncedState('fuel', INIT.fuel);
  const [stopsCarBus, setStopsCarBus, setStopsCarBusDirect] = useSyncedState('stopsCarBus', INIT.stopsCarBus);
  const [fines, setFines, setFinesDirect] = useSyncedState('fines', INIT.fines);
  const [carTasks, setCarTasks, setCarTasksDirect] = useSyncedState('carTasks', INIT.carTasks);
  const [stopsGuide, setStopsGuide, setStopsGuideDirect] = useSyncedState('stopsGuide', INIT.stopsGuide);
  const [tours, setTours, setToursDirect] = useSyncedState('tours', INIT.tours);
  const [catalog, setCatalog, setCatalogDirect] = useSyncedState('catalog', INIT.catalog || buildInitialCatalog(INIT.tours));
  const [carRentals, setCarRentals, setCarRentalsDirect] = useSyncedState('carRentals', INIT.carRentals || []);
  const [roundTrips, setRoundTrips, setRoundTripsDirect] = useSyncedState('roundTrips', INIT.roundTrips || []);
  const [vehicles, setVehicles, setVehiclesDirect] = useSyncedState('vehicles', INIT.vehicles);
  const [tourLanguages, setTourLanguages] = useState(loadLanguages);
  const [loading, setLoading] = useState(!!supabase);
  const [dbReady, setDbReady] = useState(!supabase);

  // Load from Supabase on mount
  useEffect(() => {
    if (!supabase) return;

    loadAllData().then(data => {
      if (data) {
        if (data.guides?.length) setGuidesDirect(data.guides);
        if (data.fuel?.length) setFuelDirect(data.fuel);
        if (data.stopsCarBus?.length) setStopsCarBusDirect(data.stopsCarBus);
        if (data.fines?.length) setFinesDirect(data.fines);
        if (data.carTasks?.length) setCarTasksDirect(data.carTasks);
        if (data.stopsGuide?.length) setStopsGuideDirect(data.stopsGuide);
        if (data.tours?.length) setToursDirect(data.tours);
        if (data.vehicles?.length) setVehiclesDirect(data.vehicles);
        if (data.roundTrips?.length) setRoundTripsDirect(data.roundTrips);
        if (data.catalog?.length) setCatalogDirect(data.catalog);
        if (data.carRentals?.length) setCarRentalsDirect(data.carRentals);
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

  // Sync languages to DB when changed
  useEffect(() => {
    if (!dbReady || !supabase) return;
    saveLanguagesDB(tourLanguages);
  }, [tourLanguages, dbReady]);

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
  };
}
