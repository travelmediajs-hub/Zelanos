import React, { useState, useMemo } from 'react';
import { Modal, ConfirmModal } from '../components/Modal';
import { genId, parseDate, parseDateISO, MONTHS, tourColor } from '../utils/helpers';
import TourForm from './TourForm';

function CalendarView({filtered,month,year,onEdit}){
  const firstDay=new Date(year,month-1,1);const lastDay=new Date(year,month,0);
  const startDow=(firstDay.getDay()+6)%7;const daysInMonth=lastDay.getDate();
  const prevMonthLast=new Date(year,month-1,0).getDate();
  const today=new Date();const todayStr=`${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const cells=[];
  for(let i=0;i<startDow;i++)cells.push({day:prevMonthLast-startDow+1+i,other:true});
  for(let d=1;d<=daysInMonth;d++)cells.push({day:d,other:false});
  const rem=7-(cells.length%7);if(rem<7)for(let i=1;i<=rem;i++)cells.push({day:i,other:true});
  const toursByDay=useMemo(()=>{const m={};filtered.forEach(t=>{const d=parseDate(t.date);if(d){const k=d.getDate();if(!m[k])m[k]=[];m[k].push(t)}});return m},[filtered]);
  const dayNames=['Пон','Вто','Сря','Чет','Пет','Съб','Нед'];
  return <div className="cal-grid">
    {dayNames.map(d=><div key={d} className="cal-header">{d}</div>)}
    {cells.map((c,i)=>{
      const isToday=!c.other&&`${year}-${month-1}-${c.day}`===todayStr;
      const dayTours=c.other?[]:(toursByDay[c.day]||[]);
      return <div key={i} className={`cal-day${c.other?' other-month':''}${isToday?' today':''}`}>
        <div className="day-num">{c.day}</div>
        {dayTours.slice(0,3).map(t=><div key={t.id} className={`cal-event ${tourColor(t.tour)}`} title={`${t.tour}\n${t.name}\nГид: ${t.guide}`} onClick={()=>onEdit(t)}>
          {t.pickupTime?String(t.pickupTime).slice(0,5)+' ':''}{t.tour.replace(/ - [^-]+$/,'').slice(0,22)}
        </div>)}
        {dayTours.length>3&&<div style={{fontSize:10,color:'var(--text2)',padding:'0 4px'}}>+{dayTours.length-3} още</div>}
      </div>
    })}
  </div>
}

function ListView({filtered,onEdit,onDelete,carFilter,bulkSel,setBulkSel}){
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const da=parseDate(a.date),db=parseDate(b.date);if(!da||!db)return 0;return da-db}),[filtered]);
  const [expanded,setExpanded]=useState(new Set());
  const toggle=(id)=>setExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n});
  const stIcon={reservation:'🔵',planned:'🟢',done:'🟡',reported:'✅',cancelled:'🔴'};
  const stTip={reservation:'Резервация',planned:'Планиран',done:'Проведен',reported:'Отчетен',cancelled:'Отменен'};
  return <div className="scroll-table"><table style={{fontSize:12}}><thead><tr>
    {carFilter&&<th style={{width:24,padding:'4px 2px'}}><input type="checkbox" checked={bulkSel.size===filtered.length&&filtered.length>0} onChange={()=>{const ids=new Set(filtered.map(t=>t.id));setBulkSel(prev=>prev.size===ids.size?new Set():ids)}}/></th>}
    <th style={{padding:'4px 2px',width:16}}></th><th style={{padding:'4px 3px',width:20}}></th><th style={{padding:'4px 3px'}}>Продавач</th><th style={{padding:'4px 3px'}}>Booking</th><th style={{padding:'4px 3px'}}>Дата</th><th style={{padding:'4px 3px'}}>Тур</th><th style={{padding:'4px 3px'}}>Име</th><th style={{padding:'4px 3px',textAlign:'center'}}>Въз</th><th style={{padding:'4px 3px',textAlign:'center'}}>Д</th><th style={{padding:'4px 3px'}}>Хотел</th><th style={{padding:'4px 3px'}}>Час</th>
    <th style={{padding:'4px 3px',textAlign:'right'}}>Цена</th><th style={{padding:'4px 3px',textAlign:'right'}}>Прод.</th><th style={{padding:'4px 3px',textAlign:'right'}}>Дете</th><th style={{padding:'4px 2px',width:50}}></th>
  </tr></thead>
  <tbody>{sorted.map(t=>{const st=t.tourStatus||'reservation';const isOpen=expanded.has(t.id);
    return <React.Fragment key={t.id}>
    <tr style={{opacity:st==='cancelled'?0.5:1,cursor:'pointer',background:isOpen?'var(--accent-light)':'transparent'}} onClick={()=>toggle(t.id)}>
      {carFilter&&<td style={{padding:'3px 2px'}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={bulkSel.has(t.id)} onChange={()=>setBulkSel(prev=>{const n=new Set(prev);n.has(t.id)?n.delete(t.id):n.add(t.id);return n})}/></td>}
      <td style={{fontSize:11,width:16,textAlign:'center',color:'var(--text2)',padding:'3px 2px'}}>{isOpen?'▾':'▸'}</td>
      <td style={{padding:'3px 2px',textAlign:'center',fontSize:11}} title={stTip[st]||st}>{stIcon[st]||'⚪'}</td>
      <td style={{padding:'3px 3px',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.supplier}</td>
      <td style={{padding:'3px 3px',fontSize:11}}>{t.bookingNumber}</td>
      <td style={{whiteSpace:'nowrap',padding:'3px 3px'}}>{t.date}</td>
      <td title={t.tour} style={{maxWidth:170,fontWeight:600,padding:'3px 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.tour}</td>
      <td title={t.name} style={{maxWidth:120,padding:'3px 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</td>
      <td style={{textAlign:'center',padding:'3px 2px'}}>{t.adults}</td><td style={{textAlign:'center',padding:'3px 2px'}}>{t.children}</td>
      <td title={t.hotel} style={{maxWidth:100,padding:'3px 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.hotel}</td>
      <td style={{whiteSpace:'nowrap',padding:'3px 3px'}}>{t.pickupTime}</td>
      <td style={{textAlign:'right',padding:'3px 3px'}}>{t.priceToUs}</td><td style={{textAlign:'right',padding:'3px 3px'}}>{t.salePrice}</td><td style={{textAlign:'right',padding:'3px 3px'}}>{t.salePriceChild}</td>
      <td style={{whiteSpace:'nowrap',padding:'3px 2px'}} onClick={e=>e.stopPropagation()}>
        {st!=='reported'&&<button className="btn btn-ghost btn-sm" style={{padding:'2px 4px',fontSize:12}} onClick={()=>onEdit(t)}>✎</button>}
        {st==='reported'&&<button className="btn btn-ghost btn-sm" style={{padding:'2px 4px',fontSize:12}} onClick={()=>{if(confirm('Отключи отчетен тур за редакция?'))onEdit({...t,tourStatus:'done'})}}>🔓</button>}
        <button className="btn btn-danger btn-sm" style={{padding:'2px 4px',fontSize:12}} onClick={()=>onDelete(t.id)}>✕</button>
      </td>
    </tr>
    {isOpen&&<tr style={{background:'var(--card2)'}}><td colSpan={carFilter?16:15} style={{padding:'12px 16px',borderTop:'none'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px 20px',fontSize:13}}>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Тип тур</span><div>{({walking:'🚶 Пешеходен',guide_drives:'🚗 Гид-шофьор',guide_driver:'🚐 Гид+Шофьор'}[t.tourType])||t.tourType||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Език</span><div>{t.tourLanguage||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Телефон</span><div>{t.clientPhone||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Мейл</span><div>{t.clientEmail||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Бележка плащане</span><div>{t.payNote||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Гид</span><div style={{fontWeight:600}}>{t.guide||'—'}{t.guideIsDriver?' (шофира)':''}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Шофьор</span><div>{t.driver||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Кола</span><div>{t.carNumber||'—'}</div></div>
        <div style={{gridColumn:'1/-1',borderTop:'1px solid var(--border)',paddingTop:8,marginTop:4}}>
          <span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>РАЗХОДИ</span>
          <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:4}}>
            {t.expGuide!=null&&<span>Гид: <strong>{t.expGuide}€</strong></span>}
            {t.expDriver!=null&&<span>Шофьор: <strong>{t.expDriver}€</strong></span>}
            {t.expFuel!=null&&<span>Гориво: <strong>{t.expFuel}€</strong></span>}
            {t.expAudioGuide!=null&&<span>Аудио: <strong>{t.expAudioGuide}€</strong></span>}
            {t.expEntryFees!=null&&<span>Входни: <strong>{t.expEntryFees}€</strong></span>}
            {t.expLunch!=null&&<span>Обяд: <strong>{t.expLunch}€</strong></span>}
            {t.expParking!=null&&<span>Паркинг: <strong>{t.expParking}€</strong></span>}
          </div>
        </div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Общо разходи</span><div style={{fontWeight:700}}>{t.totalExpenses!=null?t.totalExpenses+'€':'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Баланс €</span><div style={{fontWeight:700,color:(t.balanceEur||0)>=0?'var(--green)':'var(--red)'}}>{t.balanceEur!=null?t.balanceEur+'€':'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Резервации</span><div>{t.reservationMade||'—'}</div></div>
        <div><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Мейл до гид</span><div>{t.emailSentToGuide||'—'}</div></div>
        {t.notes&&<div style={{gridColumn:'1/-1'}}><span style={{color:'var(--text2)',fontSize:11,fontWeight:600}}>Бележки</span><div>{t.notes}</div></div>}
      </div>
    </td></tr>}
    </React.Fragment>
  })}</tbody></table></div>
}

function ToursPage({tours,setTours,guides,catalog,vehicles,roundTrips,stopsCarBus,tourLanguages,setTourLanguages,carRentals}){
  const [year,setYear]=useState(2026);
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [search,setSearch]=useState('');const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);const [view,setView]=useState('list');const [carFilter,setCarFilter]=useState(false);const [bulkCar,setBulkCar]=useState('');const [bulkSel,setBulkSel]=useState(new Set());const [statusFilter,setStatusFilter]=useState('all');const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');
  const yearTours=useMemo(()=>tours.filter(t=>(t.year||2026)===year),[tours,year]);
  const monthTours=useMemo(()=>yearTours.filter(t=>t.month===month),[yearTours,month]);
  const filtered=useMemo(()=>{let list=monthTours;if(carFilter)list=list.filter(t=>!(t.carNumber||'').trim());
    if(statusFilter!=='all')list=list.filter(t=>(t.tourStatus||'reservation')===statusFilter);
    if(dateFrom||dateTo){const df=dateFrom?parseDateISO(dateFrom):null;const dt=dateTo?parseDateISO(dateTo):null;
      list=list.filter(t=>{const d=parseDate(t.date);if(!d)return false;if(df&&d<df)return false;if(dt){const dte=new Date(dt);dte.setHours(23,59,59);if(d>dte)return false}return true})}
    const s=search.toLowerCase();return !s?list:list.filter(t=>
    (t.tour||'').toLowerCase().includes(s)||(t.name||'').toLowerCase().includes(s)||(t.supplier||'').toLowerCase().includes(s)||(t.guide||'').toLowerCase().includes(s)||(t.date||'').includes(s)
  )},[monthTours,search,carFilter,statusFilter,dateFrom,dateTo]);
  const monthCounts=useMemo(()=>{const c={};yearTours.forEach(t=>{c[t.month]=(c[t.month]||0)+1});return c},[yearTours]);
  const years=useMemo(()=>[...new Set(tours.map(t=>t.year||2026))].sort(),[tours]);
  const stats=useMemo(()=>{
    const rev=filtered.reduce((a,t)=>a+(t.priceToUs||0),0);const exp=filtered.reduce((a,t)=>a+(t.totalExpenses||0),0);
    const pax=filtered.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0);
    return{rev,exp,profit:rev-exp,pax,count:filtered.length}
  },[filtered]);
  const blank={month,year,monthName:MONTHS[month-1],payNote:'',supplier:'',bookingNumber:'',date:'',tour:'',name:'',clientPhone:'',clientEmail:'',adults:null,children:null,hotel:'',pickupTime:'',priceToUs:null,salePrice:null,salePriceChild:null,guide:'',driver:'',carNumber:'',expGuide:null,expDriver:null,expFuel:null,expAudioGuide:null,expEntryFees:null,expLunch:null,expParking:null,totalExpenses:null,balanceEur:null,balanceBgn:null,reservationMade:'',emailSentToGuide:'',tourType:'guide_driver',tourStatus:'reservation',notes:''};
  const save=(form)=>{
    const exp=(form.expGuide||0)+(form.expDriver||0)+(form.expFuel||0)+(form.expAudioGuide||0)+(form.expEntryFees||0)+(form.expLunch||0)+(form.expParking||0);
    const bal=(form.priceToUs||0)-exp;
    const parsedDate=parseDate(form.date);
    const dateFields=parsedDate?{
      month:parsedDate.getMonth()+1,
      year:parsedDate.getFullYear(),
      monthName:MONTHS[parsedDate.getMonth()]
    }:{month:form.month,year:form.year,monthName:form.monthName};
    const updated={...form,...dateFields,totalExpenses:exp,balanceEur:Math.round(bal*100)/100};
    if(form.id){setTours(p=>p.map(t=>t.id===form.id?updated:t))}else{setTours(p=>[...p,{...updated,id:genId(p)}])};setEditing(null)
  };
  const del=()=>{setTours(p=>p.filter(t=>t.id!==delId));setDelId(null)};
  return <div>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
      <div className="view-toggle">{years.map(y=><button key={y} className={`view-btn ${year===y?'active':''}`} onClick={()=>setYear(y)}>{y}</button>)}</div>
      <span style={{fontSize:13,color:'var(--text2)'}}>({yearTours.length} тура)</span>
    </div>
    <div className="month-tabs">{MONTHS.map((m,i)=><div key={i} className={`month-tab ${month===i+1?'active':''}`} onClick={()=>setMonth(i+1)}>{m}<span className="count">({monthCounts[i+1]||0})</span></div>)}</div>
    <div className="stats-row">
      <div className="stat-card"><div className="label">Турове</div><div className="value blue">{stats.count}</div></div>
      <div className="stat-card"><div className="label">Туристи</div><div className="value">{stats.pax}</div></div>
      <div className="stat-card"><div className="label">Приходи</div><div className="value green">{stats.rev.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Разходи</div><div className="value red">{stats.exp.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Печалба</div><div className={`value ${stats.profit>=0?'green':'red'}`}>{stats.profit.toFixed(2)} €</div></div>
    </div>
    <div className="tours-toolbar" style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      <button className="btn" style={{background:'#e67e22',color:'#fff',fontWeight:700,border:'none',boxShadow:'0 2px 8px rgba(230,126,34,.4)'}} onClick={()=>setEditing({...blank})}>+ Нов тур</button>
      <h2 style={{fontSize:20,fontWeight:700,color:'var(--accent)',margin:0}}>{MONTHS[month-1]} {year}</h2>
      <div className="tours-filters" style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <input className="search-box" style={{maxWidth:160,padding:'5px 8px',fontSize:12}} placeholder="Търси..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="tours-date-filters" style={{display:'flex',gap:3,alignItems:'center',fontSize:12,color:'var(--text2)',flexWrap:'wrap'}}>
          <span>от</span><input type="date" className="search-box" style={{maxWidth:130,padding:'5px 6px',fontSize:12}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          <span>до</span><input type="date" className="search-box" style={{maxWidth:130,padding:'5px 6px',fontSize:12}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          {(dateFrom||dateTo)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setDateFrom('');setDateTo('')}} title="Изчисти филтър">✕</button>}
        </div>
        <button className={`btn btn-sm ${carFilter?'btn-primary':'btn-ghost'}`} onClick={()=>setCarFilter(!carFilter)} title="Покажи само турове без кола">{carFilter?'✓ ':''} Без кола</button>
      </div>
    </div>
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
      <div className="view-toggle">
        <button className={`view-btn ${view==='list'?'active':''}`} onClick={()=>setView('list')}>Списък</button>
        <button className={`view-btn ${view==='calendar'?'active':''}`} onClick={()=>setView('calendar')}>Календар</button>
      </div>
      <div className="view-toggle" style={{fontSize:12}}>
        {[['all','Всички'],['reservation','🔵'],['done','🟡'],['reported','✅'],['cancelled','🔴']].map(([k,l])=>{
          const cnt=k==='all'?monthTours.length:monthTours.filter(t=>(t.tourStatus||'reservation')===k).length;
          const tip={reservation:'Резервация',done:'Проведен',reported:'Отчетен',cancelled:'Отменен'}[k]||'';
          return <button key={k} className={`view-btn ${statusFilter===k?'active':''}`} style={{padding:'4px 8px'}} onClick={()=>setStatusFilter(k)} title={tip}>{l} ({cnt})</button>
        })}
      </div>
    </div>
    {carFilter&&filtered.length>0&&<div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 16px',background:'var(--card)',borderRadius:8,border:'1px solid var(--border)',marginBottom:12}}>
      <span style={{fontSize:13,color:'var(--text2)'}}>Задай кола на избраните ({bulkSel.size}):</span>
      <select className="search-box" style={{width:'auto'}} value={bulkCar} onChange={e=>setBulkCar(e.target.value)}>
        <option value="">— избери кола —</option><option value="пешеходен">пешеходен</option>{(vehicles||[]).filter(v=>v.active).map(v=><option key={v.id} value={v.name}>{v.name}{v.seats?' ('+v.seats+')':''}</option>)}
      </select>
      <button className="btn btn-primary btn-sm" disabled={!bulkCar||bulkSel.size===0} onClick={()=>{setTours(p=>p.map(t=>bulkSel.has(t.id)?{...t,carNumber:bulkCar}:t));setBulkSel(new Set());setBulkCar('')}}>Приложи</button>
      <button className="btn btn-ghost btn-sm" onClick={()=>{const ids=new Set(filtered.map(t=>t.id));setBulkSel(prev=>prev.size===ids.size?new Set():ids)}}>{bulkSel.size===filtered.length?'Размаркирай':'Маркирай'} всички</button>
    </div>}
    {view==='list'&&<ListView filtered={filtered} onEdit={t=>setEditing({...t})} onDelete={id=>setDelId(id)} carFilter={carFilter} bulkSel={bulkSel} setBulkSel={setBulkSel}/>}
    {view==='calendar'&&<CalendarView filtered={filtered} month={month} year={year} onEdit={t=>setEditing({...t})}/>}
    {editing&&<Modal title={editing.id?"Редактирай тур":"Нов тур"} onClose={()=>setEditing(null)}>
      <TourForm data={editing} onSave={save} onCancel={()=>setEditing(null)} guides={guides} catalog={catalog} vehicles={vehicles} allTours={tours} roundTrips={roundTrips} stopsCarBus={stopsCarBus} tourLanguages={tourLanguages} setTourLanguages={setTourLanguages} carRentals={carRentals}/></Modal>}
    {delId&&<ConfirmModal msg="Изтрий тур?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default ToursPage;
