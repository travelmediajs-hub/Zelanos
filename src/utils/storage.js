const STORAGE_KEY = 'zelanosData';
const LANGS_KEY = 'zelanosLangs';

const DEFAULT_VEHICLES = [
  {id:1,name:'СВ 0470 ММ - H1бус',seats:'8+1',active:true},
  {id:2,name:'РВ 4806 ХС-Е класа',seats:'3+1',active:true},
  {id:3,name:'V class Silver РВ 2142 АЕ',seats:'6+1',active:true},
  {id:4,name:'РВ 7269 НХ - V-клас-ръчни скорости',seats:'6+1',active:true},
  {id:5,name:'РВ 8455 КС',seats:'8+1',active:true},
  {id:6,name:'Рено Трафик СВ 1455 РА',seats:'8+1',active:true},
  {id:7,name:'СВ 5702 ТЕ - V класа',seats:'6+1',active:true},
  {id:8,name:'РВ 9418 КС',seats:'8+1',active:true},
  {id:9,name:'Хюндай Елантра СВ0827ММ',seats:'3+1',active:true},
  {id:10,name:'Opel Insignia',seats:'3+1',active:true},
  {id:11,name:'V class NEW Silver',seats:'6+1',active:true},
  {id:12,name:'Външен транспорт',seats:'',active:true}
];

const DEFAULT_LANGS = ['English','Spanish','Italian','French','German','Portuguese','Russian','Bulgarian'];

export function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        guides: data.guides || [],
        fuel: data.fuel || [],
        stopsCarBus: data.stopsCarBus || [],
        fines: data.fines || [],
        carTasks: data.carTasks || [],
        stopsGuide: data.stopsGuide || [],
        tours: data.tours || [],
        vehicles: data.vehicles || DEFAULT_VEHICLES,
        roundTrips: data.roundTrips || [],
        catalog: data.catalog || null,
        carRentals: data.carRentals || [],
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return {
    guides: [], fuel: [], stopsCarBus: [], fines: [],
    carTasks: [], stopsGuide: [], tours: [],
    vehicles: DEFAULT_VEHICLES, roundTrips: [],
    catalog: null, carRentals: [],
  };
}

export function saveAppData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function loadLanguages() {
  try {
    const s = localStorage.getItem(LANGS_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return DEFAULT_LANGS;
}

export function saveLanguages(langs) {
  try {
    localStorage.setItem(LANGS_KEY, JSON.stringify(langs));
  } catch (e) {}
}
