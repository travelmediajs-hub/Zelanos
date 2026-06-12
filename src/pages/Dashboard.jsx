import { useState, useMemo } from 'react';
import { parseDate, parseDateISO, presetRange, MONTHS } from '../utils/helpers';
import { supabase } from '../utils/supabase';
import { migrateToSupabase } from '../utils/migrate';

function Dashboard({tours,guides,fuel,carTasks,vehicles,fines,stopsCarBus,stopsGuide,catalog,carRentals,roundTrips}){
  const [migrating,setMigrating]=useState(false);
  const [migrateMsg,setMigrateMsg]=useState('');
  const [migrateDone,setMigrateDone]=useState(false);

  const handleMigrate=async(data)=>{
    setMigrating(true);setMigrateMsg('Миграция...');
    try{
      const result=await migrateToSupabase(
        data||{tours,guides,fuel,carTasks,vehicles,fines,stopsCarBus,stopsGuide,catalog,carRentals,roundTrips},
        (key,done,total)=>setMigrateMsg(`${key}: ${done}/${total}`)
      );
      const summary=Object.entries(result).map(([k,v])=>
        v.skipped?`${k}: прескочен${v.existing?' ('+v.existing+' записа)':''}`:
        v.error?`${k}: ГРЕШКА - ${v.error}`:
        `${k}: ✅ ${v.inserted} записа`
      ).join('\n');
      setMigrateMsg(summary);
      setMigrateDone(true);
    }catch(e){setMigrateMsg('Грешка: '+e.message)}
    setMigrating(false);
  };

  const handleImportFile=()=>{
    const input=document.createElement('input');
    input.type='file';input.accept='.json';
    input.onchange=async(e)=>{
      const file=e.target.files[0];if(!file)return;
      try{
        const text=await file.text();
        const raw=JSON.parse(text);
        const data={
          tours:raw.tours||[],
          guides:raw.guides||[],
          fuel:raw.fuel||[],
          fines:raw.fines||[],
          carTasks:raw.carTasks||[],
          stopsCarBus:raw.stopsCarBus||[],
          stopsGuide:raw.stopsGuide||[],
          vehicles:raw.vehicles||[],
          roundTrips:raw.roundTrips||[],
          catalog:raw.catalog||[],
          carRentals:raw.carRentals||[],
        };
        const counts=Object.entries(data).map(([k,v])=>`${k}: ${v.length}`).join(', ');
        setMigrateMsg(`Намерени: ${counts}\nКачване...`);
        await handleMigrate(data);
      }catch(err){setMigrateMsg('Грешка при четене: '+err.message)}
    };
    input.click();
  };
  const [preset,setPreset]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const applyPreset=(p)=>{setPreset(p);const r=presetRange(p);setDateFrom(r.from);setDateTo(r.to)};
  const filtered=useMemo(()=>{if(!dateFrom&&!dateTo)return tours;const from=dateFrom?parseDateISO(dateFrom):null;const to=dateTo?parseDateISO(dateTo):null;
    return tours.filter(t=>{const d=parseDate(t.date);if(!d)return false;if(from&&d<from)return false;if(to&&d>to)return false;return true})},[tours,dateFrom,dateTo]);
  const monthStats=useMemo(()=>MONTHS.map((m,i)=>{const mt=filtered.filter(t=>t.month===i+1);
    return{name:m,tours:mt.length,pax:mt.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0),rev:mt.reduce((a,t)=>a+(t.priceToUs||0),0),exp:mt.reduce((a,t)=>a+(t.totalExpenses||0),0)}}),[filtered]);
  const totRev=monthStats.reduce((a,m)=>a+m.rev,0);const totExp=monthStats.reduce((a,m)=>a+m.exp,0);
  const totPax=monthStats.reduce((a,m)=>a+m.pax,0);const totTours=filtered.length;
  const maxRev=Math.max(...monthStats.map(m=>m.rev),1);
  const openTasks=carTasks.filter(t=>t.status!=='ФИНАЛ').length;
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <h2>Dashboard</h2>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <div className="view-toggle">
          <button className={`view-btn ${preset==='7'?'active':''}`} onClick={()=>applyPreset('7')}>7 дни</button>
          <button className={`view-btn ${preset==='30'?'active':''}`} onClick={()=>applyPreset('30')}>30 дни</button>
          <button className={`view-btn ${preset==='90'?'active':''}`} onClick={()=>applyPreset('90')}>90 дни</button>
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
    {supabase && !migrateDone && <div style={{background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:8,padding:16,marginBottom:20,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <span style={{fontSize:14}}>⚠️ Данните са само в браузъра. Натисни за да ги качиш в Supabase базата данни.</span>
      <button onClick={()=>handleMigrate(null)} disabled={migrating} style={{background:'#f59e0b',color:'#fff',border:'none',padding:'8px 20px',borderRadius:6,fontWeight:700,cursor:migrating?'not-allowed':'pointer'}}>{migrating?'Мигрира...':'Качи от браузъра'}</button>
      <button onClick={handleImportFile} disabled={migrating} style={{background:'#3b82f6',color:'#fff',border:'none',padding:'8px 20px',borderRadius:6,fontWeight:700,cursor:migrating?'not-allowed':'pointer'}}>📁 Импорт от JSON файл</button>
      {migrateMsg && <pre style={{fontSize:12,color:'#92400e',margin:0,whiteSpace:'pre-wrap',width:'100%'}}>{migrateMsg}</pre>}
    </div>}
    {migrateDone && <div style={{background:'#ecfdf5',border:'1px solid #10b981',borderRadius:8,padding:16,marginBottom:20}}>
      <span style={{fontSize:14}}>✅ Миграцията завърши!</span>
      <pre style={{fontSize:12,color:'#065f46',margin:'8px 0 0',whiteSpace:'pre-wrap'}}>{migrateMsg}</pre>
    </div>}
    <div className="stats-row">
      <div className="stat-card"><div className="label">Турове</div><div className="value blue">{totTours}</div></div>
      <div className="stat-card"><div className="label">Туристи</div><div className="value">{totPax}</div></div>
      <div className="stat-card"><div className="label">Приходи</div><div className="value green">{totRev.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Разходи</div><div className="value red">{totExp.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Печалба</div><div className={`value ${totRev-totExp>=0?'green':'red'}`}>{(totRev-totExp).toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Гидове</div><div className="value">{guides.length}</div></div>
      <div className="stat-card"><div className="label">Отворени задачи коли</div><div className={`value ${openTasks?'orange':''}`}>{openTasks}</div></div>
      {(()=>{const unreported=filtered.filter(t=>{const s=t.tourStatus||'reservation';return s==='reservation'||s==='done'});return unreported.length>0?<div className="stat-card"><div className="label">Неотчетени турове</div><div className="value orange">{unreported.length}</div></div>:null})()}
    </div>
    <div style={{background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
      <h3 style={{marginBottom:16,fontSize:16}}>Приходи по месеци</h3>
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:200}}>
        {monthStats.map((m,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <span style={{fontSize:11,color:'var(--text2)'}}>{m.rev?m.rev.toFixed(0)+'€':''}</span>
          <div style={{width:'100%',background:m.rev>0?'var(--accent)':'var(--card2)',borderRadius:'4px 4px 0 0',height:`${(m.rev/maxRev)*160}px`,minHeight:2,transition:'height .3s'}}/>
          <span style={{fontSize:10,color:'var(--text2)'}}>{m.name.slice(0,3)}</span>
        </div>)}
      </div>
    </div>
    <div className="dash-two-col" style={{marginTop:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
        <h3 style={{fontSize:14,marginBottom:12}}>Топ доставчици</h3>
        {(()=>{const s={};filtered.forEach(t=>{if(t.supplier)s[t.supplier]=(s[t.supplier]||0)+1});return Object.entries(s).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}><span>{k}</span><strong>{v}</strong></div>)})()}
      </div>
      <div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
        <h3 style={{fontSize:14,marginBottom:12}}>Топ турове</h3>
        {(()=>{const s={};filtered.forEach(t=>{if(t.tour){const n=t.tour.replace(/ - [^-]+$/,'');s[n]=(s[n]||0)+1}});return Object.entries(s).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:250}}>{k}</span><strong>{v}</strong></div>)})()}
      </div>
    </div>
    {(()=>{const dayNames=['Пон','Вто','Сря','Чет','Пет','Съб','Нед'];const dayCounts=[0,0,0,0,0,0,0];
      filtered.forEach(t=>{const d=parseDate(t.date);if(d){dayCounts[(d.getDay()+6)%7]++}});const maxD=Math.max(...dayCounts,1);
      return <div style={{marginTop:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
        <h3 style={{marginBottom:16,fontSize:16}}>Турове по ден от седмицата</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:180}}>
          {dayNames.map((name,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <span style={{fontSize:12,fontWeight:700}}>{dayCounts[i]}</span>
            <div style={{width:'100%',background:i>=5?'var(--orange)':'var(--accent)',borderRadius:'4px 4px 0 0',height:`${(dayCounts[i]/maxD)*140}px`,minHeight:2,transition:'height .3s'}}/>
            <span style={{fontSize:12,color:'var(--text2)',fontWeight:i>=5?700:400}}>{name}</span>
          </div>)}
        </div>
      </div>})()}
    {(()=>{const tourProfit={};filtered.forEach(t=>{if(!t.tour)return;const name=t.tour.replace(/ - [^-]+$/,'');
      if(!tourProfit[name])tourProfit[name]={rev:0,exp:0,count:0,pax:0};tourProfit[name].rev+=(t.priceToUs||0);tourProfit[name].exp+=(t.totalExpenses||0);tourProfit[name].count++;tourProfit[name].pax+=(t.adults||0)+(t.children||0)});
      const sorted=Object.entries(tourProfit).map(([name,d])=>({name,profit:d.rev-d.exp,rev:d.rev,exp:d.exp,count:d.count,pax:d.pax,avgProfit:d.count?(d.rev-d.exp)/d.count:0})).sort((a,b)=>b.profit-a.profit);
      const maxP=Math.max(...sorted.map(s=>Math.abs(s.profit)),1);
      return <div style={{marginTop:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
        <h3 style={{marginBottom:16,fontSize:16}}>Най-печеливши турове</h3>
        <table style={{width:'100%',fontSize:13}}><thead><tr><th style={{textAlign:'left',padding:'6px 8px'}}>Тур</th><th style={{textAlign:'center',padding:'6px 8px'}}>Брой</th><th style={{textAlign:'center',padding:'6px 8px'}}>Пакс</th><th style={{textAlign:'right',padding:'6px 8px'}}>Приходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Разходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Печалба €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Ср./тур</th><th style={{width:'25%'}}></th></tr></thead>
        <tbody>{sorted.slice(0,10).map((t,i)=><tr key={i}><td style={{padding:'6px 8px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.name}>{t.name}</td><td style={{textAlign:'center',padding:'6px 8px'}}>{t.count}</td><td style={{textAlign:'center',padding:'6px 8px'}}>{t.pax}</td><td style={{textAlign:'right',padding:'6px 8px',color:'var(--green)'}}>{t.rev.toFixed(2)}</td><td style={{textAlign:'right',padding:'6px 8px',color:'var(--red)'}}>{t.exp.toFixed(2)}</td><td style={{textAlign:'right',padding:'6px 8px',fontWeight:700,color:t.profit>=0?'var(--green)':'var(--red)'}}>{t.profit.toFixed(2)}</td><td style={{textAlign:'right',padding:'6px 8px',color:'var(--text2)'}}>{t.avgProfit.toFixed(2)}</td>
          <td style={{padding:'6px 8px'}}><div style={{background:'var(--card2)',borderRadius:3,height:8,overflow:'hidden'}}><div style={{width:`${(Math.abs(t.profit)/maxP)*100}%`,height:'100%',background:t.profit>=0?'var(--green)':'var(--red)',borderRadius:3}}/></div></td></tr>)}</tbody></table>
      </div>})()}
    {(()=>{const carData={};filtered.forEach(t=>{const car=t.carNumber;if(!car||car==='пешеходен')return;if(!carData[car])carData[car]={days:new Set(),tours:0,pax:0,rev:0,exp:0};
      const dayKey=t.date+'|'+t.tour.replace(/ - [^-]+$/,'');carData[car].days.add(dayKey);carData[car].tours++;carData[car].pax+=(t.adults||0)+(t.children||0);carData[car].rev+=(t.priceToUs||0);carData[car].exp+=(t.totalExpenses||0)});
      const sorted=Object.entries(carData).map(([car,d])=>({car,tourDays:d.days.size,bookings:d.tours,pax:d.pax,rev:d.rev,exp:d.exp,profit:d.rev-d.exp})).sort((a,b)=>b.tourDays-a.tourDays);
      const maxDays=Math.max(...sorted.map(s=>s.tourDays),1);
      return <div style={{marginTop:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
        <h3 style={{marginBottom:4,fontSize:16}}>Натовареност по коли</h3>
        <p style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>Тур-дни = уникални дни с тур. Резервации = общ брой записи.</p>
        <table style={{width:'100%',fontSize:13}}><thead><tr><th style={{textAlign:'left',padding:'6px 8px'}}>Кола</th><th style={{textAlign:'center',padding:'6px 8px'}}>Тур-дни</th><th style={{textAlign:'center',padding:'6px 8px'}}>Резервации</th><th style={{textAlign:'center',padding:'6px 8px'}}>Пакс</th><th style={{textAlign:'right',padding:'6px 8px'}}>Приходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Разходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Печалба €</th><th style={{width:'25%'}}></th></tr></thead>
        <tbody>{sorted.map((c,i)=><tr key={i}><td style={{padding:'6px 8px',fontWeight:600}}>{c.car}</td><td style={{textAlign:'center',padding:'6px 8px',fontWeight:700,color:'var(--accent)'}}>{c.tourDays}</td><td style={{textAlign:'center',padding:'6px 8px'}}>{c.bookings}</td><td style={{textAlign:'center',padding:'6px 8px'}}>{c.pax}</td><td style={{textAlign:'right',padding:'6px 8px',color:'var(--green)'}}>{c.rev.toFixed(2)}</td><td style={{textAlign:'right',padding:'6px 8px',color:'var(--red)'}}>{c.exp.toFixed(2)}</td><td style={{textAlign:'right',padding:'6px 8px',fontWeight:700,color:c.profit>=0?'var(--green)':'var(--red)'}}>{c.profit.toFixed(2)}</td>
          <td style={{padding:'6px 8px'}}><div style={{background:'var(--card2)',borderRadius:3,height:8,overflow:'hidden'}}><div style={{width:`${(c.tourDays/maxDays)*100}%`,height:'100%',background:'var(--accent)',borderRadius:3}}/></div></td></tr>)}</tbody></table>
      </div>})()}
  </div>
}

export default Dashboard;
