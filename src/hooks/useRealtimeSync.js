import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { keysToCamel } from '../utils/case';

/**
 * Table name -> state key mapping (reverse of TABLE_MAP in db.js)
 */
const TABLE_TO_STATE = {
  tours: 'tours',
  guides: 'guides',
  fuel: 'fuel',
  stops_car: 'stopsCarBus',
  fines: 'fines',
  car_tasks: 'carTasks',
  stops_guide: 'stopsGuide',
  vehicles: 'vehicles',
  round_trips: 'roundTrips',
  catalog: 'catalog',
  car_rentals: 'carRentals',
  service_records: 'serviceRecords',
};

const TABLES = Object.keys(TABLE_TO_STATE);

/**
 * Hook that subscribes to Supabase Realtime changes and updates
 * local state instantly when another user modifies the database.
 *
 * @param {Object} setters - map of stateKey -> setDirect function
 */
export function useRealtimeSync(setters) {
  const settersRef = useRef(setters);
  settersRef.current = setters;

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('zelanos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const { table, eventType, new: newRow, old: oldRow } = payload;
          const stateKey = TABLE_TO_STATE[table];
          if (!stateKey) return;

          const setter = settersRef.current[stateKey];
          if (!setter) return;

          const camelRow = newRow ? keysToCamel(newRow) : null;

          switch (eventType) {
            case 'INSERT':
              setter((prev) => {
                if (prev.some((r) => r.id === camelRow.id)) return prev;
                return [...prev, camelRow];
              });
              break;

            case 'UPDATE':
              setter((prev) =>
                prev.map((r) => (r.id === camelRow.id ? camelRow : r))
              );
              break;

            case 'DELETE':
              setter((prev) =>
                prev.filter((r) => r.id !== (oldRow?.id ?? oldRow))
              );
              break;

            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
