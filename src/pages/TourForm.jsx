import { useState, useMemo } from 'react';
import { parseDate, bgToISO, isoToBG } from '../utils/helpers';

function TourForm({data,onSave,onCancel,guides,catalog,vehicles,allTours,roundTrips,stopsCarBus,tourLanguages,setTourLanguages,carRentals}){
  const[f,setF]=useState(()=>{const d={...data};if(!d.tourLanguage&&d.tour&&d.tour.includes(' - ')){const parts=d.tour.split(' - ');d.tourLanguage=parts[parts.length-1]}return d});const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const [formTab,setFormTab]=useState('tour');
  const [catSearch,setCatSearch]=useState('');
  const selectCatalogTour=(cid)=>{if(!cid){setF(p=>({...p,tour:'',catalogId:null,tourLanguage:'',isEvening:false}));return};const ct=catalog.find(c=>c.id===+cid);if(ct){setF(p=>({...p,tour:ct.name,catalogId:ct.id,tourLanguage:'',isEvening:!!ct.isEvening,salePrice:ct.salePrice||p.salePrice,salePriceChild:ct.childPrice||p.salePriceChild,tourType:ct.needsCar===false?'walking':p.tourType||'guide_driver'}))}};
  const catalogMatch=useMemo(()=>{if(f.catalogId)return catalog.find(c=>c.id===f.catalogId);if(!f.tour)return null;const parts=f.tour.split(' - ');const base=parts.length>1?parts.slice(0,-1).join(' - '):f.tour;return catalog.find(c=>c.name===base||c.name===f.tour)},[f.tour,f.catalogId,catalog]);
  const tp=f.tourType||'guide_driver';
  const st=f.tourStatus||'reservation';
  const needsCar=tp==='guide_drives'||tp==='guide_driver';
  const needsDriver=tp==='guide_driver'&&!f.guideIsDriver;
  const reqFields=useMemo(()=>{
    const r=['guide','expGuide'];
    if(needsCar){r.push('carNumber','expFuel')}
    if(needsDriver){r.push('driver','expDriver')}
    return r;
  },[tp,f.guideIsDriver]);
  const missing=reqFields.filter(k=>!f[k]&&f[k]!==0);
  const canReport=missing.length===0&&f.priceToUs!=null;
  const totalExp=(f.expGuide||0)+(f.expDriver||0)+(f.expFuel||0)+(f.expAudioGuide||0)+(f.expEntryFees||0)+(f.expLunch||0)+(f.expParking||0);
  const balance=(f.priceToUs||0)-totalExp;
  const vList=(vehicles||[]).filter(v=>v.active);
  const selectedVehicle=f.carNumber?vList.find(v=>v.name===f.carNumber):null;
  const rtBlocked=useMemo(()=>{
    if(!f.date||!roundTrips)return{cars:new Set(),guides:new Set(),drivers:new Set()};
    const d=parseDate(f.date);if(!d)return{cars:new Set(),guides:new Set(),drivers:new Set()};
    const cars=new Set(),gds=new Set(),drs=new Set();
    roundTrips.forEach(rt=>{
      if(rt.status==='cancelled')return;
      const from=parseDate(rt.dateFrom),to=parseDate(rt.dateTo);
      if(!from||!to)return;
      if(d>=from&&d<=to){
        if(rt.vehicle)cars.add(rt.vehicle);
        if(rt.guide)gds.add(rt.guide);
        if(rt.driver)drs.add(rt.driver);
      }
    });
    return{cars,guides:gds,drivers:drs};
  },[f.date,roundTrips]);
  const inServiceCars=useMemo(()=>{
    if(!f.date||!stopsCarBus)return new Set();
    const d=parseDate(f.date);if(!d)return new Set();
    const s=new Set();
    stopsCarBus.forEach(st=>{
      const from=parseDate(st.startDate),to=parseDate(st.endDate);
      if(!from||!to)return;
      if(d>=from&&d<=to&&st.vehicle)s.add(st.vehicle);
    });
    return s;
  },[f.date,stopsCarBus]);
  const parseSeats=(s)=>{if(!s)return{pax:0,total:0};const p=String(s).split('+');return{pax:parseInt(p[0])||0,total:(parseInt(p[0])||0)+(parseInt(p[1])||0)}};
  const vSeats=selectedVehicle?parseSeats(selectedVehicle.seats):null;
  // Гидът заема пътническо място, ОСВЕН ако е и шофьор (тогава е на +1 шофьорското)
  const guideIsDriver=!!f.guideIsDriver;
  const guideSeatsTaken=f.guide&&!guideIsDriver?1:0;
  const availableForTourists=vSeats?vSeats.pax-guideSeatsTaken:null;
  const sameDayTours=useMemo(()=>{
    if(!f.carNumber||!f.date||!allTours)return[];
    return allTours.filter(t=>t.id!==f.id&&t.carNumber===f.carNumber&&t.date===f.date&&(t.tourStatus||'reservation')!=='cancelled');
  },[f.carNumber,f.date,f.id,allTours]);
  // Проверка дневен/вечерен конфликт: кола може 1 дневен + 1 вечерен, но НЕ 2 дневни или 2 вечерни
  const thisIsEvening=!!f.isEvening;
  const slotConflict=useMemo(()=>{
    if(!needsCar||!f.carNumber||!f.date||sameDayTours.length===0)return null;
    const sameSlot=sameDayTours.filter(t=>!!t.isEvening===thisIsEvening);
    if(sameSlot.length>0)return thisIsEvening?'вечерен':'дневен';
    return null;
  },[sameDayTours,thisIsEvening,needsCar,f.carNumber,f.date]);
  // За капацитета считаме само турове от СЪЩИЯ слот (дневен/вечерен)
  const sameSlotTours=sameDayTours.filter(t=>!!t.isEvening===thisIsEvening);
  const sameDayPax=sameSlotTours.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0);
  // За другите турове на същия ден — гидовете им също заемат място (ако не са шофьори)
  const sameDayGuideSeats=sameSlotTours.reduce((a,t)=>{const gd=!!t.guideIsDriver;return a+(t.guide&&!gd?1:0)},0);
  const thisPax=(f.adults||0)+(f.children||0);
  const totalPaxInCar=sameDayPax+thisPax+guideSeatsTaken+sameDayGuideSeats;
  const remainingSeats=vSeats?vSeats.pax-totalPaxInCar:null;
  const capacityOk=!needsCar||!selectedVehicle||!vSeats||vSeats.pax===0||remainingSeats>=0;
  const slotOk=!slotConflict;
  const slotBlockedCars=useMemo(()=>{
    if(!f.date||!allTours)return new Set();
    const s=new Set();
    allTours.forEach(t=>{if(t.id===f.id||!t.carNumber||t.date!==f.date||(t.tourStatus||'reservation')==='cancelled')return;if(!!t.isEvening===thisIsEvening)s.add(t.carNumber)});
    return s;
  },[f.date,f.id,allTours,thisIsEvening]);
  // Check rental conflicts: day tours occupy ~08:00-17:00, evening tours ~17:00-23:00
  const rentalBlockedCars=useMemo(()=>{
    if(!f.date||!carRentals)return new Map();
    const d=parseDate(f.date);if(!d)return new Map();
    const timeToMin=(t)=>{if(!t)return 0;const p=t.split(':');return(parseInt(p[0])||0)*60+(parseInt(p[1])||0)};
    const tourFrom=thisIsEvening?17*60:8*60,tourTo=thisIsEvening?23*60:17*60;
    const map=new Map();
    carRentals.forEach(r=>{
      if(!r.vehicle)return;
      const rf=parseDate(r.dateFrom),rto=parseDate(r.dateTo||r.dateFrom);
      if(!rf||!rto||d<rf||d>rto)return;
      const rm1=timeToMin(r.timeFrom||'08:00'),rm2=timeToMin(r.timeTo||'18:00');
      if(tourFrom<rm2&&rm1<tourTo){
        if(!map.has(r.vehicle))map.set(r.vehicle,[]);
        map.get(r.vehicle).push(r);
      }
    });
    return map;
  },[f.date,carRentals,thisIsEvening]);
  const missingReport=missing.filter(k=>['expGuide','expDriver','expFuel'].includes(k));
  const missingTour=missing.filter(k=>['guide','driver','carNumber'].includes(k));
  const isWalking=tp==='walking';
  const typedCatalog=useMemo(()=>{const s=catSearch.toLowerCase();let list=catalog||[];list=list.filter(c=>isWalking?c.needsCar===false:c.needsCar!==false);if(s)list=list.filter(c=>c.name.toLowerCase().includes(s));return list},[catalog,catSearch,isWalking]);
  const [catOpen,setCatOpen]=useState(false);
  return <div>
  <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
    <div style={{flex:1}}>
      <div className="view-toggle" style={{width:'100%'}}>
        <button type="button" className={`view-btn ${isWalking?'active':''}`} onClick={()=>{u('tourType','walking');setF(p=>({...p,tourType:'walking',catalogId:null,tour:''}));setCatSearch('')}}>🚶 Пешеходен</button>
        <button type="button" className={`view-btn ${!isWalking?'active':''}`} onClick={()=>{u('tourType','guide_driver');setF(p=>({...p,tourType:'guide_driver',catalogId:null,tour:''}));setCatSearch('')}}>🚐 С автомобил</button>
      </div>
    </div>
    <div>
      <select value={st} onChange={e=>u('tourStatus',e.target.value)} style={{padding:'6px 12px',borderRadius:6,fontSize:13,fontWeight:600,border:'1px solid var(--border)',cursor:'pointer',
        background:st==='planned'?'rgba(5,150,105,.1)':st==='reported'?'rgba(5,150,105,.1)':st==='done'?'rgba(217,119,6,.1)':st==='cancelled'?'rgba(220,38,38,.1)':'rgba(79,70,229,.08)',
        color:st==='planned'?'var(--green)':st==='reported'?'var(--green)':st==='done'?'var(--yellow)':st==='cancelled'?'var(--red)':'var(--accent)'}}>
        <option value="reservation">{'📋'} Резервация</option>
        <option value="planned">{'📌'} Планиран</option>
        <option value="done">{'✅'} Проведен</option>
        <option value="reported">{'📊'} Отчетен</option>
        <option value="cancelled">{'❌'} Отменен</option>
      </select>
    </div>
  </div>
  <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)'}}>
    <button type="button" onClick={()=>setFormTab('tour')} style={{padding:'10px 24px',fontSize:14,fontWeight:600,border:'none',cursor:'pointer',
      background:'transparent',color:formTab==='tour'?'var(--accent)':'var(--text2)',
      borderBottom:formTab==='tour'?'2px solid var(--accent)':'2px solid transparent',marginBottom:'-2px',transition:'all .15s'}}>
      🗓 Тур {missingTour.length>0&&<span style={{background:'var(--red)',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:11,marginLeft:6}}>{missingTour.length}</span>}
    </button>
    <button type="button" onClick={()=>setFormTab('report')} style={{padding:'10px 24px',fontSize:14,fontWeight:600,border:'none',cursor:'pointer',
      background:'transparent',color:formTab==='report'?'var(--accent)':'var(--text2)',
      borderBottom:formTab==='report'?'2px solid var(--accent)':'2px solid transparent',marginBottom:'-2px',transition:'all .15s'}}>
      📊 Отчет {missingReport.length>0&&<span style={{background:'var(--red)',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:11,marginLeft:6}}>{missingReport.length}</span>}
    </button>
  </div>

  {formTab==='tour'&&<div>
    {catalog&&catalog.length>0&&<div style={{marginBottom:12,position:'relative'}}>
      <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:4}}>Тур от каталога</label>
      <div style={{position:'relative'}}>
        <input placeholder="Търси и избери тур..." value={catOpen?catSearch:(catalogMatch?catalogMatch.name+(f.tourLanguage?' - '+f.tourLanguage:''):(catSearch||''))} onChange={e=>{setCatSearch(e.target.value);setCatOpen(true)}} onFocus={()=>setCatOpen(true)} onBlur={()=>setTimeout(()=>setCatOpen(false),200)} style={{width:'100%',padding:'8px 10px',paddingRight:30,borderRadius:6,border:'1px solid '+(catalogMatch?'var(--green)':'var(--border)'),background:'var(--card)',color:'var(--text)',fontSize:13}}/>
        {catalogMatch&&f.isEvening&&<span style={{position:'absolute',right:30,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--orange)',fontWeight:600}}>🌙 вечерен</span>}
        {catalogMatch&&<span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:16,color:'var(--text2)'}} onClick={()=>{selectCatalogTour('');setCatSearch('');setCatOpen(true)}}>✕</span>}
      </div>
      {catOpen&&<div style={{position:'absolute',zIndex:50,left:0,right:0,top:'100%',maxHeight:200,overflowY:'auto',border:'1px solid var(--border)',borderRadius:6,background:'var(--card)',boxShadow:'0 4px 12px rgba(0,0,0,.15)'}}>
        {typedCatalog.map(c=><div key={c.id} style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid var(--border)',background:catalogMatch&&catalogMatch.id===c.id?'rgba(123,35,50,.08)':'transparent',display:'flex',justifyContent:'space-between',alignItems:'center'}} onClick={()=>{selectCatalogTour(c.id);setCatSearch('');setCatOpen(false)}} onMouseEnter={e=>e.currentTarget.style.background='rgba(123,35,50,.05)'} onMouseLeave={e=>e.currentTarget.style.background=catalogMatch&&catalogMatch.id===c.id?'rgba(123,35,50,.08)':'transparent'}>
          <span>{c.name}{c.isEvening?' 🌙':''}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{c.isEvening?'вечерен':''}</span>
        </div>)}
        {typedCatalog.length===0&&<div style={{padding:'10px',fontSize:13,color:'var(--text2)',textAlign:'center'}}>Няма {isWalking?'пешеходни':'автомобилни'} турове</div>}
      </div>}
    </div>}
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:4}}>Език на тура</label>
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <select value={f.tourLanguage||''} onChange={e=>{const lang=e.target.value;u('tourLanguage',lang);if(catalogMatch)u('tour',lang?catalogMatch.name+' - '+lang:catalogMatch.name)}} style={{padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:13,background:'var(--card)',color:'var(--text)',minWidth:160}}>
          <option value="">-- Избери език --</option>
          {(tourLanguages||[]).slice().sort().map(l=><option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{const nl=prompt('Въведи нов език (само латиница):');if(!nl||!nl.trim())return;const lang=nl.trim();if(!/^[A-Za-z\s\-]+$/.test(lang)){alert('Моля, използвайте само латиница (A-Z).');return}if((tourLanguages||[]).some(l=>l.toLowerCase()===lang.toLowerCase())){alert('Този език вече съществува.');return}setTourLanguages(p=>[...p,lang]);u('tourLanguage',lang);if(catalogMatch)u('tour',catalogMatch.name+' - '+lang)}} title="Добави нов език">+ Нов</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{const cur=f.tourLanguage;if(!cur){alert('Първо изберете език от менюто.');return}const nl=prompt('Преименувай "'+cur+'" на (само латиница):',cur);if(!nl||!nl.trim()||nl.trim()===cur)return;const lang=nl.trim();if(!/^[A-Za-z\s\-]+$/.test(lang)){alert('Моля, използвайте само латиница (A-Z).');return}if((tourLanguages||[]).some(l=>l.toLowerCase()===lang.toLowerCase()&&l!==cur)){alert('Този език вече съществува.');return}setTourLanguages(p=>p.map(l=>l===cur?lang:l));u('tourLanguage',lang);if(catalogMatch)u('tour',catalogMatch.name+' - '+lang)}} title="Преименувай избрания език">✎</button>
        <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>{const cur=f.tourLanguage;if(!cur){alert('Първо изберете език от менюто.');return}if(!confirm('Изтрий езика "'+cur+'" от списъка?'))return;setTourLanguages(p=>p.filter(l=>l!==cur));u('tourLanguage','');if(catalogMatch)u('tour',catalogMatch.name)}} title="Изтрий избрания език">✕</button>
      </div>
    </div>
    <div className="form-grid">
      <div className="form-group"><label>Дата</label><input type="date" value={bgToISO(f.date)} onChange={e=>u('date',isoToBG(e.target.value))}/></div>
      <div className="form-group"><label>Час на взимане</label><input value={f.pickupTime} onChange={e=>u('pickupTime',e.target.value)}/></div>
      <div className="form-group"><label>Продавач</label><input value={f.supplier} onChange={e=>u('supplier',e.target.value)}/></div>
      <div className="form-group"><label>Booking #</label><input value={f.bookingNumber} onChange={e=>u('bookingNumber',e.target.value)}/></div>
      <div className="form-group"><label>Име клиент</label><input value={f.name} onChange={e=>u('name',e.target.value)}/></div>
      <div className="form-group"><label>Телефон</label><input type="tel" value={f.clientPhone||''} onChange={e=>u('clientPhone',e.target.value)}/></div>
      <div className="form-group full"><label>Мейл</label><input type="email" value={f.clientEmail||''} onChange={e=>u('clientEmail',e.target.value)}/></div>
      <div className="form-group"><label>Възрастни</label><input type="number" value={f.adults||''} onChange={e=>u('adults',+e.target.value||null)}/></div>
      <div className="form-group"><label>Деца</label><input type="number" value={f.children||''} onChange={e=>u('children',+e.target.value||null)}/></div>
      <div className="form-group full"><label>Хотел</label><input value={f.hotel} onChange={e=>u('hotel',e.target.value)}/></div>
      <div className="form-group"><label>Цена към нас € {!f.priceToUs&&<span style={{color:'var(--red)'}}>*</span>}</label><input type="number" step="0.01" value={f.priceToUs||''} onChange={e=>u('priceToUs',+e.target.value||null)} style={{borderColor:!f.priceToUs?'var(--red)':''}}/></div>
      <div className="form-group"><label>Бележка плащане</label><input value={f.payNote} onChange={e=>u('payNote',e.target.value)}/></div>
      <div className="form-group"><label>Продажна цена възрастен €</label><input type="number" step="0.01" value={f.salePrice||''} onChange={e=>u('salePrice',+e.target.value||null)}/></div>
      <div className="form-group"><label>Продажна цена дете €</label><input type="number" step="0.01" value={f.salePriceChild||''} onChange={e=>u('salePriceChild',+e.target.value||null)}/></div>
    </div>
    <h4 style={{margin:'20px 0 10px',color:'var(--text2)',fontSize:13,borderTop:'1px solid var(--border)',paddingTop:16}}>ЕКИП И ТРАНСПОРТ</h4>
    <div className="form-grid">
      <div className="form-group"><label>Гид {missingTour.includes('guide')&&<span style={{color:'var(--red)'}}>*</span>}</label><select value={f.guide||''} onChange={e=>{u('guide',e.target.value);if(f.guideIsDriver)u('driver',e.target.value)}} style={{width:'100%',borderColor:missingTour.includes('guide')?'var(--red)':'',color:rtBlocked.guides.has(f.guide)?'var(--red)':'inherit'}}><option value="">— избери гид —</option>{guides.map(g=>{const isRT=rtBlocked.guides.has(g.name);return <option key={g.id} value={g.name} style={{color:isRT?'var(--red)':'inherit',fontWeight:isRT?700:'normal'}}>{g.name}{isRT?' ● обиколен тур':''}</option>})}</select>{rtBlocked.guides.has(f.guide)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.25)',color:'var(--red)',fontWeight:600}}>⚠️ Този гид е зает от обиколен тур за тази дата!</div>}
        {needsCar&&<label style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:12,cursor:'pointer',userSelect:'none'}}><input type="checkbox" checked={!!f.guideIsDriver} onChange={e=>{const v=e.target.checked;setF(p=>({...p,guideIsDriver:v,driver:v?p.guide:''}))}}/><span style={{color:f.guideIsDriver?'var(--green)':'var(--text2)',fontWeight:f.guideIsDriver?600:400}}>Гидът шофира</span></label>}
      </div>
      {!f.guideIsDriver&&(needsDriver?<div className="form-group"><label>Шофьор {missingTour.includes('driver')&&<span style={{color:'var(--red)'}}>*</span>}</label><input value={f.driver} onChange={e=>u('driver',e.target.value)} style={{borderColor:missingTour.includes('driver')?'var(--red)':''}}/>{rtBlocked.drivers.has(f.driver)&&<div style={{marginTop:4,padding:'4px 8px',borderRadius:4,fontSize:11,background:'rgba(220,38,38,.08)',color:'var(--red)',fontWeight:600}}>🔒 Зает от обиколен тур за периода</div>}</div>
      :<div className="form-group"><label>Шофьор</label><input value={f.driver} onChange={e=>u('driver',e.target.value)}/></div>)}
      {needsCar?<div className="form-group"><label>Кола {missingTour.includes('carNumber')&&<span style={{color:'var(--red)'}}>*</span>}</label><select value={f.carNumber} onChange={e=>u('carNumber',e.target.value)} style={{width:'100%',borderColor:missingTour.includes('carNumber')?'var(--red)':'',color:rtBlocked.cars.has(f.carNumber)||slotConflict?'var(--red)':inServiceCars.has(f.carNumber)||rentalBlockedCars.has(f.carNumber)?'var(--orange)':'inherit'}}><option value="">— избери кола —</option>{vList.map(v=>{const isRT=rtBlocked.cars.has(v.name);const isSvc=inServiceCars.has(v.name);const isSlotBusy=slotBlockedCars.has(v.name);const isRented=rentalBlockedCars.has(v.name);return <option key={v.id} value={v.name} style={{color:isRT||isSlotBusy?'var(--red)':isSvc||isRented?'var(--orange)':'inherit',fontWeight:isRT||isSvc||isSlotBusy||isRented?700:'normal'}}>{v.name}{v.seats?' ('+v.seats+')':''}{isRT?' ● обиколен тур':isSvc?' ● сервиз':isSlotBusy?' ● зает '+(thisIsEvening?'вечер':'ден'):isRented?' ● наета':''}</option>})}</select>{rtBlocked.cars.has(f.carNumber)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.25)',color:'var(--red)',fontWeight:600}}>⚠️ Тази кола е заета от обиколен тур за тази дата!</div>}{inServiceCars.has(f.carNumber)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(234,88,12,.08)',border:'1px solid rgba(234,88,12,.2)',color:'var(--orange)',fontWeight:600}}>🔧 Тази кола е в сервиз за тази дата!</div>}{slotConflict&&<div style={{marginTop:6,padding:'8px 12px',borderRadius:6,fontSize:12,background:'rgba(220,38,38,.1)',border:'2px solid rgba(192,57,43,.4)',color:'var(--red)',fontWeight:700,textAlign:'center'}}>
            🚫 Тази кола вече има {slotConflict} тур на тази дата! Може да се ползва само за {thisIsEvening?'дневен':'вечерен'} тур.
          </div>}{rentalBlockedCars.has(f.carNumber)&&<div style={{marginTop:6,padding:'8px 12px',borderRadius:6,fontSize:12,background:'rgba(234,88,12,.1)',border:'1px solid rgba(234,88,12,.3)',color:'var(--orange)',fontWeight:600}}>
            🔑 Тази кола е наета и часовете се припокриват с {thisIsEvening?'вечерния':'дневния'} тур:
            {rentalBlockedCars.get(f.carNumber).map((r,i)=><div key={i} style={{marginTop:3,fontSize:11}}>• {r.client||'—'}: {r.dateFrom} ({r.timeFrom||'08:00'} – {r.timeTo||'18:00'})</div>)}
          </div>}{selectedVehicle&&vSeats&&vSeats.pax>0&&!slotConflict&&<div style={{marginTop:6,padding:'6px 10px',borderRadius:6,fontSize:12,background:remainingSeats<0?'rgba(220,38,38,.08)':remainingSeats===0?'rgba(217,119,6,.08)':'rgba(45,138,78,.08)',border:'1px solid '+(remainingSeats<0?'rgba(192,57,43,.25)':remainingSeats===0?'rgba(212,160,23,.25)':'rgba(45,138,78,.15)'),color:remainingSeats<0?'var(--red)':remainingSeats===0?'var(--yellow)':'var(--green)'}}>
            {selectedVehicle.seats} места | {guideSeatsTaken>0?<span>Гид: 1 място | </span>:guideIsDriver?<span>Гид=Шофьор | </span>:null}Туристи: {thisPax}{sameDayPax>0&&<span> + {sameDayPax} от {sameSlotTours.length} др.</span>} | <strong>{remainingSeats>=0?remainingSeats+' свободни':'Надвишени с '+Math.abs(remainingSeats)+'!'}</strong>
          </div>}{selectedVehicle&&vSeats&&vSeats.pax>0&&remainingSeats<0&&<div style={{marginTop:6,padding:'8px 12px',borderRadius:6,fontSize:12,background:'rgba(220,38,38,.1)',border:'2px solid rgba(192,57,43,.4)',color:'var(--red)',fontWeight:700,textAlign:'center'}}>
            🚫 Не може да се запази — {Math.abs(remainingSeats)} {Math.abs(remainingSeats)===1?'място':'места'} в повече! Избери по-голяма кола или намали броя туристи.
          </div>}</div>
      :<div className="form-group"><label>Кола</label><select value={f.carNumber} onChange={e=>u('carNumber',e.target.value)} style={{width:'100%'}}><option value="">— без кола —</option><option value="пешеходен">пешеходен</option>{vList.map(v=><option key={v.id} value={v.name}>{v.name}{v.seats?' ('+v.seats+')':''}</option>)}</select></div>}
      <div className="form-group"><label>Резервации направени</label><input value={f.reservationMade} onChange={e=>u('reservationMade',e.target.value)}/></div>
      <div className="form-group"><label>Мейл до гид</label><input value={f.emailSentToGuide} onChange={e=>u('emailSentToGuide',e.target.value)}/></div>
    </div>
    {missingTour.length>0&&<div style={{marginTop:12,padding:10,background:'rgba(192,57,43,.08)',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',fontSize:13,color:'var(--red)'}}>
      Липсват: {missingTour.map(k=>({guide:'Гид',driver:'Шофьор',carNumber:'Кола'}[k]||k)).join(', ')}
    </div>}
  </div>}

  {formTab==='report'&&<div>
    <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
      <div style={{background:'var(--card2)',borderRadius:8,padding:14,textAlign:'center',border:'1px solid var(--border)'}}>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Приход</div>
        <div style={{fontSize:22,fontWeight:700,color:'var(--green)'}}>{(f.priceToUs||0).toFixed(2)} €</div>
      </div>
      <div style={{background:'var(--card2)',borderRadius:8,padding:14,textAlign:'center',border:'1px solid var(--border)'}}>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Разходи</div>
        <div style={{fontSize:22,fontWeight:700,color:'var(--red)'}}>{totalExp.toFixed(2)} €</div>
      </div>
      <div style={{background:'var(--card2)',borderRadius:8,padding:14,textAlign:'center',border:'1px solid var(--border)'}}>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Баланс</div>
        <div style={{fontSize:22,fontWeight:700,color:balance>=0?'var(--green)':'var(--red)'}}>{balance.toFixed(2)} €</div>
      </div>
    </div>
    <h4 style={{margin:'0 0 12px',color:'var(--text2)',fontSize:13}}>ЗАДЪЛЖИТЕЛНИ РАЗХОДИ</h4>
    <div className="form-grid">
      <div className="form-group"><label>Хонорар гид € {missingReport.includes('expGuide')&&<span style={{color:'var(--red)'}}>*</span>}</label><input type="number" step="0.01" value={f.expGuide||''} onChange={e=>u('expGuide',+e.target.value||null)} style={{borderColor:missingReport.includes('expGuide')?'var(--red)':''}}/></div>
      {needsDriver&&<div className="form-group"><label>Хонорар шофьор € {missingReport.includes('expDriver')&&<span style={{color:'var(--red)'}}>*</span>}</label><input type="number" step="0.01" value={f.expDriver||''} onChange={e=>u('expDriver',+e.target.value||null)} style={{borderColor:missingReport.includes('expDriver')?'var(--red)':''}}/></div>}
      {!needsDriver&&<div className="form-group"><label>Хонорар шофьор €</label><input type="number" step="0.01" value={f.expDriver||''} onChange={e=>u('expDriver',+e.target.value||null)}/></div>}
      {needsCar&&<div className="form-group"><label>Гориво € {missingReport.includes('expFuel')&&<span style={{color:'var(--red)'}}>*</span>}</label><input type="number" step="0.01" value={f.expFuel||''} onChange={e=>u('expFuel',+e.target.value||null)} style={{borderColor:missingReport.includes('expFuel')?'var(--red)':''}}/></div>}
      {!needsCar&&<div className="form-group"><label>Гориво €</label><input type="number" step="0.01" value={f.expFuel||''} onChange={e=>u('expFuel',+e.target.value||null)}/></div>}
    </div>
    <h4 style={{margin:'16px 0 12px',color:'var(--text2)',fontSize:13}}>ДОПЪЛНИТЕЛНИ РАЗХОДИ</h4>
    <div className="form-grid">
      <div className="form-group"><label>Аудио гид €</label><input type="number" step="0.01" value={f.expAudioGuide||''} onChange={e=>u('expAudioGuide',+e.target.value||null)}/></div>
      <div className="form-group"><label>Входни такси €</label><input type="number" step="0.01" value={f.expEntryFees||''} onChange={e=>u('expEntryFees',+e.target.value||null)}/></div>
      <div className="form-group"><label>Обяд €</label><input type="number" step="0.01" value={f.expLunch||''} onChange={e=>u('expLunch',+e.target.value||null)}/></div>
      <div className="form-group"><label>Паркинг €</label><input type="number" step="0.01" value={f.expParking||''} onChange={e=>u('expParking',+e.target.value||null)}/></div>
    </div>
    {missingReport.length>0&&<div style={{marginTop:16,padding:12,background:'rgba(192,57,43,.08)',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',fontSize:13,color:'var(--red)'}}>
      За отчитане липсват: {missingReport.map(k=>({expGuide:'Хонорар гид',expDriver:'Хонорар шофьор',expFuel:'Гориво'}[k]||k)).join(', ')}
    </div>}
    {canReport&&st!=='reported'&&<div style={{marginTop:16,padding:12,background:'rgba(45,138,78,.08)',borderRadius:6,border:'1px solid rgba(45,138,78,.2)',fontSize:13,color:'var(--green)'}}>
      ✓ Всички задължителни полета са попълнени — турът е готов за отчитане
    </div>}
  </div>}

  <div style={{marginTop:16}}>
    <div className="form-group full"><label>Бележки</label><textarea rows={2} value={f.notes||''} onChange={e=>u('notes',e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13,resize:'vertical'}}/></div>
  </div>

  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,paddingTop:16,borderTop:'1px solid var(--border)'}}>
    <div>
      {st!=='cancelled'&&<button className="btn btn-ghost" style={{color:'var(--red)',borderColor:'rgba(192,57,43,.3)'}} onClick={()=>onSave({...f,tourStatus:'cancelled'})}>❌ Отмени</button>}
    </div>
    <div style={{display:'flex',gap:8}}>
      <button className="btn btn-ghost" onClick={onCancel}>Затвори</button>
      <button className="btn btn-primary" disabled={!capacityOk||!slotOk} style={{opacity:capacityOk&&slotOk?1:.5,cursor:capacityOk&&slotOk?'pointer':'not-allowed'}} onClick={()=>{if(capacityOk&&slotOk)onSave(f)}} title={!slotOk?'Колата вече има '+slotConflict+' тур на тази дата!':!capacityOk?'Капацитетът на колата е надвишен!':''}>💾 Запази</button>
      {st!=='reported'&&st!=='cancelled'&&<button className="btn btn-primary" style={{background:canReport&&capacityOk&&slotOk?'var(--green)':'var(--border)',cursor:canReport&&capacityOk&&slotOk?'pointer':'not-allowed'}} disabled={!canReport||!capacityOk||!slotOk} onClick={()=>{if(canReport&&capacityOk&&slotOk)onSave({...f,tourStatus:'reported'})}}>📊 Отчети тура</button>}
    </div>
  </div></div>
}

export default TourForm;
