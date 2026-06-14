import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { loadAppData, saveAppData, savePrevGeneration, loadLanguages, saveLanguages as saveLanguagesLocal } from '../utils/storage';
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

  // След успешен insert базата връща истинското id — заменяме локалното
  // genId с него. Без това редакция/изтриване веднага след добавяне не
  // уцелва реда в DB, а realtime echo-то на собствения запис дублира реда.
  const onInserted = useCallback((localId, dbRow) => {
    setValue(prev => {
      // Echo-то от realtime може вече да е добавило записа с DB id — тогава
      // само премахваме локалния дубликат.
      const next = prev.some(r => r.id === dbRow.id && r.id !== localId)
        ? prev.filter(r => r.id !== localId)
        : prev.map(r => (r.id === localId ? { ...r, id: dbRow.id } : r));
      prevRef.current = next;
      return next;
    });
  }, []);

  const setSynced = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to Supabase in background (fire and forget)
      if (supabase && Array.isArray(prev) && Array.isArray(next)) {
        syncDiff(stateKey, prev, next, onInserted);
      }
      prevRef.current = next;
      return next;
    });
  }, [stateKey, onInserted]);

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
  const [serviceRecords, setServiceRecords, setServiceRecordsDirect] = useSyncedState('serviceRecords', INIT.serviceRecords || []);
  const [roundTrips, setRoundTrips, setRoundTripsDirect] = useSyncedState('roundTrips', INIT.roundTrips || []);
  const [vehicles, setVehicles, setVehiclesDirect] = useSyncedState('vehicles', INIT.vehicles);
  const [tourLanguages, setTourLanguagesRaw] = useState(loadLanguages);
  const [loading, setLoading] = useState(!!supabase);
  const [dbReady, setDbReady] = useState(!supabase);

  // Езиците: разделени на "direct" (зареждане — само state) и user setter
  // (пише в базата). КРИТИЧНО: преди се синхронизираха на ВСЯКО зареждане
  // (delete-all + insert), което при изтекъл токен можеше да изтрие езиците.
  // Сега запис в базата има само при реална промяна от потребител.
  const setTourLanguagesDirect = useCallback((val) => {
    setTourLanguagesRaw(val);
    saveLanguagesLocal(val);
  }, []);
  const setTourLanguages = useCallback((updater) => {
    setTourLanguagesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveLanguagesLocal(next);
      if (supabase) saveLanguagesDB(next);
      return next;
    });
  }, []);

  // Load from Supabase on mount — DB is always authoritative.
  // Таблица с null = грешка при зареждане → пазим локалните данни,
  // вместо да покажем (и после запишем в бекъпа) празно.
  useEffect(() => {
    if (!supabase) return;

    // Една генерация назад: ако днешният load се окаже разрушителен
    // (празна/грешна база), вчерашните данни остават възстановими.
    savePrevGeneration();

    (async () => {
      // Увери се, че токенът е валиден ПРЕДИ да четем — getSession в supabase-js
      // подновява изтекъл токен. Без това при изтекъл токен зареждането връща
      // празно, таблото мига 0 и записът на езици пада с RLS грешка.
      let session = null;
      try {
        const res = await supabase.auth.getSession();
        session = res?.data?.session || null;
      } catch { /* офлайн/без сесия — продължаваме с локалните данни */ }

      const data = await loadAllData();
      // Прилагаме данните от базата само при валидна сесия. Иначе празен
      // резултат (от изтекъл токен) би изтрил локалните данни на екрана.
      if (data && session) {
        if (data.guides) setGuidesDirect(data.guides);
        if (data.fuel) setFuelDirect(data.fuel);
        if (data.stopsCarBus) setStopsCarBusDirect(data.stopsCarBus);
        if (data.fines) setFinesDirect(data.fines);
        if (data.carTasks) setCarTasksDirect(data.carTasks);
        if (data.stopsGuide) setStopsGuideDirect(data.stopsGuide);
        if (data.tours) setToursDirect(data.tours);
        if (data.vehicles) setVehiclesDirect(data.vehicles);
        if (data.roundTrips) setRoundTripsDirect(data.roundTrips);
        if (data.catalog) setCatalogDirect(data.catalog);
        if (data.carRentals) setCarRentalsDirect(data.carRentals);
        if (data.serviceRecords) setServiceRecordsDirect(data.serviceRecords);
        if (data.tourLanguages?.length) setTourLanguagesDirect(data.tourLanguages);
      }
      setLoading(false);
      setDbReady(true);
    })();
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
    serviceRecords: setServiceRecordsDirect,
  }), [setToursDirect, setGuidesDirect, setFuelDirect, setStopsCarBusDirect, setFinesDirect, setCarTasksDirect, setStopsGuideDirect, setVehiclesDirect, setRoundTripsDirect, setCatalogDirect, setCarRentalsDirect, setServiceRecordsDirect]);

  useRealtimeSync(realtimeSetters);

  // Keep localStorage as backup/cache (езиците се пазят локално в сетърите)
  useEffect(() => {
    if (!dbReady) return;
    saveAppData({
      guides, fuel, stopsCarBus, fines, carTasks, stopsGuide,
      tours, vehicles, roundTrips, catalog, carRentals, serviceRecords
    });
  }, [guides, fuel, stopsCarBus, fines, carTasks, stopsGuide, tours, vehicles, roundTrips, catalog, carRentals, serviceRecords, dbReady]);

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
    serviceRecords, setServiceRecords,
    roundTrips, setRoundTrips,
    vehicles, setVehicles,
    tourLanguages, setTourLanguages,
    loading,
    dbReady,
  };
}
