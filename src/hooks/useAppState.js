import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { loadAppData, saveAppData, loadLanguages, saveLanguages as saveLanguagesLocal } from '../utils/storage';
import { buildInitialCatalog } from '../pages/CatalogPage';
import { supabase } from '../utils/supabase';
import { loadAllData, syncDiff, saveLanguagesDB } from '../utils/db';
import { useRealtimeSync } from './useRealtimeSync';

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

  // Allow overwriting value without syncing (used for initial load from DB and realtime)
  const setDirect = useCallback((valOrUpdater) => {
    setValue(prev => {
      const next = typeof valOrUpdater === 'function' ? valOrUpdater(prev) : valOrUpdater;
      prevRef.current = next;
      return next;
    });
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

  // Load from Supabase on mount — DB is always authoritative
  useEffect(() => {
    if (!supabase) return;

    loadAllData().then(data => {
      if (data) {
        setGuidesDirect(data.guides ?? []);
        setFuelDirect(data.fuel ?? []);
        setStopsCarBusDirect(data.stopsCarBus ?? []);
        setFinesDirect(data.fines ?? []);
        setCarTasksDirect(data.carTasks ?? []);
        setStopsGuideDirect(data.stopsGuide ?? []);
        setToursDirect(data.tours ?? []);
        setVehiclesDirect(data.vehicles ?? []);
        setRoundTripsDirect(data.roundTrips ?? []);
        setCatalogDirect(data.catalog ?? []);
        setCarRentalsDirect(data.carRentals ?? []);
        if (data.tourLanguages?.length) setTourLanguages(data.tourLanguages);
      }
      setLoading(false);
      setDbReady(true);
    });
  }, []);

  // Realtime: keep state in sync when other users make changes
  // Uses setDirect (not setSynced) to avoid writing back to Supabase in a loop
  const realtimeSetters = useMemo(() => ({
    tours: setToursDirect,
    guides: setGuidesDirect,
    fuel: setFuelDirect,
    stopsCarBus: setStopsCarBusDirect,
    fines: setFinesDirect,
    carTasks: setCarTasksDirect,
    stopsGuide: setStopsGuideDirect,
    vehicles: setVehiclesDirect,
    roundTrips: setRoundTripsDirect,
    catalog: setCatalogDirect,
    carRentals: setCarRentalsDirect,
  }), [setToursDirect, setGuidesDirect, setFuelDirect, setStopsCarBusDirect, setFinesDirect, setCarTasksDirect, setStopsGuideDirect, setVehiclesDirect, setRoundTripsDirect, setCatalogDirect, setCarRentalsDirect]);

  useRealtimeSync(realtimeSetters);

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
