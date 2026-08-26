import React, { useState, useMemo } from 'react';
import { parseDate, parseDateISO, presetRange, fmtBG, serviceCoversDay, MONTHS } from '../utils/helpers';

// Приема и двата формата дати (dd.mm.yyyy и yyyy-mm-dd) — стари записи може да са ISO
const parseAnyDate=(s)=>parseDate(s)||parseDateISO(s);
// Сравнение на имена на коли, устойчиво на разлики в интервали/главни букви
const sameCar=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
// Хлабаво съпоставяне за свободен текст (STOP записите) — както в Автопарка:
// "CB1234AK" съвпада с "Опел Виваро CB1234AK" и обратно
const fuzzyCar=(free,name)=>{
  if(!free||!name)return false;
  const a=String(free).toLowerCase().replace(/\s/g,''),b=String(name).toLowerCase().replace(/\s/g,'');
  if(a===b||(a.length>=4&&b.includes(a))||(b.length>=4&&a.includes(b)))return true;
  // Съвпадение по цифрите: "4806" / "E klasa 4806" (латиница) ↔ "Е класа 4806".
  // Хваща кирилица/латиница и частични имена — номерът е най-сигурният белег.
  const da=a.replace(/\D/g,''),db=b.replace(/\D/g,'');
  return da.length>=3&&da===db;
};

function Dashboard({tours,guides,fuel,carTasks,vehicles,fines,stopsCarBus,stopsGuide,catalog,carRentals,roundTrips,serviceRecords,onOpenRecord}){
  const [preset,setPreset]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [compareYears,setCompareYears]=useState(false);
  // Гант "Заетост на колите": прозорец от GANTT_DAYS дни, местим с ‹ › по седмица
  const GANTT_DAYS=14;
  const [ganttStart,setGanttStart]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return d});
  // Избор на дни в Гант-а: {car, a, b} — индекси в ganttDays. Първи клик на
  // празна клетка започва избора, следващ клик на същия ред разширява диапазона.
  const [ganttSel,setGanttSel]=useState(null);
  const ganttCellClick=(car,i)=>setGanttSel(p=>{
    if(p&&p.car===car&&p.a===i&&p.b===i)return null; // клик върху единствената избрана клетка = отказ
    return p&&p.car===car?{car,a:p.a,b:i}:{car,a:i,b:i};
  });
  const ganttDays=useMemo(()=>Array.from({length:GANTT_DAYS},(_,i)=>new Date(ganttStart.getFullYear(),ganttStart.getMonth(),ganttStart.getDate()+i)),[ganttStart]);
  const ganttRows=useMemo(()=>{
    return (vehicles||[]).filter(v=>v.active).map(v=>{
      const days=ganttDays.map(day=>{
        const segs=[];
        tours.forEach(t=>{
          if(!sameCar(t.carNumber,v.name)||(t.tourStatus||'reservation')==='cancelled')return;
          const d=parseAnyDate(t.date);
          if(d&&d.getTime()===day.getTime())segs.push({type:t.isEvening?'evening':'day',txt:(t.isEvening?'🌙 Вечерен тур: ':'☀️ Дневен тур: ')+(t.tour||'')+(t.pickupTime?' ('+t.pickupTime+')':''),page:'tours',target:{id:t.id}});
        });
        (roundTrips||[]).forEach(rt=>{
          if(!sameCar(rt.vehicle,v.name)||rt.status==='cancelled')return;
          const f=parseAnyDate(rt.dateFrom),to=parseAnyDate(rt.dateTo);
          if(f&&to&&day>=f&&day<=to)segs.push({type:'rt',txt:'🧭 Обиколен тур'+(rt.name?': '+rt.name:''),page:'roundTrips',target:{id:rt.id}});
        });
        (carRentals||[]).forEach(r=>{
          if(!sameCar(r.vehicle,v.name))return;
          const f=parseAnyDate(r.dateFrom),to=parseAnyDate(r.dateTo||r.dateFrom);
          if(f&&to&&day>=f&&day<=to)segs.push({type:'rental',txt:'🔑 Наем'+(r.client?': '+r.client:'')+(r.timeFrom?' '+r.timeFrom+'–'+(r.timeTo||''):''),page:'carRental',target:{id:r.id}});
        });
        (serviceRecords||[]).forEach(sr=>{
          if(sameCar(sr.carName,v.name)&&serviceCoversDay(sr,day))segs.push({type:'service',txt:'🔧 Сервиз'+(sr.description?': '+sr.description:''),page:'fleet',target:{car:v.name}});
        });
        (stopsCarBus||[]).forEach(s=>{
          if(!fuzzyCar(s.vehicle,v.name))return;
          const f=parseAnyDate(s.startDate),to=parseAnyDate(s.endDate);
          if(f&&to&&day>=f&&day<=to)segs.push({type:'service',txt:'⛔ STOP'+(s.who?': '+s.who:''),page:'fleet',target:{car:v.name}});
        });
        return segs;
      });
      return{name:v.name,seats:v.seats,days};
    });
  },[vehicles,tours,roundTrips,carRentals,serviceRecords,stopsCarBus,ganttDays]);
  // Дублирани Booking номера: същият номер от същия доставчик в няколко
  // неотменени резервации = вероятно двойно въведена резервация
  const dupBookings=useMemo(()=>{
    const map={};
    tours.forEach(t=>{
      const bn=(t.bookingNumber||'').trim();
      if(!bn||(t.tourStatus||'reservation')==='cancelled')return;
      const key=(t.supplier||'').trim().toLowerCase()+'|'+bn.toLowerCase();
      (map[key]=map[key]||[]).push(t);
    });
    return Object.values(map).filter(g=>g.length>1);
  },[tours]);
  // Сравнение по години: пълни календарни години от всички турове,
  // независимо от избрания период — иначе сравнението е ябълки с круши
  const yearCompare=useMemo(()=>{
    if(!compareYears)return null;
    const years=[...new Set(tours.map(t=>t.year).filter(Boolean))].sort((a,b)=>a-b);
    return years.map(y=>{
      const yt=tours.filter(t=>t.year===y);
      const monthly=MONTHS.map((_,i)=>yt.filter(t=>t.month===i+1).reduce((a,t)=>a+(t.priceToUs||0),0));
      return{year:y,tours:yt.length,pax:yt.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0),rev:yt.reduce((a,t)=>a+(t.priceToUs||0),0),exp:yt.reduce((a,t)=>a+(t.totalExpenses||0),0),monthly};
    });
  },[compareYears,tours]);
  // Сравнение на периоди: при избран период — предходният период със същата
  // дължина + същият период през миналите години. Без период → сравнение по години.
  const periodCompare=useMemo(()=>{
    if(!compareYears||!dateFrom||!dateTo)return null;
    const from=parseDateISO(dateFrom),to=parseDateISO(dateTo);
    if(!from||!to||to<from)return null;
    const DAY=86400000;
    const len=Math.round((to-from)/DAY)+1;
    const shiftY=(d,n)=>new Date(d.getFullYear()+n,d.getMonth(),d.getDate());
    const ranges=[
      {label:'Текущ период',from,to,current:true},
      {label:'Предходен период ('+len+' дни)',from:new Date(from.getTime()-len*DAY),to:new Date(from.getTime()-DAY)},
      {label:'Същият период −1 г.',from:shiftY(from,-1),to:shiftY(to,-1)},
      {label:'Същият период −2 г.',from:shiftY(from,-2),to:shiftY(to,-2)},
    ];
    const rows=ranges.map(r=>{
      const rt=tours.filter(t=>{const d=parseDate(t.date);return d&&d>=r.from&&d<=r.to});
      return{...r,tours:rt.length,pax:rt.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0),rev:rt.reduce((a,t)=>a+(t.priceToUs||0),0),exp:rt.reduce((a,t)=>a+(t.totalExpenses||0),0)};
    });
    // −2 г. се показва само ако там изобщо има данни
    return rows.filter((r,i)=>i<3||r.tours>0);
  },[compareYears,tours,dateFrom,dateTo]);
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
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,cursor:'pointer',userSelect:'none',background:'var(--card)',padding:'4px 10px',borderRadius:4,border:'1px solid '+(compareYears?'var(--accent)':'var(--border)'),color:compareYears?'var(--accent)':'var(--text2)'}}>
          <input type="checkbox" checked={compareYears} onChange={e=>setCompareYears(e.target.checked)}/>
          📅 Сравни с минали години
        </label>
        <span style={{fontSize:12,color:'var(--text2)',background:'var(--card)',padding:'4px 10px',borderRadius:4,border:'1px solid var(--border)'}}>{filtered.length} от {tours.length} тура</span>
      </div>
    </div>
    {(()=>{
      const today=new Date();today.setHours(0,0,0,0);
      const COLORS={day:'var(--accent)',evening:'#8B5CF6',rt:'var(--green)',rental:'var(--orange)',service:'var(--red)'};
      const LEGEND=[['day','Дневен тур'],['evening','Вечерен тур'],['rt','Обиколен тур'],['rental','Наем'],['service','Сервиз/STOP']];
      const DOW=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
      const todayIdx=ganttDays.findIndex(d=>d.getTime()===today.getTime());
      const freeToday=todayIdx>=0?ganttRows.filter(r=>r.days[todayIdx].length===0).length:null;
      const shift=(n)=>{setGanttSel(null);setGanttStart(p=>new Date(p.getFullYear(),p.getMonth(),p.getDate()+n))};
      const resetToday=()=>{const d=new Date();d.setHours(0,0,0,0);setGanttSel(null);setGanttStart(d)};
      const selLo=ganttSel?Math.min(ganttSel.a,ganttSel.b):-1;
      const selHi=ganttSel?Math.max(ganttSel.a,ganttSel.b):-1;
      return <div style={{marginBottom:20,background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <h3 style={{fontSize:16}}>🚐 Заетост на колите</h3>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {freeToday!=null&&<span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:12,background:freeToday>0?'rgba(45,138,78,.12)':'rgba(220,38,38,.1)',color:freeToday>0?'var(--green)':'var(--red)'}}>Свободни днес: {freeToday} от {ganttRows.length}</span>}
            <div className="view-toggle">
              <button className="view-btn" onClick={()=>shift(-7)}>‹</button>
              <button className="view-btn" onClick={resetToday}>Днес</button>
              <button className="view-btn" onClick={()=>shift(7)}>›</button>
            </div>
          </div>
        </div>
        {ganttRows.length===0?<p style={{fontSize:13,color:'var(--text2)'}}>Няма активни коли в регистъра.</p>:
        <div style={{overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:`130px repeat(${GANTT_DAYS},minmax(34px,1fr))`,gap:2,minWidth:640}}>
            <div/>
            {ganttDays.map((d,i)=>{const isToday=d.getTime()===today.getTime();const wknd=d.getDay()===0||d.getDay()===6;
              return <div key={i} style={{textAlign:'center',fontSize:10,padding:'2px 0',borderRadius:4,background:isToday?'var(--accent)':'transparent',color:isToday?'#fff':wknd?'var(--orange)':'var(--text2)',fontWeight:isToday||wknd?700:400}}>
                <div>{DOW[d.getDay()]}</div><div style={{fontSize:11}}>{d.getDate()}.{String(d.getMonth()+1).padStart(2,'0')}</div>
              </div>})}
            {ganttRows.map(r=><React.Fragment key={r.name}>
              <div style={{fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:4,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}} title={r.name+(r.seats?' ('+r.seats+')':'')}>{r.name}</div>
              {r.days.map((segs,i)=>{const isToday=ganttDays[i].getTime()===today.getTime();
                const isSel=ganttSel&&ganttSel.car===r.name&&i>=selLo&&i<=selHi;
                return <div key={i} title={segs.length?undefined:'Свободна — клик за избор на дни (наем/сервиз/STOP)'} onClick={segs.length?undefined:()=>ganttCellClick(r.name,i)} style={{height:26,borderRadius:4,display:'flex',flexDirection:'column',gap:1,padding:1,background:isSel?'rgba(234,88,12,.25)':isToday?'rgba(79,70,229,.08)':'var(--card2)',border:isSel?'1px solid var(--orange)':'1px solid transparent',cursor:segs.length?'default':'pointer'}}>
                  {segs.slice(0,3).map((s,j)=><div key={j} title={s.txt+'\n(клик за отваряне)'} onClick={()=>onOpenRecord&&onOpenRecord(s.page,s.target)} style={{flex:1,borderRadius:2,background:COLORS[s.type]||'var(--text2)',cursor:'pointer'}}/>)}
                </div>})}
            </React.Fragment>)}
          </div>
          {ganttSel&&(()=>{
            const d1=fmtBG(ganttDays[selLo]),d2=fmtBG(ganttDays[selHi]);
            const nDays=selHi-selLo+1;
            const go=(page,target)=>{setGanttSel(null);onOpenRecord&&onOpenRecord(page,target)};
            return <div style={{marginTop:10,padding:'10px 12px',borderRadius:8,background:'rgba(234,88,12,.06)',border:'1px solid rgba(234,88,12,.3)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{fontSize:13,fontWeight:700}}>{ganttSel.car}: {d1}{selHi>selLo?' – '+d2:''} <span style={{fontWeight:400,color:'var(--text2)'}}>({nDays} {nDays===1?'ден':'дни'})</span></span>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>go('carRental',{create:{vehicle:ganttSel.car,dateFrom:d1,dateTo:d2}})}>🔑 Нов наем</button>
                <button className="btn btn-primary btn-sm" style={{background:'var(--red)'}} onClick={()=>go('fleet',{car:ganttSel.car,service:{date:d1,dateOut:d2}})}>🔧 Сервиз</button>
                <button className="btn btn-primary btn-sm" style={{background:'var(--text2)'}} onClick={()=>go('stopsCarBus',{create:{vehicle:ganttSel.car,startDate:d1,endDate:d2}})}>⛔ STOP</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setGanttSel(null)}>✕ Отказ</button>
              </div>
              <span style={{fontSize:11,color:'var(--text2)',width:'100%'}}>Клик на друга празна клетка от същия ред разширява периода.</span>
            </div>})()}
          <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
            {LEGEND.map(([k,l])=><span key={k} style={{fontSize:11,display:'flex',alignItems:'center',gap:5,color:'var(--text2)'}}><span style={{width:10,height:10,borderRadius:3,background:COLORS[k],display:'inline-block'}}/>{l}</span>)}
            <span style={{fontSize:11,color:'var(--text2)'}}>Празна клетка = свободна, клик я избира за наем/сервиз/STOP · заетите блокчета се отварят с клик</span>
          </div>
        </div>}
      </div>})()}
    {dupBookings.length>0&&<div style={{marginBottom:20,background:'rgba(220,38,38,.05)',borderRadius:8,padding:16,border:'2px solid rgba(192,57,43,.35)'}}>
      <h3 style={{fontSize:15,marginBottom:8,color:'var(--red)'}}>🚨 Дублирани Booking номера ({dupBookings.length})</h3>
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>Един и същ номер от същия доставчик в няколко резервации — вероятно двойно въведени. Клик върху резервация я отваря.</p>
      {dupBookings.slice(0,8).map((g,i)=><div key={i} style={{padding:'8px 10px',marginBottom:6,borderRadius:6,background:'var(--card)',border:'1px solid var(--border)',fontSize:13}}>
        <div style={{fontWeight:700,marginBottom:4}}>Booking # {g[0].bookingNumber} <span style={{fontWeight:400,color:'var(--text2)'}}>— {g[0].supplier||'без доставчик'} ({g.length} записа)</span></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {g.map(t=><span key={t.id} onClick={()=>onOpenRecord&&onOpenRecord('tours',{id:t.id})} style={{cursor:'pointer',padding:'3px 8px',borderRadius:4,fontSize:12,background:'rgba(220,38,38,.08)',border:'1px solid rgba(192,57,43,.2)'}} title="Клик за отваряне">
            {t.date||'без дата'} — {(t.tour||'').replace(/ - [^-]+$/,'')||'—'} — {t.name||'без име'}
          </span>)}
        </div>
      </div>)}
      {dupBookings.length>8&&<div style={{fontSize:12,color:'var(--text2)'}}>… и още {dupBookings.length-8} групи</div>}
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
    {compareYears&&periodCompare&&(()=>{
      const rows=periodCompare;const cur=rows[0];
      const maxRev2=Math.max(...rows.map(r=>r.rev),1);
      const pct=(curV,base)=>base?<span style={{fontSize:11,fontWeight:700,color:curV>=base?'var(--green)':'var(--red)',marginLeft:6}}>{curV>=base?'▲':'▼'} {Math.abs((curV-base)/base*100).toFixed(1)}%</span>:null;
      return <div style={{marginBottom:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
        <h3 style={{marginBottom:4,fontSize:16}}>Сравнение на периоди</h3>
        <p style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>Процентите показват как текущият период стои спрямо съответния минал период.</p>
        <div className="scroll-table"><table style={{width:'100%',fontSize:13}}>
          <thead><tr><th style={{textAlign:'left',padding:'6px 8px'}}>Период</th><th style={{textAlign:'left',padding:'6px 8px'}}>Дати</th><th style={{textAlign:'center',padding:'6px 8px'}}>Турове</th><th style={{textAlign:'center',padding:'6px 8px'}}>Пакс</th><th style={{textAlign:'right',padding:'6px 8px'}}>Приходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Разходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Печалба €</th><th style={{width:'18%'}}></th></tr></thead>
          <tbody>{rows.map((r,i)=>{const profit=r.rev-r.exp;const curProfit=cur.rev-cur.exp;
            return <tr key={i} style={{background:r.current?'rgba(79,70,229,.05)':'transparent'}}>
              <td style={{padding:'6px 8px',fontWeight:r.current?700:600,color:r.current?'var(--accent)':'inherit'}}>{r.label}</td>
              <td style={{padding:'6px 8px',fontSize:12,color:'var(--text2)',whiteSpace:'nowrap'}}>{fmtBG(r.from)} – {fmtBG(r.to)}</td>
              <td style={{textAlign:'center',padding:'6px 8px'}}>{r.tours}{!r.current&&pct(cur.tours,r.tours)}</td>
              <td style={{textAlign:'center',padding:'6px 8px'}}>{r.pax}{!r.current&&pct(cur.pax,r.pax)}</td>
              <td style={{textAlign:'right',padding:'6px 8px',color:'var(--green)'}}>{r.rev.toFixed(2)}{!r.current&&pct(cur.rev,r.rev)}</td>
              <td style={{textAlign:'right',padding:'6px 8px',color:'var(--red)'}}>{r.exp.toFixed(2)}</td>
              <td style={{textAlign:'right',padding:'6px 8px',fontWeight:700,color:profit>=0?'var(--green)':'var(--red)'}}>{profit.toFixed(2)}{!r.current&&pct(curProfit,profit)}</td>
              <td style={{padding:'6px 8px'}}><div style={{background:'var(--card2)',borderRadius:3,height:8,overflow:'hidden'}}><div style={{width:`${(r.rev/maxRev2)*100}%`,height:'100%',background:r.current?'var(--accent)':'#94a3b8',borderRadius:3}}/></div></td>
            </tr>})}</tbody>
        </table></div>
      </div>})()}
    {compareYears&&!periodCompare&&yearCompare&&(()=>{
      const ys=yearCompare;const n=ys.length;
      const colorOf=(i)=>['var(--accent)','#8B5CF6','var(--orange)','#94a3b8'][n-1-i]||'#94a3b8';
      const maxM=Math.max(...ys.flatMap(y=>y.monthly),1);
      const pct=(cur,prev)=>prev?<span style={{fontSize:11,fontWeight:700,color:cur>=prev?'var(--green)':'var(--red)',marginLeft:6}}>{cur>=prev?'▲':'▼'} {Math.abs((cur-prev)/prev*100).toFixed(1)}%</span>:null;
      return <div style={{marginBottom:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
        <h3 style={{marginBottom:4,fontSize:16}}>Сравнение по години</h3>
        <p style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>Пълни календарни години от всички данни, независимо от избрания период. Процентите са спрямо предишната година.</p>
        {n===0&&<p style={{fontSize:13,color:'var(--text2)'}}>Няма данни с попълнена година.</p>}
        {n>0&&<>
        <div className="scroll-table"><table style={{width:'100%',fontSize:13}}>
          <thead><tr><th style={{textAlign:'left',padding:'6px 8px'}}>Година</th><th style={{textAlign:'center',padding:'6px 8px'}}>Турове</th><th style={{textAlign:'center',padding:'6px 8px'}}>Пакс</th><th style={{textAlign:'right',padding:'6px 8px'}}>Приходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Разходи €</th><th style={{textAlign:'right',padding:'6px 8px'}}>Печалба €</th></tr></thead>
          <tbody>{ys.map((y,i)=>{const prev=ys[i-1];const profit=y.rev-y.exp;const prevProfit=prev?prev.rev-prev.exp:null;
            return <tr key={y.year}>
              <td style={{padding:'6px 8px',fontWeight:700}}><span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:colorOf(i),marginRight:6,verticalAlign:'middle'}}/>{y.year}</td>
              <td style={{textAlign:'center',padding:'6px 8px'}}>{y.tours}{prev?pct(y.tours,prev.tours):null}</td>
              <td style={{textAlign:'center',padding:'6px 8px'}}>{y.pax}{prev?pct(y.pax,prev.pax):null}</td>
              <td style={{textAlign:'right',padding:'6px 8px',color:'var(--green)'}}>{y.rev.toFixed(2)}{prev?pct(y.rev,prev.rev):null}</td>
              <td style={{textAlign:'right',padding:'6px 8px',color:'var(--red)'}}>{y.exp.toFixed(2)}</td>
              <td style={{textAlign:'right',padding:'6px 8px',fontWeight:700,color:profit>=0?'var(--green)':'var(--red)'}}>{profit.toFixed(2)}{prevProfit!=null?pct(profit,prevProfit):null}</td>
            </tr>})}</tbody>
        </table></div>
        <h4 style={{margin:'18px 0 12px',fontSize:13,color:'var(--text2)'}}>ПРИХОДИ ПО МЕСЕЦИ ПО ГОДИНИ</h4>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:180}}>
          {MONTHS.map((m,mi)=><div key={mi} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{width:'100%',display:'flex',alignItems:'flex-end',gap:2,height:150,justifyContent:'center'}}>
              {ys.map((y,i)=><div key={y.year} title={y.year+' '+m+': '+y.monthly[mi].toFixed(2)+' €'} style={{flex:1,maxWidth:18,background:y.monthly[mi]>0?colorOf(i):'var(--card2)',borderRadius:'3px 3px 0 0',height:`${(y.monthly[mi]/maxM)*150}px`,minHeight:2,transition:'height .3s'}}/>)}
            </div>
            <span style={{fontSize:10,color:'var(--text2)'}}>{m.slice(0,3)}</span>
          </div>)}
        </div>
        <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
          {ys.map((y,i)=><span key={y.year} style={{fontSize:12,display:'flex',alignItems:'center',gap:5}}><span style={{width:10,height:10,borderRadius:3,background:colorOf(i),display:'inline-block'}}/>{y.year}</span>)}
        </div>
        </>}
      </div>})()}
    {compareYears&&(periodCompare||yearCompare)&&(()=>{
      // Общи сравнителни разрези (дни от седмицата, коли, доставчици) —
      // групите са периодите (при избран период) или календарните години
      const period=!!periodCompare;
      const base=period?[...periodCompare].reverse():yearCompare;
      const gs=base.map((r,i)=>({
        label:period?(r.current?'Текущ':r.label.startsWith('Предходен')?'Предходен':r.label.includes('−1')?'−1 г.':'−2 г.'):String(r.year),
        current:period?!!r.current:i===base.length-1,
        tours:period?tours.filter(t=>{const d=parseDate(t.date);return d&&d>=r.from&&d<=r.to}):tours.filter(t=>t.year===r.year),
      }));
      const n=gs.length;
      const colorOf=(i)=>['var(--accent)','#8B5CF6','var(--orange)','#94a3b8'][n-1-i]||'#94a3b8';
      const curIdx=gs.findIndex(g=>g.current);
      const refIdx=period?gs.findIndex(g=>g.label==='−1 г.'):curIdx-1;
      const pct=(cur,ref)=>ref?<span style={{fontSize:11,fontWeight:700,color:cur>=ref?'var(--green)':'var(--red)'}}>{cur>=ref?'▲':'▼'}{Math.abs((cur-ref)/ref*100).toFixed(0)}%</span>:null;
      const dayNames=['Пон','Вто','Сря','Чет','Пет','Съб','Нед'];
      const dayCounts=gs.map(g=>{const c=[0,0,0,0,0,0,0];g.tours.forEach(t=>{const d=parseDate(t.date);if(d)c[(d.getDay()+6)%7]++});return c});
      const maxDay=Math.max(...dayCounts.flat(),1);
      const carMap={};
      gs.forEach((g,i)=>g.tours.forEach(t=>{const car=(t.carNumber||'').trim();if(!car||car==='пешеходен')return;
        if(!carMap[car])carMap[car]=gs.map(()=>new Set());
        carMap[car][i].add(t.date+'|'+(t.tour||'').replace(/ - [^-]+$/,''))}));
      const carRows=Object.entries(carMap).map(([name,sets])=>({name,vals:sets.map(s=>s.size)}))
        .sort((a,b)=>b.vals.reduce((x,y)=>x+y,0)-a.vals.reduce((x,y)=>x+y,0)).slice(0,10);
      const supMap={};
      gs.forEach((g,i)=>g.tours.forEach(t=>{if(!t.supplier)return;if(!supMap[t.supplier])supMap[t.supplier]=gs.map(()=>0);supMap[t.supplier][i]++}));
      const supRows=Object.entries(supMap).map(([name,vals])=>({name,vals}))
        .sort((a,b)=>b.vals.reduce((x,y)=>x+y,0)-a.vals.reduce((x,y)=>x+y,0)).slice(0,10);
      const cmpTable=(title,rows,hint)=><div style={{background:'var(--card)',borderRadius:8,padding:16,border:'1px solid var(--border)'}}>
        <h3 style={{fontSize:14,marginBottom:4}}>{title}</h3>
        <p style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>{hint}{refIdx>=0?' · % — '+gs[curIdx].label+' спрямо '+gs[refIdx].label:''}</p>
        {rows.length===0?<p style={{fontSize:12,color:'var(--text2)'}}>Няма данни.</p>:
        <div className="scroll-table"><table style={{width:'100%',fontSize:12}}>
          <thead><tr><th style={{textAlign:'left',padding:'4px 6px'}}></th>{gs.map((g,i)=><th key={i} style={{textAlign:'center',padding:'4px 6px',color:g.current?'var(--accent)':'var(--text2)',whiteSpace:'nowrap'}}>{g.label}</th>)}<th style={{width:60}}></th></tr></thead>
          <tbody>{rows.map(r=><tr key={r.name}>
            <td style={{padding:'4px 6px',fontWeight:600,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.name}>{r.name}</td>
            {r.vals.map((v,i)=><td key={i} style={{textAlign:'center',padding:'4px 6px',fontWeight:i===curIdx?700:400}}>{v}</td>)}
            <td style={{textAlign:'right',padding:'4px 6px',whiteSpace:'nowrap'}}>{refIdx>=0?pct(r.vals[curIdx],r.vals[refIdx]):null}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>;
      return <>
        <div style={{marginBottom:20,background:'var(--card)',borderRadius:8,padding:20,border:'1px solid var(--border)'}}>
          <h3 style={{marginBottom:16,fontSize:16}}>Натовареност по дни от седмицата — сравнение</h3>
          <div style={{display:'flex',alignItems:'flex-end',gap:10,height:170}}>
            {dayNames.map((name,di)=><div key={di} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{width:'100%',display:'flex',alignItems:'flex-end',gap:2,height:140,justifyContent:'center'}}>
                {gs.map((g,i)=><div key={i} title={g.label+' '+name+': '+dayCounts[i][di]+' тура'} style={{flex:1,maxWidth:16,background:dayCounts[i][di]>0?colorOf(i):'var(--card2)',borderRadius:'3px 3px 0 0',height:`${(dayCounts[i][di]/maxDay)*140}px`,minHeight:2}}/>)}
              </div>
              <span style={{fontSize:11,color:'var(--text2)',fontWeight:di>=5?700:400}}>{name}</span>
            </div>)}
          </div>
          <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
            {gs.map((g,i)=><span key={i} style={{fontSize:12,display:'flex',alignItems:'center',gap:5}}><span style={{width:10,height:10,borderRadius:3,background:colorOf(i),display:'inline-block'}}/>{g.label}</span>)}
          </div>
        </div>
        <div className="dash-two-col" style={{marginBottom:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {cmpTable('Коли — сравнение',carRows,'Тур-дни (уникални дни с тур)')}
          {cmpTable('Доставчици — сравнение',supRows,'Брой резервации')}
        </div>
      </>})()}
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
