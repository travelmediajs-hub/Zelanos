import React, { useState, useMemo } from 'react';
import { parseDate, MONTHS } from '../utils/helpers';

function RoundTripForm({data,onSave,onCancel,vehicles,guides,roundTrips,tours,carRentals,stopsCarBus}){
  const [f,setF]=useState(data);
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const [formTab,setFormTab]=useState('info');
  const toISO=(d)=>d&&d.includes('.')?d.split('.').reverse().join('-'):(d||'');
  const fromISO=(v)=>{if(!v)return '';const p=v.split('-');return p[2]+'.'+p[1]+'.'+p[0]};
  const vList=(vehicles||[]).filter(v=>v.active);
  
  const from=parseDate(f.dateFrom),to=parseDate(f.dateTo);
  const numDays=(from&&to)?Math.round((to-from)/(1000*60*60*24))+1:0;
  const nights=Math.max(0,numDays-1);
  
  // Generate days array when dates change
  React.useEffect(()=>{
    if(!from||!to||numDays<=0)return;
    setF(prev=>{
      const existing=prev.days||[];
      const days=[];
      for(let i=0;i<numDays;i++){
        const d=new Date(from);d.setDate(d.getDate()+i);
        const dateStr=String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
        const ex=existing.find(ed=>ed.date===dateStr);
        days.push(ex||{date:dateStr,hotel:'',description:'',expFuel:null,expFood:null,expEntryFees:null,expParking:null,expHotel:null,expOther:null,notes:''});
      }
      return{...prev,days,nights};
    });
  },[f.dateFrom,f.dateTo]);
  
  // Resource blocking
  const blockedResources=useMemo(()=>{
    if(!f.dateFrom||!f.dateTo)return{cars:new Set(),guides:new Set(),drivers:new Set()};
    const fr=parseDate(f.dateFrom),t=parseDate(f.dateTo);
    if(!fr||!t)return{cars:new Set(),guides:new Set(),drivers:new Set()};
    const cars=new Set(),gds=new Set(),drs=new Set();
    // Other round trips
    (roundTrips||[]).forEach(rt=>{
      if(rt.id===f.id||rt.status==='cancelled')return;
      const rf=parseDate(rt.dateFrom),rto=parseDate(rt.dateTo);
      if(!rf||!rto)return;
      if(fr<=rto&&t>=rf){
        if(rt.vehicle)cars.add(rt.vehicle);
        if(rt.guide)gds.add(rt.guide);
        if(rt.driver)drs.add(rt.driver);
      }
    });
    // Regular tours in the period
    const cur=new Date(fr);
    while(cur<=t){
      const dateStr=String(cur.getDate()).padStart(2,'0')+'.'+String(cur.getMonth()+1).padStart(2,'0')+'.'+cur.getFullYear();
      (tours||[]).forEach(tour=>{
        if(tour.date===dateStr&&tour.tourStatus!=='cancelled'){
          if(tour.carNumber)cars.add(tour.carNumber);
          if(tour.guide)gds.add(tour.guide);
          if(tour.driver)drs.add(tour.driver);
        }
      });
      cur.setDate(cur.getDate()+1);
    }
    // Rentals in the period
    (carRentals||[]).forEach(r=>{
      if(!r.dateFrom||!r.vehicle)return;
      const rf=parseDate(r.dateFrom),rto=parseDate(r.dateTo||r.dateFrom);
      if(!rf||!rto)return;
      if(fr<=rto&&t>=rf)cars.add(r.vehicle);
    });
    return{cars,guides:gds,drivers:drs};
  },[f.dateFrom,f.dateTo,f.id,roundTrips,tours,carRentals]);

  const svcBlockedCars=useMemo(()=>{
    if(!f.dateFrom||!f.dateTo||!stopsCarBus)return new Set();
    const fr=parseDate(f.dateFrom),t=parseDate(f.dateTo);
    if(!fr||!t)return new Set();
    const blocked=new Set();
    stopsCarBus.forEach(st=>{
      if(!st.vehicle)return;
      const sf=parseDate(st.startDate),sto=parseDate(st.endDate);
      if(!sf||!sto)return;
      if(fr<=sto&&t>=sf)blocked.add(st.vehicle);
    });
    return blocked;
  },[f.dateFrom,f.dateTo,stopsCarBus]);

  const totalExp=(f.days||[]).reduce((s,d)=>(s+(d.expFuel||0)+(d.expFood||0)+(d.expEntryFees||0)+(d.expParking||0)+(d.expHotel||0)+(d.expOther||0)),0);
  const balance=(f.totalPrice||0)-totalExp;

  const updateDay=(idx,key,val)=>{
    setF(prev=>{
      const days=[...prev.days];
      days[idx]={...days[idx],[key]:val};
      return{...prev,days};
    });
  };

  const DNAMES=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
  const dayName=(dateStr)=>{const d=parseDate(dateStr);return d?DNAMES[d.getDay()]:''};

  return <div>
    <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
      <div style={{flex:1}}>
        <select value={f.status||'planned'} onChange={e=>u('status',e.target.value)} style={{padding:'6px 12px',borderRadius:6,fontSize:13,fontWeight:600,border:'1px solid var(--border)',cursor:'pointer',
          background:f.status==='active'?'rgba(79,70,229,.08)':f.status==='completed'?'rgba(0,0,0,.06)':f.status==='cancelled'?'rgba(220,38,38,.1)':'rgba(5,150,105,.08)',
          color:f.status==='active'?'var(--accent)':f.status==='completed'?'var(--text2)':f.status==='cancelled'?'var(--red)':'var(--green)'}}>
          <option value="planned">📌 Планиран</option>
          <option value="active">🚐 Активен</option>
          <option value="completed">✅ Завършен</option>
          <option value="cancelled">❌ Отменен</option>
        </select>
      </div>
      {numDays>0&&<div style={{fontSize:13,color:'var(--text2)',fontWeight:600}}>{numDays} дни / {nights} нощувки</div>}
    </div>
    
    <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)'}}>
      {[{k:'info',l:'📋 Основни'},{k:'days',l:'📅 Дни ('+numDays+')'},{k:'finance',l:'💰 Финанси'}].map(tab=>
        <button key={tab.k} type="button" onClick={()=>setFormTab(tab.k)} style={{padding:'10px 20px',fontSize:13,fontWeight:600,border:'none',cursor:'pointer',
          background:'transparent',color:formTab===tab.k?'var(--accent)':'var(--text2)',
          borderBottom:formTab===tab.k?'2px solid var(--accent)':'2px solid transparent',marginBottom:'-2px',transition:'all .15s'}}>
          {tab.l}
        </button>
      )}
    </div>

    {formTab==='info'&&<div>
      <div className="form-grid">
        <div className="form-group full"><label>Име на тура</label><input value={f.name||''} onChange={e=>u('name',e.target.value)} placeholder="напр. Тракийска обиколка 5 дни"/></div>
        <div className="form-group"><label>От дата</label><input type="date" value={toISO(f.dateFrom)} onChange={e=>u('dateFrom',fromISO(e.target.value))}/></div>
        <div className="form-group"><label>До дата</label><input type="date" value={toISO(f.dateTo)} onChange={e=>u('dateTo',fromISO(e.target.value))}/></div>
        <div className="form-group full"><label>Маршрут</label><input value={f.route||''} onChange={e=>u('route',e.target.value)} placeholder="напр. Пловдив → Казанлък → В. Търново → София"/></div>
      </div>
      <h4 style={{margin:'20px 0 10px',color:'var(--text2)',fontSize:13,borderTop:'1px solid var(--border)',paddingTop:16}}>КЛИЕНТ</h4>
      <div className="form-grid">
        <div className="form-group"><label>Име клиент</label><input value={f.client||''} onChange={e=>u('client',e.target.value)}/></div>
        <div className="form-group"><label>Телефон</label><input type="tel" value={f.clientPhone||''} onChange={e=>u('clientPhone',e.target.value)}/></div>
        <div className="form-group full"><label>Мейл</label><input type="email" value={f.clientEmail||''} onChange={e=>u('clientEmail',e.target.value)}/></div>
        <div className="form-group"><label>Възрастни</label><input type="number" value={f.adults||''} onChange={e=>u('adults',+e.target.value||null)}/></div>
        <div className="form-group"><label>Деца</label><input type="number" value={f.children||''} onChange={e=>u('children',+e.target.value||null)}/></div>
      </div>
      <h4 style={{margin:'20px 0 10px',color:'var(--text2)',fontSize:13,borderTop:'1px solid var(--border)',paddingTop:16}}>ЕКИП И ТРАНСПОРТ</h4>
      {f.dateFrom&&f.dateTo&&<div style={{marginBottom:12,padding:10,background:'rgba(79,70,229,.04)',borderRadius:6,border:'1px solid rgba(79,70,229,.08)',fontSize:12,color:'var(--text2)'}}>
        🔒 Ресурсите ще бъдат блокирани за целия период {f.dateFrom} — {f.dateTo}. Няма да могат да се използват за други турове или наеми.
      </div>}
      <div className="form-grid">
        <div className="form-group full"><label>Превозно средство</label>
          <select value={f.vehicle||''} onChange={e=>u('vehicle',e.target.value)} style={{width:'100%',color:blockedResources.cars.has(f.vehicle)?'var(--red)':svcBlockedCars.has(f.vehicle)?'var(--orange)':'inherit'}}>
            <option value="">— избери кола —</option>
            {vList.map(v=>{const isRT=blockedResources.cars.has(v.name);const isSvc=svcBlockedCars.has(v.name);return <option key={v.id} value={v.name} style={{color:isRT?'var(--red)':isSvc?'var(--orange)':'inherit',fontWeight:isRT||isSvc?700:'normal'}}>{v.name}{v.seats?' ('+v.seats+')':''}{isRT?' ● зает':isSvc?' ● сервиз':''}</option>})}
          </select>
          {blockedResources.cars.has(f.vehicle)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.25)',color:'var(--red)',fontWeight:600}}>⚠️ Тази кола е заета за периода!</div>}
          {svcBlockedCars.has(f.vehicle)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(234,88,12,.08)',border:'1px solid rgba(234,88,12,.2)',color:'var(--orange)',fontWeight:600}}>🔧 Тази кола е в сервиз за периода!</div>}
        </div>
        <div className="form-group"><label>Гид</label>
          <select value={f.guide||''} onChange={e=>u('guide',e.target.value)} style={{width:'100%',color:blockedResources.guides.has(f.guide)?'var(--red)':'inherit'}}>
            <option value="">— избери гид —</option>
            {guides.map(g=>{const isRT=blockedResources.guides.has(g.name);return <option key={g.id} value={g.name} style={{color:isRT?'var(--red)':'inherit',fontWeight:isRT?700:'normal'}}>{g.name}{isRT?' ● зает':''}</option>})}
          </select>
          {blockedResources.guides.has(f.guide)&&<div style={{marginTop:4,padding:'6px 10px',borderRadius:6,fontSize:11,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.25)',color:'var(--red)',fontWeight:600}}>⚠️ Този гид е зает за периода!</div>}
        </div>
        <div className="form-group"><label>Шофьор</label><input value={f.driver||''} onChange={e=>u('driver',e.target.value)}/></div>
      </div>
      <div className="form-group full"><label>Обща бележка</label><textarea rows={2} value={f.notes||''} onChange={e=>u('notes',e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13}}/></div>
    </div>}

    {formTab==='days'&&<div>
      {numDays===0&&<div style={{padding:30,textAlign:'center',color:'var(--text2)'}}>Избери начална и крайна дата за да се генерират дните.</div>}
      {numDays>0&&<div className="rt-timeline">
        {(f.days||[]).map((day,i)=>{
          const isFirst=i===0,isLast=i===(f.days||[]).length-1;
          return <div key={i} className="rt-day-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <strong style={{fontSize:15,color:'var(--accent)'}}>Ден {i+1}</strong>
                <span style={{marginLeft:8,fontSize:13,color:'var(--text2)'}}>{day.date} ({dayName(day.date)})</span>
                {isFirst&&<span className="rt-badge" style={{marginLeft:8,background:'rgba(5,150,105,.08)',color:'var(--green)'}}>Начало</span>}
                {isLast&&<span className="rt-badge" style={{marginLeft:8,background:'rgba(220,38,38,.08)',color:'var(--red)'}}>Край</span>}
              </div>
              {!isLast&&<span style={{fontSize:12,color:'var(--text2)'}}>🏨 Нощ {i+1}</span>}
            </div>
            <div className="form-grid">
              <div className="form-group full"><label>Описание / маршрут за деня</label><input value={day.description||''} onChange={e=>updateDay(i,'description',e.target.value)} placeholder="Какво се прави този ден..."/></div>
              {!isLast&&<div className="form-group full"><label>Хотел</label><input value={day.hotel||''} onChange={e=>updateDay(i,'hotel',e.target.value)} placeholder="Име на хотел"/></div>}
              <div className="form-group"><label>Гориво €</label><input type="number" step="0.01" value={day.expFuel||''} onChange={e=>updateDay(i,'expFuel',+e.target.value||null)}/></div>
              <div className="form-group"><label>Храна €</label><input type="number" step="0.01" value={day.expFood||''} onChange={e=>updateDay(i,'expFood',+e.target.value||null)}/></div>
              <div className="form-group"><label>Входни такси €</label><input type="number" step="0.01" value={day.expEntryFees||''} onChange={e=>updateDay(i,'expEntryFees',+e.target.value||null)}/></div>
              <div className="form-group"><label>Паркинг €</label><input type="number" step="0.01" value={day.expParking||''} onChange={e=>updateDay(i,'expParking',+e.target.value||null)}/></div>
              <div className="form-group"><label>Хотел €</label><input type="number" step="0.01" value={day.expHotel||''} onChange={e=>updateDay(i,'expHotel',+e.target.value||null)}/></div>
              <div className="form-group"><label>Други €</label><input type="number" step="0.01" value={day.expOther||''} onChange={e=>updateDay(i,'expOther',+e.target.value||null)}/></div>
            </div>
            <div className="form-group full"><label>Бележки</label><input value={day.notes||''} onChange={e=>updateDay(i,'notes',e.target.value)}/></div>
          </div>})}
      </div>}
    </div>}

    {formTab==='finance'&&<div>
      <div className="form-grid">
        <div className="form-group"><label>Обща цена €</label><input type="number" step="0.01" value={f.totalPrice||''} onChange={e=>u('totalPrice',+e.target.value||null)}/></div>
        <div className="form-group"><label>Цена на ден €</label>
          <div style={{padding:'8px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--card2)',fontSize:14,fontWeight:700,color:'var(--accent)'}}>{numDays>0?((f.totalPrice||0)/numDays).toFixed(2):'—'}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,margin:'20px 0'}}>
        <div style={{background:'var(--card2)',borderRadius:8,padding:14,textAlign:'center',border:'1px solid var(--border)'}}>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Приход</div>
          <div style={{fontSize:22,fontWeight:700,color:'var(--green)'}}>{(f.totalPrice||0).toFixed(2)} €</div>
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
      {(f.days||[]).length>0&&<div>
        <h4 style={{margin:'12px 0 8px',color:'var(--text2)',fontSize:13}}>Разходи по дни</h4>
        <div className="scroll-table"><table><thead><tr>
          <th>Ден</th><th>Дата</th><th>Гориво</th><th>Храна</th><th>Входни</th><th>Паркинг</th><th>Хотел</th><th>Други</th><th>Общо</th>
        </tr></thead>
        <tbody>{(f.days||[]).map((d,i)=>{
          const dayTotal=(d.expFuel||0)+(d.expFood||0)+(d.expEntryFees||0)+(d.expParking||0)+(d.expHotel||0)+(d.expOther||0);
          return <tr key={i}>
            <td><strong>{i+1}</strong></td><td>{d.date}</td>
            <td style={{textAlign:'right'}}>{d.expFuel||'—'}</td>
            <td style={{textAlign:'right'}}>{d.expFood||'—'}</td>
            <td style={{textAlign:'right'}}>{d.expEntryFees||'—'}</td>
            <td style={{textAlign:'right'}}>{d.expParking||'—'}</td>
            <td style={{textAlign:'right'}}>{d.expHotel||'—'}</td>
            <td style={{textAlign:'right'}}>{d.expOther||'—'}</td>
            <td style={{textAlign:'right',fontWeight:700}}>{dayTotal>0?dayTotal.toFixed(2):'—'}</td>
          </tr>})}
          <tr style={{borderTop:'2px solid var(--border)',fontWeight:700}}>
            <td colSpan={2}>ОБЩО</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expFuel||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expFood||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expEntryFees||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expParking||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expHotel||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right'}}>{(f.days||[]).reduce((s,d)=>s+(d.expOther||0),0).toFixed(2)}</td>
            <td style={{textAlign:'right',color:'var(--red)'}}>{totalExp.toFixed(2)}</td>
          </tr>
        </tbody></table></div>
      </div>}
    </div>}

    <div className="form-actions" style={{marginTop:16}}>
      <button className="btn btn-ghost" onClick={onCancel}>Отказ</button>
      <button className="btn btn-primary" onClick={()=>onSave(f)}>Запази</button>
    </div>
  </div>
}

export default RoundTripForm;
