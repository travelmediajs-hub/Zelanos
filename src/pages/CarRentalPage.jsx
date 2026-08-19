import { useState, useMemo, useEffect } from 'react';
import { Modal, ConfirmModal } from '../components/Modal';
import { genId, parseDate, calcDays, bgToISO, isoToBG, serviceCoversDay } from '../utils/helpers';

function CarRentalPage({rentals,setRentals,vehicles,roundTrips,stopsCarBus,tours,serviceRecords,openTarget,onOpenHandled}){
  const [search,setSearch]=useState('');const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  // Дълбока навигация от таблото: отваря конкретен наем за редакция
  useEffect(()=>{
    if(!openTarget||!openTarget.id)return;
    const r=rentals.find(x=>x.id===openTarget.id);
    if(r)setEditing({...r});
    onOpenHandled&&onOpenHandled();
  },[openTarget]);
  const filtered=useMemo(()=>{const s=search.toLowerCase();return !s?rentals:rentals.filter(r=>(r.client||'').toLowerCase().includes(s)||(r.vehicle||'').toLowerCase().includes(s)||(r.dateFrom||'').includes(s))},[rentals,search]);
  const totalRev=filtered.reduce((a,r)=>a+(r.totalPrice||0),0);
  const blank={dateFrom:'',dateTo:'',timeFrom:'08:00',timeTo:'18:00',client:'',clientPhone:'',clientEmail:'',vehicle:'',pricePerDay:null,days:0,totalPrice:null,notes:''};
  const save=(form)=>{
    const days=calcDays(form.dateFrom,form.dateTo||form.dateFrom);
    const total=days*(form.pricePerDay||0);
    const updated={...form,dateTo:form.dateTo||form.dateFrom,days,totalPrice:Math.round(total*100)/100};
    if(form.id){setRentals(p=>p.map(r=>r.id===form.id?updated:r))}else{setRentals(p=>[...p,{...updated,id:genId(p)}])};setEditing(null)
  };
  const del=()=>{setRentals(p=>p.filter(r=>r.id!==delId));setDelId(null)};
  const vList=(vehicles||[]).filter(v=>v.active);
  const fmtTime=(r)=>(r.timeFrom||'08:00')+' – '+(r.timeTo||'18:00');
  return <div>
    <div className="topbar"><h2>Наем автомобил ({filtered.length})</h2><div style={{display:'flex',gap:8}}>
      <input className="search-box" placeholder="Търси клиент, кола..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Нов наем</button>
    </div></div>
    <div className="stats-row">
      <div className="stat-card"><div className="label">Наеми</div><div className="value blue">{filtered.length}</div></div>
      <div className="stat-card"><div className="label">Общо приход</div><div className="value green">{totalRev.toFixed(2)} €</div></div>
    </div>
    <div className="scroll-table"><table><thead><tr><th>Кола</th><th>Клиент</th><th>Телефон</th><th>Дата</th><th>Часове</th><th>Дни</th><th>€/ден</th><th>Общо €</th><th>Бележки</th><th></th></tr></thead>
    <tbody>{filtered.map(r=>{const days=calcDays(r.dateFrom,r.dateTo||r.dateFrom);const isShort=(r.timeFrom&&r.timeTo&&r.timeFrom!=='08:00'||r.timeTo!=='18:00');return <tr key={r.id}>
      <td>{r.vehicle}</td><td><strong>{r.client}</strong></td><td>{r.clientPhone}</td>
      <td style={{whiteSpace:'nowrap'}}>{r.dateFrom}{r.dateTo&&r.dateTo!==r.dateFrom?' → '+r.dateTo:''}</td>
      <td style={{whiteSpace:'nowrap'}}><span className={isShort?'badge badge-orange':'badge badge-blue'}>{fmtTime(r)}</span></td>
      <td><strong>{days}</strong></td><td>{r.pricePerDay}</td>
      <td style={{fontWeight:700,color:'var(--green)'}}>{r.totalPrice}</td>
      <td title={r.notes} style={{maxWidth:150}}>{r.notes}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...r})}>✎</button>{' '}
        <button className="btn btn-danger btn-sm" onClick={()=>setDelId(r.id)}>✕</button></td>
    </tr>})}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай наем":"Нов наем"} onClose={()=>setEditing(null)}>
      <CarRentalForm data={editing} onSave={save} onCancel={()=>setEditing(null)} vehicles={vList} roundTrips={roundTrips} stopsCarBus={stopsCarBus} allRentals={rentals} tours={tours} serviceRecords={serviceRecords}/>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий наем?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

function CarRentalForm({data,onSave,onCancel,vehicles,roundTrips,stopsCarBus,allRentals,tours,serviceRecords}){
  const [f,setF]=useState(data);const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const days=calcDays(f.dateFrom,f.dateTo||f.dateFrom);
  const timeToMin=(t)=>{if(!t)return 0;const p=t.split(':');return(parseInt(p[0])||0)*60+(parseInt(p[1])||0)};
  const timesOverlap=(a1,a2,b1,b2)=>{const am1=timeToMin(a1),am2=timeToMin(a2),bm1=timeToMin(b1),bm2=timeToMin(b2);return am1<bm2&&bm1<am2};
  // Check conflicts with other rentals on same car
  const rentalConflicts=useMemo(()=>{
    if(!f.vehicle||!f.dateFrom)return[];
    const from=parseDate(f.dateFrom),to=parseDate(f.dateTo||f.dateFrom);
    if(!from)return[];
    return(allRentals||[]).filter(r=>{
      if(r.id===f.id||r.vehicle!==f.vehicle)return false;
      const rf=parseDate(r.dateFrom),rto=parseDate(r.dateTo||r.dateFrom);
      if(!rf||!rto)return false;
      if(from>rto||(to||from)<rf)return false;
      return timesOverlap(f.timeFrom||'08:00',f.timeTo||'18:00',r.timeFrom||'08:00',r.timeTo||'18:00');
    });
  },[f.vehicle,f.dateFrom,f.dateTo,f.timeFrom,f.timeTo,f.id,allRentals]);
  // Check tour conflicts
  const tourConflicts=useMemo(()=>{
    if(!f.vehicle||!f.dateFrom||!tours)return[];
    const from=parseDate(f.dateFrom),to=parseDate(f.dateTo||f.dateFrom);
    if(!from)return[];
    const rentalFrom=timeToMin(f.timeFrom||'08:00'),rentalTo=timeToMin(f.timeTo||'18:00');
    return tours.filter(t=>{
      if(!t.carNumber||t.carNumber!==f.vehicle||(t.tourStatus||'reservation')==='cancelled')return false;
      const td=parseDate(t.date);if(!td)return false;
      if(td<from||(to&&td>to))return false;
      // evening tours start after 17:00
      if(t.isEvening){return rentalTo>17*60}
      // day tours are roughly 08:00-17:00
      return rentalFrom<17*60&&rentalTo>8*60;
    });
  },[f.vehicle,f.dateFrom,f.dateTo,f.timeFrom,f.timeTo,tours]);
  const rtBlockedCars=useMemo(()=>{
    if(!f.dateFrom||!roundTrips)return new Set();
    const from=parseDate(f.dateFrom),to=parseDate(f.dateTo||f.dateFrom);
    if(!from)return new Set();
    const blocked=new Set();
    roundTrips.forEach(rt=>{
      if(rt.status==='cancelled'||!rt.vehicle)return;
      const rf=parseDate(rt.dateFrom),rto=parseDate(rt.dateTo);
      if(!rf||!rto)return;
      if(from<=rto&&(to||from)>=rf)blocked.add(rt.vehicle);
    });
    return blocked;
  },[f.dateFrom,f.dateTo,roundTrips]);
  const svcBlockedCars=useMemo(()=>{
    if(!f.dateFrom)return new Set();
    const from=parseDate(f.dateFrom),to=parseDate(f.dateTo||f.dateFrom);
    if(!from)return new Set();
    const blocked=new Set();
    (stopsCarBus||[]).forEach(st=>{
      if(!st.vehicle)return;
      const sf=parseDate(st.startDate),sto=parseDate(st.endDate);
      if(!sf||!sto)return;
      if(from<=sto&&(to||from)>=sf)blocked.add(st.vehicle);
    });
    // Коли в сервиз (отворен запис = блокира безсрочно)
    (serviceRecords||[]).forEach(sr=>{
      if(!sr.carName)return;
      const sf=parseDate(sr.date);if(!sf)return;
      const sto=parseDate(sr.dateOut); // null = още в сервиз
      if((to||from)>=sf&&(!sto||from<=sto))blocked.add(sr.carName);
    });
    return blocked;
  },[f.dateFrom,f.dateTo,stopsCarBus,serviceRecords]);
  const total=days*(f.pricePerDay||0);
  const hasConflicts=rentalConflicts.length>0;
  return <div>
    <div className="form-grid">
      <div className="form-group full"><label>Автомобил</label><select value={f.vehicle||''} onChange={e=>u('vehicle',e.target.value)} style={{width:'100%'}}>
        <option value="">— избери кола —</option>{vehicles.map(v=>{const isRT=rtBlockedCars.has(v.name);const isSvc=svcBlockedCars.has(v.name);return <option key={v.id} value={v.name} style={{color:isRT?'var(--red)':isSvc?'var(--orange)':'inherit',fontWeight:isRT||isSvc?700:'normal'}}>{v.name}{v.seats?' ('+v.seats+')':''}{isRT?' ● обиколен тур':isSvc?' ● сервиз':''}</option>})}
      </select>
      {rtBlockedCars.has(f.vehicle)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.25)',color:'var(--red)',fontWeight:600}}>⚠️ Тази кола е заета от обиколен тур за периода!</div>}
      {svcBlockedCars.has(f.vehicle)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(234,88,12,.08)',border:'1px solid rgba(234,88,12,.2)',color:'var(--orange)',fontWeight:600}}>🔧 Тази кола е в сервиз за периода!</div>}
      </div>
      <div className="form-group"><label>От дата</label><input type="date" value={bgToISO(f.dateFrom)} onChange={e=>u('dateFrom',isoToBG(e.target.value))}/></div>
      <div className="form-group"><label>До дата</label><input type="date" value={bgToISO(f.dateTo)} onChange={e=>u('dateTo',isoToBG(e.target.value))}/></div>
      <div className="form-group"><label>Начален час</label><input type="time" value={f.timeFrom||'08:00'} onChange={e=>u('timeFrom',e.target.value)}/></div>
      <div className="form-group"><label>Краен час</label><input type="time" value={f.timeTo||'18:00'} onChange={e=>u('timeTo',e.target.value)}/></div>
      {rentalConflicts.length>0&&<div className="form-group full"><div style={{padding:'8px 12px',borderRadius:6,fontSize:12,background:'rgba(220,38,38,.1)',border:'2px solid rgba(192,57,43,.4)',color:'var(--red)',fontWeight:600}}>
        🚫 Конфликт! Тази кола вече е наета в припокриващи се часове:
        {rentalConflicts.map((r,i)=><div key={i} style={{marginTop:4,fontSize:11}}>• {r.client||'—'}: {r.dateFrom}{r.dateTo&&r.dateTo!==r.dateFrom?' → '+r.dateTo:''} ({r.timeFrom||'08:00'} – {r.timeTo||'18:00'})</div>)}
      </div></div>}
      {tourConflicts.length>0&&<div className="form-group full"><div style={{padding:'8px 12px',borderRadius:6,fontSize:12,background:'rgba(234,88,12,.1)',border:'1px solid rgba(234,88,12,.3)',color:'var(--orange)',fontWeight:600}}>
        ⚠️ Внимание! Тази кола има турове в тези дати:
        {tourConflicts.map((t,i)=><div key={i} style={{marginTop:4,fontSize:11}}>• {t.date} — {t.tour} {t.isEvening?'🌙 вечерен':'☀️ дневен'}</div>)}
      </div></div>}
      <div className="form-group"><label>Клиент</label><input value={f.client||''} onChange={e=>u('client',e.target.value)}/></div>
      <div className="form-group"><label>Телефон</label><input type="tel" value={f.clientPhone||''} onChange={e=>u('clientPhone',e.target.value)}/></div>
      <div className="form-group full"><label>Мейл</label><input type="email" value={f.clientEmail||''} onChange={e=>u('clientEmail',e.target.value)}/></div>
      <div className="form-group"><label>Цена на ден €</label><input type="number" step="0.01" value={f.pricePerDay||''} onChange={e=>u('pricePerDay',+e.target.value||null)}/></div>
      <div className="form-group"><label>Брой дни</label><div style={{padding:'8px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--card2)',fontSize:14,fontWeight:700,color:'var(--accent)'}}>{days}</div></div>
    </div>
    <div style={{margin:'16px 0',padding:14,background:'var(--card2)',borderRadius:8,border:'1px solid var(--border)',textAlign:'center'}}>
      <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Обща сума</div>
      <div style={{fontSize:26,fontWeight:700,color:'var(--green)'}}>{total.toFixed(2)} €</div>
      <div style={{fontSize:12,color:'var(--text2)'}}>{days} дни × {f.pricePerDay||0} €/ден</div>
    </div>
    <div className="form-group full"><label>Бележки</label><textarea rows={2} value={f.notes||''} onChange={e=>u('notes',e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13}}/></div>
    <div className="form-actions" style={{marginTop:16}}><button className="btn btn-ghost" onClick={onCancel}>Отказ</button><button className="btn btn-primary" disabled={hasConflicts} style={{opacity:hasConflicts?.5:1,cursor:hasConflicts?'not-allowed':'pointer'}} onClick={()=>{if(!hasConflicts)onSave(f)}} title={hasConflicts?'Има конфликт с друг наем!':''}>Запази</button></div>
  </div>
}

export { CarRentalForm };
export default CarRentalPage;
