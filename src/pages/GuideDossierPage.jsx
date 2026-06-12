import { useState, useMemo } from 'react'
import { parseDate, parseDateISO, presetRange, MONTHS } from '../utils/helpers'

function GuideDossierPage({tours,guides,stopsGuide}){
  const [selectedGuide,setSelectedGuide]=useState(null);
  const [tab,setTab]=useState('overview');
  const [search,setSearch]=useState('');
  const [preset,setPreset]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const applyPreset=(p)=>{setPreset(p);const r=presetRange(p);setDateFrom(r.from);setDateTo(r.to)};
  const filtered=useMemo(()=>{if(!dateFrom&&!dateTo)return tours;const from=dateFrom?parseDateISO(dateFrom):null;const to=dateTo?parseDateISO(dateTo):null;
    return tours.filter(t=>{const d=parseDate(t.date);if(!d)return false;if(from&&d<from)return false;if(to&&d>to)return false;return true})},[tours,dateFrom,dateTo]);

  // Build guide stats from filtered tours
  const guideStats=useMemo(()=>{
    const map={};
    filtered.forEach(t=>{
      const g=(t.guide||'').trim();
      if(!g)return;
      if(!map[g])map[g]={name:g,tours:[],tourDays:new Set(),bookings:0,pax:0,rev:0,expTotal:0,expGuide:0,languages:new Set(),suppliers:new Set(),cars:new Set()};
      const dayKey=t.date+'|'+(t.tour||'').replace(/ - [^-]+$/,'');
      map[g].tourDays.add(dayKey);
      map[g].bookings++;
      map[g].pax+=(t.adults||0)+(t.children||0);
      map[g].rev+=(t.priceToUs||0);
      map[g].expTotal+=(t.totalExpenses||0);
      map[g].expGuide+=(t.expGuide||0);
      map[g].tours.push(t);
      const lang=t.tourLanguage?[null,t.tourLanguage]:(t.tour||'').match(/ - ([^-]+)$/);
      if(lang)map[g].languages.add(lang[1]);
      if(t.supplier)map[g].suppliers.add(t.supplier);
      if(t.carNumber)map[g].cars.add(t.carNumber);
    });
    // Merge with guides list for profile info
    return Object.values(map).map(g=>{
      const profile=guides.find(gp=>gp.name.trim()===g.name||g.name.includes(gp.name.trim()));
      return {...g,tourDays:g.tourDays.size,languages:[...g.languages],suppliers:[...g.suppliers],cars:[...g.cars],
        profile:profile||null,profit:g.rev-g.expTotal};
    }).sort((a,b)=>b.bookings-a.bookings);
  },[filtered,guides]);

  // Filtered by search
  const displayGuides=useMemo(()=>{
    if(!search)return guideStats;
    const s=search.toLowerCase();
    return guideStats.filter(g=>g.name.toLowerCase().includes(s)||g.languages.join(',').toLowerCase().includes(s));
  },[guideStats,search]);

  // Stops for selected guide
  const guideStops=useMemo(()=>{
    if(!selectedGuide)return [];
    return stopsGuide.filter(s=>{
      const sn=(s.guideName||'').trim().toLowerCase();
      const gn=selectedGuide.name.toLowerCase();
      return sn===gn||gn.includes(sn)||sn.includes(gn);
    });
  },[selectedGuide,stopsGuide]);

  // Monthly breakdown for selected guide
  const monthlyBreakdown=useMemo(()=>{
    if(!selectedGuide)return [];
    return MONTHS.map((m,i)=>{
      const mt=selectedGuide.tours.filter(t=>t.month===i+1);
      return {name:m.slice(0,3),tours:mt.length,rev:mt.reduce((a,t)=>a+(t.priceToUs||0),0),expGuide:mt.reduce((a,t)=>a+(t.expGuide||0),0)};
    });
  },[selectedGuide]);

  // Top tours for selected guide
  const topTours=useMemo(()=>{
    if(!selectedGuide)return [];
    const map={};
    selectedGuide.tours.forEach(t=>{
      const n=(t.tour||'').replace(/ - [^-]+$/,'');
      if(!n)return;
      if(!map[n])map[n]={count:0,rev:0,pax:0,expGuide:0};
      map[n].count++;map[n].rev+=(t.priceToUs||0);map[n].pax+=(t.adults||0)+(t.children||0);map[n].expGuide+=(t.expGuide||0);
    });
    return Object.entries(map).map(([name,d])=>({name,...d})).sort((a,b)=>b.count-a.count).slice(0,10);
  },[selectedGuide]);

  // Top suppliers for selected guide
  const topSuppliers=useMemo(()=>{
    if(!selectedGuide)return [];
    const map={};
    selectedGuide.tours.forEach(t=>{if(t.supplier){map[t.supplier]=(map[t.supplier]||0)+1}});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[selectedGuide]);

  const maxBook=Math.max(...guideStats.map(g=>g.bookings),1);

  // Date filter bar component
  const DateFilterBar=()=><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
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
  </div>;

  if(selectedGuide){
    const g=guideStats.find(x=>x.name===selectedGuide.name)||selectedGuide;
    const maxM=Math.max(...monthlyBreakdown.map(m=>m.rev),1);
    const avgPerTour=g.bookings?(g.expGuide/g.bookings):0;
    const avgRevPerTour=g.bookings?(g.rev/g.bookings):0;
    return <div>
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost" onClick={()=>{setSelectedGuide(null);setTab('overview')}}>← Назад</button>
          <h2>Досие: {g.name}</h2>
          {g.profile&&<span style={{fontSize:12,color:'var(--text2)',background:'var(--card)',padding:'3px 8px',borderRadius:4,border:'1px solid var(--border)'}}>{g.profile.languages} {g.profile.drives==='да'?' | шофира':''}</span>}
        </div>
      </div>
      <div style={{marginBottom:16}}><DateFilterBar/></div>
      <div className="stats-row">
        <div className="stat-card"><div className="label">Тур-дни</div><div className="value blue">{g.tourDays}</div></div>
        <div className="stat-card"><div className="label">Резервации</div><div className="value">{g.bookings}</div></div>
        <div className="stat-card"><div className="label">Туристи</div><div className="value">{g.pax}</div></div>
        <div className="stat-card"><div className="label">Приходи от турове</div><div className="value green">{g.rev.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Хонорар гид</div><div className="value orange">{g.expGuide.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Ср. хонорар/тур</div><div className="value">{avgPerTour.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Ср. приход/тур</div><div className="value">{avgRevPerTour.toFixed(2)} €</div></div>
        <div className="stat-card"><div className="label">Печалба</div><div className={`value ${g.profit>=0?'green':'red'}`}>{g.profit.toFixed(2)} €</div></div>
      </div>
      <div className="view-toggle" style={{marginBottom:16}}>
        <button className={`view-btn ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>Обзор</button>
        <button className={`view-btn ${tab==='tours'?'active':''}`} onClick={()=>setTab('tours')}>Турове ({g.bookings})</button>
        <button className={`view-btn ${tab==='stops'?'active':''}`} onClick={()=>setTab('stops')}>STOP ({guideStops.length})</button>
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
            <h3 style={{fontSize:14,marginBottom:12}}>Топ турове</h3>
            {topTours.map((t,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:13}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:220}} title={t.name}>{t.name}</span>
              <span><strong>{t.count}</strong> <span style={{color:'var(--text2)',fontSize:11}}>({t.pax} пакс)</span></span>
            </div>)}
            {topTours.length===0&&<p style={{color:'var(--text2)',fontSize:13}}>Няма данни</p>}
          </div>
        </div>
        <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Хонорар по месеци</h3>
            {(()=>{const maxE=Math.max(...monthlyBreakdown.map(m=>m.expGuide),1);
              return <div style={{display:'flex',alignItems:'flex-end',gap:4,height:140}}>
                {monthlyBreakdown.map((m,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <span style={{fontSize:10,color:'var(--text2)'}}>{m.expGuide?Math.round(m.expGuide)+'€':''}</span>
                  <div style={{width:'100%',background:m.expGuide>0?'var(--orange)':'var(--card2)',borderRadius:'3px 3px 0 0',height:`${(m.expGuide/maxE)*100}px`,minHeight:2}}/>
                  <span style={{fontSize:9,color:'var(--text2)'}}>{m.name}</span>
                </div>)}
              </div>})()}
          </div>
          <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:14,marginBottom:12}}>Продавачи</h3>
            {topSuppliers.map(([name,count],i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:13}}><span>{name}</span><strong>{count}</strong></div>)}
            {topSuppliers.length===0&&<p style={{color:'var(--text2)',fontSize:13}}>Няма данни</p>}
            {g.profile&&<div style={{marginTop:16,padding:12,background:'var(--bg)',borderRadius:6,border:'1px solid var(--border)'}}>
              <h4 style={{fontSize:12,color:'var(--text2)',marginBottom:6}}>Профил</h4>
              <div style={{fontSize:13}}>{g.profile.email&&<div>✉ {g.profile.email}</div>}{g.profile.phone&&<div>☎ {g.profile.phone}</div>}{g.profile.fee&&<div>💰 {g.profile.fee}</div>}{g.profile.notes&&<div style={{color:'var(--text2)',marginTop:4,fontSize:12}}>{g.profile.notes}</div>}</div>
            </div>}
          </div>
        </div>
        {guideStops.length>0&&<div style={{marginTop:16,background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
          <h3 style={{fontSize:14,marginBottom:12}}>STOP периоди</h3>
          {guideStops.map((s,i)=><div key={i} style={{display:'flex',gap:12,padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span className="badge badge-red">{s.startDate} → {s.endDate}</span>
          </div>)}
        </div>}
      </>}

      {tab==='tours'&&<div>
        <div className="scroll-table"><table><thead><tr><th>Дата</th><th>Тур</th><th>Продавач</th><th>Кола</th><th>Шофьор</th><th>Пакс</th><th>Приход €</th><th>Хонорар €</th><th>Общо разх. €</th><th>Баланс €</th></tr></thead>
        <tbody>{g.tours.sort((a,b)=>{const da=parseDate(a.date),db=parseDate(b.date);return da&&db?db-da:0}).map((t,i)=><tr key={i}>
          <td style={{whiteSpace:'nowrap'}}>{t.date}</td>
          <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.tour}>{t.tour}</td>
          <td>{t.supplier}</td><td>{t.carNumber}</td><td>{t.driver}</td>
          <td style={{textAlign:'center'}}>{(t.adults||0)+(t.children||0)}</td>
          <td style={{textAlign:'right',color:'var(--green)'}}>{(t.priceToUs||0).toFixed(2)}</td>
          <td style={{textAlign:'right',color:'var(--orange)'}}>{(t.expGuide||0).toFixed(2)}</td>
          <td style={{textAlign:'right',color:'var(--red)'}}>{(t.totalExpenses||0).toFixed(2)}</td>
          <td style={{textAlign:'right',fontWeight:600,color:(t.priceToUs||0)-(t.totalExpenses||0)>=0?'var(--green)':'var(--red)'}}>{((t.priceToUs||0)-(t.totalExpenses||0)).toFixed(2)}</td>
        </tr>)}</tbody></table></div>
      </div>}

      {tab==='stops'&&<div>
        {guideStops.length>0?<div className="scroll-table"><table><thead><tr><th>От</th><th>До</th><th>Гид</th></tr></thead>
        <tbody>{guideStops.map((s,i)=><tr key={i}><td>{s.startDate}</td><td>{s.endDate}</td><td>{s.guideName}</td></tr>)}</tbody></table></div>
        :<p style={{color:'var(--text2)',padding:20}}>Няма STOP записи за този гид</p>}
      </div>}
    </div>
  }

  // --- GUIDE LIST ---
  return <div>
    <div className="topbar"><h2>Досиета гидове ({guideStats.length} активни)</h2>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input className="search-box" placeholder="Търси гид..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
    </div>
    <DateFilterBar/>
    <div style={{marginTop:16}} className="scroll-table"><table><thead><tr>
      <th>Гид</th><th>Езици</th><th style={{textAlign:'center'}}>Тур-дни</th><th style={{textAlign:'center'}}>Резервации</th><th style={{textAlign:'center'}}>Пакс</th>
      <th style={{textAlign:'right'}}>Приходи €</th><th style={{textAlign:'right'}}>Хонорар €</th><th style={{textAlign:'right'}}>Печалба €</th><th style={{width:'18%'}}>Натовареност</th><th></th>
    </tr></thead>
    <tbody>{displayGuides.map((g,i)=><tr key={i} style={{cursor:'pointer'}} onClick={()=>setSelectedGuide(g)}>
      <td><strong style={{color:'var(--accent)'}}>{g.name}</strong>{g.profile&&g.profile.drives==='да'&&<span style={{marginLeft:6,fontSize:10,color:'var(--green)'}}>🚗</span>}</td>
      <td style={{fontSize:12,color:'var(--text2)'}}>{g.languages.join(', ')}</td>
      <td style={{textAlign:'center',fontWeight:700}}>{g.tourDays}</td>
      <td style={{textAlign:'center'}}>{g.bookings}</td>
      <td style={{textAlign:'center'}}>{g.pax}</td>
      <td style={{textAlign:'right',color:'var(--green)'}}>{g.rev.toFixed(2)}</td>
      <td style={{textAlign:'right',color:'var(--orange)'}}>{g.expGuide.toFixed(2)}</td>
      <td style={{textAlign:'right',fontWeight:700,color:g.profit>=0?'var(--green)':'var(--red)'}}>{g.profit.toFixed(2)}</td>
      <td><div style={{background:'var(--card2)',borderRadius:3,height:8,overflow:'hidden'}}><div style={{width:`${(g.bookings/maxBook)*100}%`,height:'100%',background:'var(--accent)',borderRadius:3}}/></div></td>
      <td><button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setSelectedGuide(g)}}>Досие →</button></td>
    </tr>)}</tbody></table></div>
  </div>
}

export default GuideDossierPage
