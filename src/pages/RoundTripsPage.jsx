import React, { useState, useMemo } from 'react';
import { Modal, ConfirmModal } from '../components/Modal';
import { genId, parseDate, MONTHS } from '../utils/helpers';
import RoundTripForm from './RoundTripForm';

function RoundTripsPage({roundTrips,setRoundTrips,vehicles,guides,tours,carRentals,stopsCarBus,openTarget,onOpenHandled}){
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState(null);
  const [delId,setDelId]=useState(null);
  // Дълбока навигация от таблото: отваря конкретен обиколен тур за редакция
  React.useEffect(()=>{
    if(!openTarget||!openTarget.id)return;
    const rt=roundTrips.find(x=>x.id===openTarget.id);
    if(rt)setEditing({...rt});
    onOpenHandled&&onOpenHandled();
  },[openTarget]);
  const [viewMode,setViewMode]=useState('list');
  
  const filtered=useMemo(()=>{
    const s=search.toLowerCase();
    return !s?roundTrips:roundTrips.filter(rt=>
      (rt.name||'').toLowerCase().includes(s)||
      (rt.client||'').toLowerCase().includes(s)||
      (rt.vehicle||'').toLowerCase().includes(s)||
      (rt.guide||'').toLowerCase().includes(s)||
      (rt.dateFrom||'').includes(s)
    );
  },[roundTrips,search]);

  const blank={
    name:'',dateFrom:'',dateTo:'',vehicle:'',guide:'',driver:'',
    client:'',clientPhone:'',clientEmail:'',
    adults:null,children:null,
    totalPrice:null,pricePerDay:null,
    status:'planned',
    route:'',notes:'',
    days:[]
  };

  const save=(form)=>{
    // Auto-generate day entries
    const from=parseDate(form.dateFrom),to=parseDate(form.dateTo);
    let numDays=0;
    if(from&&to){numDays=Math.round((to-from)/(1000*60*60*24))+1}
    // Keep existing days or create new ones
    const existingDays=form.days||[];
    const days=[];
    for(let i=0;i<numDays;i++){
      const d=new Date(from);d.setDate(d.getDate()+i);
      const dateStr=String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
      const existing=existingDays.find(ed=>ed.date===dateStr);
      days.push(existing||{date:dateStr,hotel:'',description:'',expFuel:null,expFood:null,expEntryFees:null,expParking:null,expHotel:null,expOther:null,notes:''});
    }
    const updated={...form,days,nights:Math.max(0,numDays-1)};
    if(form.id){setRoundTrips(p=>p.map(r=>r.id===form.id?updated:r))}
    else{setRoundTrips(p=>[...p,{...updated,id:genId(p)}])}
    setEditing(null);
  };

  const del=()=>{setRoundTrips(p=>p.filter(r=>r.id!==delId));setDelId(null)};
  
  const totalRevenue=filtered.reduce((a,rt)=>a+(rt.totalPrice||0),0);
  const totalExpenses=filtered.reduce((a,rt)=>{
    return a+(rt.days||[]).reduce((s,d)=>(s+(d.expFuel||0)+(d.expFood||0)+(d.expEntryFees||0)+(d.expParking||0)+(d.expHotel||0)+(d.expOther||0)),0);
  },0);

  // Check for resource conflicts
  const hasConflict=(rt)=>{
    if(!rt.dateFrom||!rt.dateTo)return false;
    const from=parseDate(rt.dateFrom),to=parseDate(rt.dateTo);
    if(!from||!to)return false;
    // Check against other round trips
    for(const other of roundTrips){
      if(other.id===rt.id||other.status==='cancelled')continue;
      const of=parseDate(other.dateFrom),ot=parseDate(other.dateTo);
      if(!of||!ot)continue;
      if(from<=ot&&to>=of){
        if(rt.vehicle&&rt.vehicle===other.vehicle)return'Кола '+rt.vehicle+' е заета от друг обиколен тур';
        if(rt.guide&&rt.guide===other.guide)return'Гид '+rt.guide+' е зает от друг обиколен тур';
        if(rt.driver&&rt.driver===other.driver)return'Шофьор '+rt.driver+' е зает от друг обиколен тур';
      }
    }
    // Check against regular tours
    const cur=new Date(from);
    while(cur<=to){
      const dateStr=String(cur.getDate()).padStart(2,'0')+'.'+String(cur.getMonth()+1).padStart(2,'0')+'.'+cur.getFullYear();
      for(const t of tours){
        if(t.date===dateStr&&t.tourStatus!=='cancelled'){
          if(rt.vehicle&&t.carNumber===rt.vehicle)return'Кола конфликт с тур на '+dateStr;
          if(rt.guide&&t.guide===rt.guide)return'Гид конфликт с тур на '+dateStr;
          if(rt.driver&&t.driver===rt.driver)return'Шофьор конфликт с тур на '+dateStr;
        }
      }
      // Check against rentals
      for(const r of (carRentals||[])){
        if(!r.dateFrom||!r.vehicle)continue;
        const rf=parseDate(r.dateFrom),rto=parseDate(r.dateTo||r.dateFrom);
        if(rf&&rto&&cur>=rf&&cur<=rto&&rt.vehicle===r.vehicle)return'Кола заета от рент-а-кар на '+dateStr;
      }
      cur.setDate(cur.getDate()+1);
    }
    return false;
  };

  const statusColors={planned:'var(--green)',active:'var(--accent)',completed:'var(--text2)',cancelled:'var(--red)'};
  const statusLabels={planned:'📌 Планиран',active:'🚐 Активен',completed:'✅ Завършен',cancelled:'❌ Отменен'};

  return <div>
    <div className="topbar">
      <h2>{'🌍'} Обиколни турове ({filtered.length})</h2>
      <div style={{display:'flex',gap:8}}>
        <input className="search-box" placeholder="Търси..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Нов обиколен тур</button>
      </div>
    </div>
    <div className="stats-row">
      <div className="stat-card"><div className="label">Общо турове</div><div className="value blue">{filtered.length}</div></div>
      <div className="stat-card"><div className="label">Приход</div><div className="value green">{totalRevenue.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Разходи</div><div className="value" style={{color:'var(--red)'}}>{totalExpenses.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Баланс</div><div className="value" style={{color:totalRevenue-totalExpenses>=0?'var(--green)':'var(--red)'}}>{(totalRevenue-totalExpenses).toFixed(2)} €</div></div>
    </div>
    <div className="scroll-table"><table><thead><tr>
      <th></th><th>Име</th><th>Клиент</th><th>От</th><th>До</th><th>Нощ.</th>
      <th>Кола</th><th>Гид</th><th>Шофьор</th>
      <th>Цена €</th><th>Разходи €</th><th>Баланс €</th><th>Статус</th><th></th>
    </tr></thead>
    <tbody>{filtered.map(rt=>{
      const conflict=hasConflict(rt);
      const exp=(rt.days||[]).reduce((s,d)=>(s+(d.expFuel||0)+(d.expFood||0)+(d.expEntryFees||0)+(d.expParking||0)+(d.expHotel||0)+(d.expOther||0)),0);
      const bal=(rt.totalPrice||0)-exp;
      return <tr key={rt.id} style={{background:conflict?'rgba(192,57,43,.05)':''}}>
        <td>{conflict&&<span title={conflict} style={{color:'var(--red)',cursor:'help'}}>⚠️</span>}</td>
        <td><strong>{rt.name||'—'}</strong></td>
        <td>{rt.client}</td>
        <td style={{whiteSpace:'nowrap'}}>{rt.dateFrom}</td>
        <td style={{whiteSpace:'nowrap'}}>{rt.dateTo}</td>
        <td><strong>{rt.nights||0}</strong></td>
        <td>{rt.vehicle}</td>
        <td>{rt.guide}</td>
        <td>{rt.driver}</td>
        <td style={{textAlign:'right',color:'var(--green)',fontWeight:700}}>{rt.totalPrice||0}</td>
        <td style={{textAlign:'right',color:'var(--red)'}}>{exp.toFixed(2)}</td>
        <td style={{textAlign:'right',fontWeight:700,color:bal>=0?'var(--green)':'var(--red)'}}>{bal.toFixed(2)}</td>
        <td><span className="rt-badge" style={{background:rt.status==='cancelled'?'rgba(220,38,38,.1)':rt.status==='completed'?'rgba(0,0,0,.06)':rt.status==='active'?'rgba(79,70,229,.08)':'rgba(5,150,105,.08)',color:statusColors[rt.status]||'var(--text2)'}}>{statusLabels[rt.status]||rt.status}</span></td>
        <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...rt})}>✎</button>{' '}
          <button className="btn btn-danger btn-sm" onClick={()=>setDelId(rt.id)}>✕</button></td>
      </tr>})}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай обиколен тур":"Нов обиколен тур"} onClose={()=>setEditing(null)}>
      <RoundTripForm data={editing} onSave={save} onCancel={()=>setEditing(null)} vehicles={vehicles} guides={guides} roundTrips={roundTrips} tours={tours} carRentals={carRentals} stopsCarBus={stopsCarBus}/>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий обиколен тур?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default RoundTripsPage;
