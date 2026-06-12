import { useState, useMemo } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId, parseDate, parseDateISO, presetRange, MONTHS } from '../utils/helpers'

function FleetPage({tours,fuel,fines,carTasks,stopsCarBus,vehicles,setVehicles,serviceRecords,setServiceRecords}){
  const [selectedCar,setSelectedCar]=useState(null);
  const [tab,setTab]=useState('overview');
  const [serviceEditing,setServiceEditing]=useState(null);
  const [delServiceId,setDelServiceId]=useState(null);
  const [vehicleEditing,setVehicleEditing]=useState(null);
  const [delVehicleId,setDelVehicleId]=useState(null);
  const [showRegistry,setShowRegistry]=useState(false);
  const [preset,setPreset]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const applyPreset=(p)=>{setPreset(p);const r=presetRange(p);setDateFrom(r.from);setDateTo(r.to)};
  const filtered=useMemo(()=>{if(!dateFrom&&!dateTo)return tours;const from=dateFrom?parseDateISO(dateFrom):null;const to=dateTo?parseDateISO(dateTo):null;
    return tours.filter(t=>{const d=parseDate(t.date);if(!d)return false;if(from&&d<from)return false;if(to&&d>to)return false;return true})},[tours,dateFrom,dateTo]);

  // Build car registry from all data sources
  const cars=useMemo(()=>{
    const map={};
    // From tours
    filtered.forEach(t=>{
      const c=(t.carNumber||'').trim();
      const label=!c?'Без кола':c;
      if(!map[label])map[label]={name:label,tourDays:new Set(),bookings:0,pax:0,rev:0,exp:0,expGuide:0,expDriver:0,expFuel:0,expOther:0,tours:[]};
      const dayKey=t.date+'|'+(t.tour||'').replace(/ - [^-]+$/,'');
      map[label].tourDays.add(dayKey);
      map[label].bookings++;
      map[label].pax+=(t.adults||0)+(t.children||0);
      map[label].rev+=(t.priceToUs||0);
      map[label].exp+=(t.totalExpenses||0);
      map[label].expGuide+=(t.expGuide||0);
      map[label].expDriver+=(t.expDriver||0);
      map[label].expFuel+=(t.expFuel||0);
      map[label].expOther+=((t.expAudioGuide||0)+(t.expEntryFees||0)+(t.expLunch||0)+(t.expParking||0));
      map[label].tours.push(t);
    });
    // From carTasks
    carTasks.forEach(ct=>{const c=(ct.car||'').trim();if(c&&!map[c])map[c]={name:c,tourDays:new Set(),bookings:0,pax:0,rev:0,exp:0,expGuide:0,expDriver:0,expFuel:0,expOther:0,tours:[]}});
    // From fuel
    fuel.forEach(fl=>{const c=(fl.vehicle||'').trim();if(c&&!map[c])map[c]={name:c,tourDays:new Set(),bookings:0,pax:0,rev:0,exp:0,expGuide:0,expDriver:0,expFuel:0,expOther:0,tours:[]}});
    return Object.values(map).map(c=>({...c,tourDays:c.tourDays.size,profit:c.rev-c.exp})).sort((a,b)=>b.tourDays-a.tourDays);
  },[filtered,carTasks,fuel]);

  // Service records for selected car: from carTasks + stopsCarBus + user-added
  const carServices=useMemo(()=>{
    if(!selectedCar)return [];
    const items=[];
    // carTasks matching this car
    carTasks.forEach(ct=>{
      if((ct.car||'').trim()===selectedCar.name){
        items.push({id:'ct_'+ct.id,type:'task',date:ct.reportDate||'',description:ct.task,who:ct.reportedBy,priority:ct.priority,status:ct.status,cost:null,notes:ct.notes,source:'Задачи коли'});
      }
    });
    // stopsCarBus matching this car
    stopsCarBus.forEach(s=>{
      const v=(s.vehicle||'').toLowerCase();
      const cn=selectedCar.name.toLowerCase();
      if(cn.includes(v)||v.includes(cn.split(' ')[0].replace(/[^а-яa-z0-9]/gi,''))){
        items.push({id:'stop_'+s.id,type:'stop',date:s.startDate||'',dateTo:s.endDate||'',description:s.who,who:'',priority:'',status:'STOP',cost:null,notes:s.notes,source:'STOP Бус/Кола'});
      }
    });
    // User-added service records
    serviceRecords.filter(sr=>sr.carName===selectedCar.name).forEach(sr=>{
      items.push({...sr,source:'Ръчно добавен'});
    });
    return items;
  },[selectedCar,carTasks,stopsCarBus,serviceRecords]);

  // Fuel records for selected car
  const carFuel=useMemo(()=>{
    if(!selectedCar)return [];
    return fuel.filter(f=>{
      const v=(f.vehicle||'').toLowerCase();
      const cn=selectedCar.name.toLowerCase();
      return cn.includes(v)||v.includes(cn.split(' ')[0].replace(/[^а-яa-z0-9]/gi,''));
    });
  },[selectedCar,fuel]);

  // Fines for selected car
  const carFines=useMemo(()=>{
    if(!selectedCar)return [];
    return fines.filter(f=>{
      const v=(f.vehicle||'').toLowerCase().replace(/\s/g,'');
      const cn=selectedCar.name.toLowerCase().replace(/\s/g,'');
      return cn.includes(v)||v.includes(cn.split('-')[0].trim().replace(/[^а-яa-z0-9]/gi,''));
    });
  },[selectedCar,fines]);

  // Tours by month for selected car
  const monthlyBreakdown=useMemo(()=>{
    if(!selectedCar)return [];
    return MONTHS.map((m,i)=>{
      const mt=selectedCar.tours.filter(t=>t.month===i+1);
      return {name:m.slice(0,3),tours:mt.length,rev:mt.reduce((a,t)=>a+(t.priceToUs||0),0),exp:mt.reduce((a,t)=>a+(t.totalExpenses||0),0)};
    });
  },[selectedCar]);

  // Top tours for this car
  const topTours=useMemo(()=>{
    if(!selectedCar)return [];
    const map={};
    selectedCar.tours.forEach(t=>{
      const n=(t.tour||'').replace(/ - [^-]+$/,'');
      if(!n)return;
      if(!map[n])map[n]={count:0,rev:0,pax:0};
      map[n].count++;map[n].rev+=(t.priceToUs||0);map[n].pax+=(t.adults||0)+(t.children||0);
    });
    return Object.entries(map).map(([name,d])=>({name,...d})).sort((a,b)=>b.count-a.count).slice(0,10);
  },[selectedCar]);

  // Service form
  const blankService={carName:'',date:'',description:'',who:'',cost:'',notes:'',type:'service',status:'',priority:''};
  const saveService=(form)=>{
    if(form.id){setServiceRecords(p=>p.map(s=>s.id===form.id?form:s))}
    else{setServiceRecords(p=>[...p,{...form,id:genId(p),carName:selectedCar.name}])};
    setServiceEditing(null);
  };
  const delService=()=>{setServiceRecords(p=>p.filter(s=>s.id!==delServiceId));setDelServiceId(null)};

  const maxTD=Math.max(...cars.map(c=>c.tourDays),1);

  if(selectedCar){
    // --- CAR DOSSIER --- (re-lookup from live cars so filters apply)
    const c=cars.find(x=>x.name===selectedCar.name)||selectedCar;
    const maxM=Math.max(...monthlyBreakdown.map(m=>m.rev),1);
    const totalServiceCost=carServices.reduce((a,s)=>a+(parseFloat(s.cost)||0),0)+carFines.reduce((a,f)=>a+(f.amountEur||0),0)+carFuel.reduce((a,f)=>a+(f.totalFuelCost||0),0);
    return <div>
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost" onClick={()=>{setSelectedCar(null);setTab('overview')}}>← Назад</button>
          <h2>Досие: {c.name}</h2>
        </div>
        <button className="btn btn-primary" onClick={()=>setServiceEditing({...blankService})}>+ Добави сервизен запис</button>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
        <div className="view-toggle">
          <button className={`view-btn ${preset==='7'?'active':''}`} onClick={()=>applyPreset('7')}>7 дни</button>
          <button className={`view-btn ${preset==='30'?'active':''}`} onClick={()=>applyPreset('30')}>30 дни</button>
          <button className={`view-btn ${preset==='90'?'active':''}`} onClick={()=>applyPreset('90')}>90 дни</button>
          <button className={`view-btn ${preset==='year'?'active':''}`} onClick={()=>applyPreset('year')}>Тази година</button>
          <button className={`view-btn ${preset==='all'?'active':''}`} onClick={()=>applyPreset('all')}>Всичко</button>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>от</span>
          <input type="date" className="search-box" style={{width:150}} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPreset('')}}/>
          <span style={{fontSize:12,color:'var(--text2)'}}>до</span>
          <input type="date" className="search-box" style={{width:150}} value={dateTo} onChange={e=>{setDateTo(e.target.value);setPreset('')}}/>
        </div>
        <span style={{fontSize:12,color:'var(--text2)',background:'var(--card)',padding:'4px 10px',borderRadius:4,border:'1px solid var(--border)'}}>{filtered.length} от {tours.length} тура</span>
      </div>
      <div className="stats-row">
        <div className="stat-card"><div className="label">Тур-дни</div><div className="value blue">{c.tourDays}</div></div>
        <div className="stat-card"><div className="label">Резервации</div><div className="value">{c.bookings}</div></div>
        <div className="stat-card"><div className="label">Туристи</div><div className="value">{c.pax}</div></div>
        <div className="stat-card"><div className="label">Приходи</div><div className="value green">{c.rev.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Разходи турове</div><div className="value red">{c.exp.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Печалба турове</div><div className={`value ${c.profit>=0?'green':'red'}`}>{c.profit.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Сервиз/глоби/гориво</div><div className="value orange">{totalServiceCost.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Нетна печалба</div><div className={`value ${(c.profit-totalServiceCost)>=0?'green':'red'}`}>{(c.profit-totalServiceCost).toFixed(2)} €</div></div>
      </div>
      <div className="view-toggle" style={{marginBottom:16}}>
        <button className={`view-btn ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>Обзор</button>
        <button className={`view-btn ${tab==='service'?'active':''}`} onClick={()=>setTab('service')}>Сервиз ({carServices.length})</button>
        <button className={`view-btn ${tab==='fuel'?'active':''}`} onClick={()=>setTab('fuel')}>Гориво ({carFuel.length})</button>
        <button className={`view-btn ${tab==='fines'?'active':''}`} onClick={()=>setTab('fines')}>Глоби ({carFines.length})</button>
        <button className={`view-btn ${tab==='tours'?'active':''}`} onClick={()=>setTab('tours')}>Турове ({c.bookings})</button>
      </div>

      {tab==='overview'&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Приходи по месеци</h3>
            <div style={{display:'flex',alignItems:'flex-end',gap:4,height:160}}>
              {monthlyBreakdown.map((m,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <span style={{fontSize:10,color:'var(--text2)'}}>{m.rev?Math.round(m.rev)+'€':''}</span>
                <div style={{width:'100%',background:m.rev>0?'var(--accent)':'var(--card2)',borderRadius:'3px 3px 0 0',height:`${(m.rev/maxM)*120}px`,minHeight:2}}/>
                <span style={{fontSize:9,color:'var(--text2)'}}>{m.name}</span>
              </div>)}
            </div>
          </div>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Топ турове за тази кола</h3>
            {topTours.map((t,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:13}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:220}} title={t.name}>{t.name}</span>
              <span><strong>{t.count}</strong> <span style={{color:'var(--text2)',fontSize:11}}>({t.pax} пакс, {t.rev.toFixed(0)}€)</span></span>
            </div>)}
            {topTours.length===0&&<p style={{color:'var(--text2)',fontSize:13}}>Няма данни</p>}
          </div>
        </div>
        <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Разпределение на разходите</h3>
            {(()=>{const items=[{label:'Гид',val:c.expGuide,color:'var(--accent)'},{label:'Шофьор',val:c.expDriver,color:'var(--green)'},{label:'Гориво тур',val:c.expFuel,color:'var(--orange)'},{label:'Друго',val:c.expOther,color:'var(--yellow)'}];
              const tot=items.reduce((a,x)=>a+x.val,0)||1;
              return <div>{items.map((it,i)=><div key={i} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span>{it.label}</span><span style={{fontWeight:600}}>{it.val.toFixed(2)} € ({(it.val/tot*100).toFixed(0)}%)</span></div>
                <div style={{background:'var(--card2)',borderRadius:3,height:6,overflow:'hidden'}}><div style={{width:`${(it.val/tot)*100}%`,height:'100%',background:it.color,borderRadius:3}}/></div>
              </div>)}</div>})()}
          </div>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Последни сервизни записи</h3>
            {carServices.slice(0,5).map((s,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:600}}>{s.description}</span><span className={s.status==='ФИНАЛ'?'badge badge-green':s.status==='STOP'?'badge badge-red':'badge badge-yellow'}>{s.status||s.type}</span></div>
              <div style={{color:'var(--text2)',fontSize:11,marginTop:2}}>{s.date}{s.cost?' | '+s.cost+' €':''} {s.source?'('+s.source+')':''}</div>
            </div>)}
            {carServices.length===0&&<p style={{color:'var(--text2)',fontSize:13}}>Няма сервизни записи</p>}
          </div>
        </div>
      </>}

      {tab==='service'&&<div>
        <div className="scroll-table"><table><thead><tr><th>Дата</th><th>Описание</th><th>Кой</th><th>Приоритет</th><th>Статус</th><th>Цена €</th><th>Забележки</th><th>Източник</th><th></th></tr></thead>
        <tbody>{carServices.map((s,i)=><tr key={i}><td>{s.date}{s.dateTo?' → '+s.dateTo:''}</td>
          <td><strong>{s.description}</strong></td><td>{s.who}</td>
          <td>{s.priority&&<span className={s.priority==='СПЕШНО'?'badge badge-red':s.priority==='ВАЖНО'?'badge badge-orange':'badge badge-blue'}>{s.priority}</span>}</td>
          <td><span className={s.status==='ФИНАЛ'?'badge badge-green':s.status==='STOP'?'badge badge-red':s.status==='В ПРОЦЕС'?'badge badge-yellow':'badge badge-blue'}>{s.status}</span></td>
          <td style={{textAlign:'right'}}>{s.cost||'-'}</td><td title={s.notes}>{s.notes}</td><td style={{fontSize:11,color:'var(--text2)'}}>{s.source}</td>
          <td>{s.source==='Ръчно добавен'&&<><button className="btn btn-ghost btn-sm" onClick={()=>setServiceEditing({...s})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelServiceId(s.id)}>✕</button></>}</td>
        </tr>)}</tbody></table></div>
      </div>}

      {tab==='fuel'&&<div>
        <div className="scroll-table"><table><thead><tr><th>Дата</th><th>Шофьор</th><th>Тур</th><th>Км старт</th><th>Км край</th><th>Общо км</th><th>Цена/л</th><th>Литри</th><th>Общо лв</th><th>Забележки</th></tr></thead>
        <tbody>{carFuel.map((f,i)=><tr key={i}><td>{f.date}</td><td>{f.driver}</td><td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={f.tour}>{f.tour}</td>
          <td>{f.kmStart}</td><td>{f.kmEnd}</td><td>{f.totalKm}</td><td>{f.pricePerLiter}</td><td>{f.liters}</td><td style={{fontWeight:600}}>{f.totalFuelCost}</td><td>{f.notes}</td></tr>)}</tbody></table></div>
        {carFuel.length===0&&<p style={{color:'var(--text2)',padding:20}}>Няма записи за гориво за тази кола</p>}
      </div>}

      {tab==='fines'&&<div>
        <div className="scroll-table"><table><thead><tr><th>Дата</th><th>Шофьор</th><th>Сума €</th><th>Платена на</th><th>Статус</th></tr></thead>
        <tbody>{carFines.map((f,i)=><tr key={i}><td>{f.fineDate}</td><td>{f.driver}</td><td style={{fontWeight:600,color:'var(--red)'}}>{f.amountEur} €</td><td>{f.payDate||'-'}</td><td>{f.status}</td></tr>)}</tbody></table></div>
        {carFines.length===0&&<p style={{color:'var(--text2)',padding:20}}>Няма глоби за тази кола</p>}
      </div>}

      {tab==='tours'&&<div>
        <div className="scroll-table"><table><thead><tr><th>Дата</th><th>Тур</th><th>Продавач</th><th>Гид</th><th>Шофьор</th><th>Пакс</th><th>Приход €</th><th>Разход €</th><th>Баланс €</th></tr></thead>
        <tbody>{c.tours.sort((a,b)=>{const da=parseDate(a.date),db=parseDate(b.date);return da&&db?db-da:0}).map((t,i)=><tr key={i}>
          <td style={{whiteSpace:'nowrap'}}>{t.date}</td>
          <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.tour}>{t.tour}</td>
          <td>{t.supplier}</td><td>{t.guide}</td><td>{t.driver}</td>
          <td style={{textAlign:'center'}}>{(t.adults||0)+(t.children||0)}</td>
          <td style={{textAlign:'right',color:'var(--green)'}}>{(t.priceToUs||0).toFixed(2)}</td>
          <td style={{textAlign:'right',color:'var(--red)'}}>{(t.totalExpenses||0).toFixed(2)}</td>
          <td style={{textAlign:'right',fontWeight:600,color:(t.priceToUs||0)-(t.totalExpenses||0)>=0?'var(--green)':'var(--red)'}}>{((t.priceToUs||0)-(t.totalExpenses||0)).toFixed(2)}</td>
        </tr>)}</tbody></table></div>
      </div>}

      {serviceEditing&&<Modal title={serviceEditing.id?"Редактирай сервизен запис":"Нов сервизен запис"} onClose={()=>setServiceEditing(null)}>
        <div><div className="form-grid">
          <div className="form-group"><label>Дата</label><input value={serviceEditing.date} onChange={e=>setServiceEditing(p=>({...p,date:e.target.value}))}/></div>
          <div className="form-group"><label>Цена (€)</label><input type="number" step="0.01" value={serviceEditing.cost} onChange={e=>setServiceEditing(p=>({...p,cost:e.target.value}))}/></div>
          <div className="form-group full"><label>Описание</label><input value={serviceEditing.description} onChange={e=>setServiceEditing(p=>({...p,description:e.target.value}))}/></div>
          <div className="form-group"><label>Кой / Къде</label><input value={serviceEditing.who} onChange={e=>setServiceEditing(p=>({...p,who:e.target.value}))}/></div>
          <div className="form-group"><label>Статус</label><select value={serviceEditing.status} onChange={e=>setServiceEditing(p=>({...p,status:e.target.value}))}><option value="">-</option><option>НОВО</option><option>В ПРОЦЕС</option><option>ФИНАЛ</option></select></div>
          <div className="form-group full"><label>Забележки</label><textarea rows={2} value={serviceEditing.notes} onChange={e=>setServiceEditing(p=>({...p,notes:e.target.value}))}/></div>
        </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setServiceEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>saveService(serviceEditing)}>Запази</button></div></div>
      </Modal>}
      {delServiceId&&<ConfirmModal msg="Изтрий този сервизен запис?" onConfirm={delService} onCancel={()=>setDelServiceId(null)}/>}
    </div>
  }

  // --- VEHICLE REGISTRY ---
  const blankVehicle={name:'',seats:'',active:true};
  const saveVehicle=(form)=>{
    if(setVehicles){
      if(form.id){setVehicles(p=>p.map(v=>v.id===form.id?form:v))}
      else{setVehicles(p=>[...p,{...form,id:Math.max(0,...p.map(v=>v.id))+1}])}
    };setVehicleEditing(null);
  };
  const delVehicle=()=>{if(setVehicles){setVehicles(p=>p.filter(v=>v.id!==delVehicleId))};setDelVehicleId(null)};
  const vList=vehicles||[];

  // --- FLEET LIST ---
  return <div>
    <div className="topbar"><h2>Автопарк ({cars.length} коли)</h2><button className="btn btn-ghost" onClick={()=>setShowRegistry(!showRegistry)}>{showRegistry?'Скрий':'🚐'} Регистър ({vList.length})</button>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <div className="view-toggle">
          <button className={`view-btn ${preset==='7'?'active':''}`} onClick={()=>applyPreset('7')}>7 дни</button>
          <button className={`view-btn ${preset==='30'?'active':''}`} onClick={()=>applyPreset('30')}>30 дни</button>
          <button className={`view-btn ${preset==='90'?'active':''}`} onClick={()=>applyPreset('90')}>90 дни</button>
          <button className={`view-btn ${preset==='year'?'active':''}`} onClick={()=>applyPreset('year')}>Тази година</button>
          <button className={`view-btn ${preset==='all'?'active':''}`} onClick={()=>applyPreset('all')}>Всичко</button>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>от</span>
          <input type="date" className="search-box" style={{width:150}} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPreset('')}}/>
          <span style={{fontSize:12,color:'var(--text2)'}}>до</span>
          <input type="date" className="search-box" style={{width:150}} value={dateTo} onChange={e=>{setDateTo(e.target.value);setPreset('')}}/>
        </div>
        <span style={{fontSize:12,color:'var(--text2)',background:'var(--card)',padding:'4px 10px',borderRadius:4,border:'1px solid var(--border)'}}>{filtered.length} от {tours.length} тура</span>
      </div>
    </div>
    <div className="scroll-table"><table><thead><tr>
      <th>Кола</th><th style={{textAlign:'center'}}>Тур-дни</th><th style={{textAlign:'center'}}>Резервации</th><th style={{textAlign:'center'}}>Пакс</th>
      <th style={{textAlign:'right'}}>Приходи €</th><th style={{textAlign:'right'}}>Разходи €</th><th style={{textAlign:'right'}}>Печалба €</th><th style={{width:'20%'}}>Натовареност</th><th></th>
    </tr></thead>
    <tbody>{cars.map((c,i)=><tr key={i} style={{cursor:'pointer'}} onClick={()=>setSelectedCar(c)}>
      <td><strong style={{color:'var(--accent)'}}>{c.name}</strong></td>
      <td style={{textAlign:'center',color:'var(--text2)'}}>{(()=>{const v=vList.find(v=>v.name===c.name);return v&&v.seats?v.seats:'-'})()}</td>
      <td style={{textAlign:'center',fontWeight:700}}>{c.tourDays}</td>
      <td style={{textAlign:'center'}}>{c.bookings}</td>
      <td style={{textAlign:'center'}}>{c.pax}</td>
      <td style={{textAlign:'right',color:'var(--green)'}}>{c.rev.toFixed(2)}</td>
      <td style={{textAlign:'right',color:'var(--red)'}}>{c.exp.toFixed(2)}</td>
      <td style={{textAlign:'right',fontWeight:700,color:c.profit>=0?'var(--green)':'var(--red)'}}>{c.profit.toFixed(2)}</td>
      <td><div style={{background:'var(--card2)',borderRadius:3,height:8,overflow:'hidden'}}><div style={{width:`${(c.tourDays/maxTD)*100}%`,height:'100%',background:'var(--accent)',borderRadius:3}}/></div></td>
      <td><button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setSelectedCar(c)}}>Досие →</button></td>
    </tr>)}</tbody></table></div>
  </div>
}

export default FleetPage
