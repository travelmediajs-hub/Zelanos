import React, { useState, useMemo } from 'react';
import MergeCard from './MergeCard';
import { parseDate, MONTHS } from '../utils/helpers';

function PlanningPage({tours,setTours,carRentals,roundTrips,vehicles,guides,stopsCarBus}){
  const now=new Date();
  const [viewMonth,setViewMonth]=useState(now.getMonth());
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [selectedDate,setSelectedDate]=useState(null);
  // Check if tour is fully planned: walking=guide only, car=car+guide+driver (or guideIsDriver)
  const isPlanned=(t)=>{
    const isWalking=t.tourType==='guide_only'||t.tourType==='walking';
    if(isWalking)return !!t.guide;
    if(t.guideIsDriver)return !!t.carNumber&&!!t.guide;
    return !!t.carNumber&&!!t.guide&&!!t.driver;
  };
  const autoStatus=(tour,updates)=>{
    const merged={...tour,...updates};
    const planned=isPlanned(merged);
    if(planned&&(!merged.tourStatus||merged.tourStatus==='reservation'))return{...updates,tourStatus:'planned'};
    if(!planned&&merged.tourStatus==='planned')return{...updates,tourStatus:'reservation'};
    return updates;
  };
  const parseSeatsP=(s)=>{if(!s)return 0;const p=String(s).split('+');return parseInt(p[0])||0};
  const assignCar=(tourId,carName)=>{
    if(carName){
      const tour=tours.find(x=>x.id===tourId);
      const car=activeVehicles.find(v=>v.name===carName);
      if(tour&&car&&car.seats){
        const maxPax=parseSeatsP(car.seats);
        const tourPax=(tour.adults||0)+(tour.children||0);
        // Гидът заема пътническо място освен ако е и шофьор
        const gIsD=!!tour.guideIsDriver;
        const guideSeats=tour.guide&&!gIsD?1:0;
        // Check other tours on same day with same car
        const sameDayOther=tours.filter(t=>t.id!==tourId&&t.carNumber===carName&&t.date===tour.date);
        const sameDayPax=sameDayOther.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0);
        const sameDayGuideSeats=sameDayOther.reduce((a,t)=>{const gd=!!t.guideIsDriver;return a+(t.guide&&!gd?1:0)},0);
        const totalNeeded=tourPax+guideSeats+sameDayPax+sameDayGuideSeats;
        if(maxPax>0&&totalNeeded>maxPax){
          alert('⚠️ Колата '+carName+' има '+car.seats+' места ('+maxPax+' пътнически), но са нужни '+totalNeeded+' (туристи + гид). Избери по-голяма кола!');
          return;
        }
      }
    }
    setTours(prev=>prev.map(t=>{if(t.id!==tourId)return t;const u=autoStatus(t,{carNumber:carName});return{...t,...u}}));setPopover(null)
  };
  const assignGuide=(tourId,guideName)=>{setTours(prev=>prev.map(t=>{if(t.id!==tourId)return t;const u=autoStatus(t,{guide:guideName});return{...t,...u}}));setPopover(null)};
  const assignDriver=(tourId,driverName)=>{setTours(prev=>prev.map(t=>{if(t.id!==tourId)return t;const u=autoStatus(t,{driver:driverName});return{...t,...u}}));setPopover(null)};
  const mergeTours=(tourIds,carName,guideName,driverName,guideIsDriverFlag)=>{
    setTours(prev=>prev.map(t=>{
      if(!tourIds.includes(t.id))return t;
      const updates={carNumber:carName,guide:guideName,driver:guideIsDriverFlag?guideName:driverName,guideIsDriver:guideIsDriverFlag};
      const u=autoStatus(t,updates);
      return{...t,...u};
    }));
  };
  const [popover,setPopover]=useState(null); // {tourId,field:'car'|'guide'|'driver'}
  const popRef=React.useRef(null);
  const [driverInput,setDriverInput]=useState('');
  React.useEffect(()=>{if(!popover)return;const h=e=>{if(popRef.current&&!popRef.current.contains(e.target))setPopover(null)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[popover]);
  React.useEffect(()=>{if(popover&&popover.field==='driver'){const t=tours.find(x=>x.id===popover.tourId);setDriverInput(t&&t.driver||'')}}, [popover]);
  const MNAMES=['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
  const DNAMES=['Пон','Вто','Сря','Чет','Пет','Съб','Нед'];

  const parseDate=(ds)=>{if(!ds)return null;if(ds.includes('.')){const p=ds.split('.');return new Date(+p[2],+p[1]-1,+p[0])}return new Date(ds)};
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const inRange=(day,from,to)=>{if(!from||!to||!day)return false;return day.getTime()>=from.getTime()&&day.getTime()<=to.getTime()};
  const fmtD=(d)=>String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
  const isToday=(d)=>sameDay(d,now);
  const activeVehicles=(vehicles||[]).filter(v=>v.active);
  const activeGuides=(guides||[]).filter(g=>g.name);

  // Build calendar grid cells for the month
  const calendarDays=useMemo(()=>{
    const first=new Date(viewYear,viewMonth,1);
    let startDay=first.getDay()-1;if(startDay<0)startDay=6; // Monday=0
    const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
    const cells=[];
    // Previous month padding
    for(let i=0;i<startDay;i++){const d=new Date(viewYear,viewMonth,-(startDay-1-i));cells.push({date:d,inMonth:false})}
    // Current month
    for(let i=1;i<=daysInMonth;i++){cells.push({date:new Date(viewYear,viewMonth,i),inMonth:true})}
    // Next month padding to fill 6 rows
    while(cells.length<42){const d=new Date(viewYear,viewMonth+1,cells.length-startDay-daysInMonth+1);cells.push({date:d,inMonth:false})}
    return cells;
  },[viewMonth,viewYear]);

  // Index tours and rentals by date string for quick lookup
  const toursByDate=useMemo(()=>{
    const map={};
    tours.forEach(t=>{
      if(!t.date)return;const d=parseDate(t.date);if(!d)return;
      const k=d.toDateString();if(!map[k])map[k]=[];map[k].push(t);
    });
    return map;
  },[tours]);

  const rentalsByDate=useMemo(()=>{
    const map={};
    (carRentals||[]).forEach(r=>{
      if(!r.dateFrom)return;
      const from=parseDate(r.dateFrom),to=parseDate(r.dateTo||r.dateFrom);
      if(!from)return;
      // Expand each rental day
      const cur=new Date(from);const end=to||from;
      while(cur<=end){const k=cur.toDateString();if(!map[k])map[k]=[];map[k].push(r);cur.setDate(cur.getDate()+1)}
    });
    return map;
  },[carRentals]);

  // Index round trips by date for calendar display
  const roundTripsByDate=useMemo(()=>{
    const map={};
    (roundTrips||[]).forEach(rt=>{
      if(!rt.dateFrom||!rt.dateTo||rt.status==='cancelled')return;
      const from=parseDate(rt.dateFrom),to=parseDate(rt.dateTo);
      if(!from||!to)return;
      const cur=new Date(from);
      while(cur<=to){
        const k=cur.toDateString();
        if(!map[k])map[k]=[];
        if(!map[k].find(x=>x.id===rt.id))map[k].push(rt);
        cur.setDate(cur.getDate()+1);
      }
    });
    return map;
  },[roundTrips]);

  // Index service stops by date
  const serviceByDate=useMemo(()=>{
    const map={};
    (stopsCarBus||[]).forEach(st=>{
      if(!st.vehicle||!st.startDate||!st.endDate)return;
      const from=parseDate(st.startDate),to=parseDate(st.endDate);
      if(!from||!to)return;
      const cur=new Date(from);
      while(cur<=to){
        const k=cur.toDateString();
        if(!map[k])map[k]=new Set();
        map[k].add(st.vehicle);
        cur.setDate(cur.getDate()+1);
      }
    });
    return map;
  },[stopsCarBus]);

  const rtBlockedOnDate=useMemo(()=>{
    return (date)=>{
      const cars=new Set(),gds=new Set(),drs=new Set();
      (roundTrips||[]).forEach(rt=>{
        if(rt.status==='cancelled')return;
        const from=parseDate(rt.dateFrom),to=parseDate(rt.dateTo);
        if(!from||!to)return;
        if(date>=from&&date<=to){
          if(rt.vehicle)cars.add(rt.vehicle);
          if(rt.guide)gds.add(rt.guide);
          if(rt.driver)drs.add(rt.driver);
        }
      });
      return{cars,guides:gds,drivers:drs};
    };
  },[roundTrips]);

  const getDayData=(date)=>{
    const k=date.toDateString();
    const dayTours=toursByDate[k]||[];
    const dayRentals=rentalsByDate[k]||[];
    const dayRoundTrips=rtBlockedOnDate(date);
    const dayRTList=roundTripsByDate[k]||[];
    const noCar=dayTours.filter(t=>!t.carNumber);
    const noGuide=dayTours.filter(t=>!t.guide);
    // Busy vehicles
    const busyCars=new Set();
    dayTours.forEach(t=>{if(t.carNumber)busyCars.add(t.carNumber)});
    dayRentals.forEach(r=>{if(r.vehicle)busyCars.add(r.vehicle)});
    dayRoundTrips.cars.forEach(c=>busyCars.add(c));
    const freeCars=activeVehicles.filter(v=>!busyCars.has(v.name));
    // Busy guides
    const busyGuides=new Set();
    dayTours.forEach(t=>{if(t.guide)busyGuides.add(t.guide)});
    dayRoundTrips.guides.forEach(g=>busyGuides.add(g));
    const freeGuides=activeGuides.filter(g=>!busyGuides.has(g.name));
    // Conflicts: vehicles used more than once, but merged tours (same car+guide+driver) don't count
    const carUsage={};
    const carTourGroups={};
    dayTours.forEach(t=>{if(t.carNumber&&t.tourStatus!=='cancelled'){
      if(!carTourGroups[t.carNumber])carTourGroups[t.carNumber]=[];
      carTourGroups[t.carNumber].push(t);
    }});
    Object.entries(carTourGroups).forEach(([car,grp])=>{
      if(grp.length<=1){carUsage[car]=1;return}
      // Check if all tours with this car share guide & driver (merged)
      const allSameGuide=grp.every(t=>t.guide&&t.guide===grp[0].guide);
      const allSameDriver=grp.every(t=>(t.driver||'')===(grp[0].driver||''))|| grp.every(t=>t.guideIsDriver);
      carUsage[car]=allSameGuide&&allSameDriver?1:grp.length;
    });
    dayRentals.forEach(r=>{if(r.vehicle){carUsage[r.vehicle]=(carUsage[r.vehicle]||0)+1}});
    const conflicts=Object.entries(carUsage).filter(([,c])=>c>1).map(([name])=>name);
    const planned=dayTours.filter(t=>isPlanned(t));
    const unplanned=dayTours.filter(t=>!isPlanned(t));
    // Free drivers (from guides who drive)
    const busyDrivers=new Set();
    dayTours.forEach(t=>{if(t.driver)busyDrivers.add(t.driver)});
    dayRoundTrips.drivers.forEach(d=>busyDrivers.add(d));
    const inServiceCars=serviceByDate[k]||new Set();
    // Merge groups: same tour name, same day, can share a vehicle
    const mergeGroups=[];
    const toursByName={};
    dayTours.forEach(t=>{
      if(t.tourStatus==='cancelled')return;
      const baseName=(t.tour||'').replace(/ - [^-]+$/,'').trim();
      if(!baseName)return;
      if(!toursByName[baseName])toursByName[baseName]=[];
      toursByName[baseName].push(t);
    });
    Object.entries(toursByName).forEach(([name,group])=>{
      if(group.length<2)return;
      const totalPax=group.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0);
      // Check if already merged (all have same car, guide, driver)
      const allSameCar=group.every(t=>t.carNumber&&t.carNumber===group[0].carNumber);
      const allSameGuide=group.every(t=>t.guide&&t.guide===group[0].guide);
      const allSameDriver=group.every(t=>t.driver&&t.driver===group[0].driver);
      const alreadyMerged=allSameCar&&allSameGuide&&(allSameDriver||group.every(t=>t.guideIsDriver));
      mergeGroups.push({name,tours:group,totalPax,alreadyMerged});
    });
    return{dayTours,dayRentals,dayRTList,noCar,noGuide,freeCars,freeGuides,conflicts,planned,unplanned,busyDrivers,dayRoundTrips,inServiceCars,mergeGroups};
  };

  const prevMonth=()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1)}else setViewMonth(m=>m-1)};
  const nextMonth=()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1)}else setViewMonth(m=>m+1)};
  const goToday=()=>{setViewMonth(now.getMonth());setViewYear(now.getFullYear());setSelectedDate(now)};

  // Monthly totals
  const monthStats=useMemo(()=>{
    let t=0,r=0,pl=0,unpl=0,conf=0;
    const rtSet=new Set();
    calendarDays.filter(c=>c.inMonth).forEach(c=>{
      const dd=getDayData(c.date);
      t+=dd.dayTours.length;r+=dd.dayRentals.length;
      pl+=dd.planned.length;unpl+=dd.unplanned.length;
      conf+=dd.conflicts.length;
      dd.dayRTList.forEach(rt=>rtSet.add(rt.id));
    });
    return{t,r,pl,unpl,conf,rt:rtSet.size};
  },[calendarDays,toursByDate,rentalsByDate,roundTripsByDate,tours]);

  // Detail panel for selected date
  const selData=selectedDate?getDayData(selectedDate):null;

  const chipStyle=(bg,color)=>({display:'inline-block',padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:600,background:bg,color:color,marginRight:4});

  return <div>
    <div className="topbar"><h2>{'\u{1F4C5}'} Планиране</h2></div>
    <div className="stats-row">
      <div className="stat-card"><div className="label">Турове за {MNAMES[viewMonth]}</div><div className="value blue">{monthStats.t}</div></div>
      <div className="stat-card"><div className="label">Планирани</div><div className="value green">{monthStats.pl}</div></div>
      <div className="stat-card"><div className="label">Непланирани</div><div className="value" style={{color:monthStats.unpl>0?'var(--red)':'var(--green)'}}>{monthStats.unpl}</div></div>
      <div className="stat-card"><div className="label">Обиколни</div><div className="value" style={{color:'var(--accent)'}}>{monthStats.rt}</div></div>
      <div className="stat-card"><div className="label">Наеми</div><div className="value orange">{monthStats.r}</div></div>
      <div className="stat-card"><div className="label">Конфликти</div><div className="value" style={{color:monthStats.conf>0?'var(--red)':'var(--green)'}}>{monthStats.conf}</div></div>
    </div>

    <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
      {/* LEFT: Calendar */}
      <div style={{flex:'1 1 auto',minWidth:0}}>
        {/* Month nav */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>{'◀'}</button>
          <span style={{fontSize:18,fontWeight:700,color:'var(--accent)',minWidth:180,textAlign:'center'}}>{MNAMES[viewMonth]} {viewYear}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>{'▶'}</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday} style={{marginLeft:8}}>Днес</button>
        </div>
        {/* Day headers */}
        <div className="cal-grid">
          {DNAMES.map(d=><div key={d} className="cal-header">{d}</div>)}
          {calendarDays.map((cell,i)=>{
            const dd=getDayData(cell.date);
            const total=dd.dayTours.length+dd.dayRentals.length+dd.dayRTList.length;
            const hasIssue=dd.noCar.length>0||dd.noGuide.length>0||dd.conflicts.length>0;
            const isSel=selectedDate&&sameDay(selectedDate,cell.date);
            return <div key={i} className="cal-day" onClick={()=>setSelectedDate(new Date(cell.date))} style={{
              opacity:cell.inMonth?1:.35,
              cursor:'pointer',
              border:isSel?'2px solid var(--accent)':'1px solid var(--border)',
              background:isToday(cell.date)?'rgba(79,70,229,.06)':isSel?'rgba(79,70,229,.04)':'var(--card)',
              transition:'all .1s'
            }}>
              <div style={{fontWeight:isToday(cell.date)?800:600,fontSize:13,marginBottom:4,color:isToday(cell.date)?'var(--gold)':cell.date.getDay()===0?'var(--red)':'var(--text)'}}>
                {cell.date.getDate()}
              </div>
              {dd.planned.map((t,ti)=>{const nm=(t.tour||t.name||'').replace(/ - [^-]+$/,'');return <div key={'p'+ti} title={t.name||''} style={{...chipStyle('rgba(5,150,105,.1)','var(--green)'),overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',display:'block'}}>{nm.length>18?nm.slice(0,16)+'…':nm}</div>})}
              {dd.unplanned.map((t,ti)=>{const nm=(t.tour||t.name||'').replace(/ - [^-]+$/,'');return <div key={'u'+ti} title={t.name||''} style={{...chipStyle('rgba(234,88,12,.08)','var(--orange)'),overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',display:'block'}}>{nm.length>18?nm.slice(0,16)+'…':nm}</div>})}
              {dd.dayRentals.length>0&&<div title={dd.dayRentals.map(r=>(r.vehicle||'Кола')+' — '+(r.client||'')).join('\n')} style={chipStyle('rgba(59,130,246,.12)','#3B82F6')}>{dd.dayRentals.length} наем</div>}
              {dd.dayRTList.length>0&&<div title={dd.dayRTList.map(rt=>(rt.name||'Обиколен')+' — '+(rt.client||'')).join('\n')} style={chipStyle('rgba(79,70,229,.12)','var(--accent)')}>{dd.dayRTList.length>1?dd.dayRTList.length+' обик.':'🌍 обик.'}</div>}
              {dd.conflicts.length>0&&<div title={dd.conflicts.join(', ')} style={chipStyle('rgba(220,38,38,.1)','var(--red)')}>{'!'} конфл.</div>}
            </div>
          })}
        </div>
      </div>

      {/* RIGHT: Detail panel */}
      <div style={{width:380,minWidth:380,flexShrink:0,position:'sticky',top:24}}>
        {selectedDate&&selData?<div style={{background:'var(--card)',borderRadius:10,border:'1px solid var(--border)',boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden'}}>
          {/* Date header */}
          <div style={{background:'var(--accent)',color:'#fff',padding:'14px 18px'}}>
            <div style={{fontSize:18,fontWeight:700}}>{fmtD(selectedDate)}</div>
            <div style={{fontSize:13,opacity:.8}}>{DNAMES[selectedDate.getDay()===0?6:selectedDate.getDay()-1]}, {MNAMES[selectedDate.getMonth()]}</div>
          </div>
          <div style={{padding:'16px 18px',maxHeight:'70vh',overflowY:'auto'}}>

            {/* Турове */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',marginBottom:8,borderBottom:'2px solid var(--accent)',paddingBottom:4}}>Турове ({selData.dayTours.length})</div>
              {selData.dayTours.length===0&&<div style={{fontSize:12,color:'var(--text2)',padding:'8px 0'}}>Няма турове за този ден</div>}
              {selData.dayTours.map((t,i)=>{const tp=isPlanned(t);const isWalk=t.tourType==='guide_only'||t.tourType==='walking';
              return <div key={i} style={{padding:'8px 10px',marginBottom:6,borderRadius:6,background:tp?'rgba(45,138,78,.04)':'var(--bg)',border:tp?'1px solid rgba(45,138,78,.25)':'1px solid var(--border)',fontSize:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                  <span style={{fontWeight:700}}>{t.tour||t.name||'Тур'}</span>
                  <span className={`badge ${tp?'badge-green':t.tourStatus==='conducted'?'badge-green':t.tourStatus==='cancelled'?'badge-red':'badge-yellow'}`} style={{fontSize:10}}>
                    {tp?'Планиран':t.tourStatus==='conducted'?'Проведен':t.tourStatus==='cancelled'?'Отказан':'Резервация'}
                  </span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'4px 12px',color:'var(--text2)'}}>
                  <span>Клиент: <strong style={{color:'var(--text)'}}>{t.name||'—'}</strong></span>
                  <span style={{background:'rgba(79,70,229,.08)',color:'var(--accent)',padding:'1px 6px',borderRadius:8,fontSize:10,fontWeight:700}}>{(t.adults||0)+(t.children||0)} пакс{t.children?<span style={{opacity:.7}}> ({t.adults}+{t.children}д)</span>:null}</span>
                  {t.pickupTime&&<span>Час: <strong style={{color:'var(--text)'}}>{t.pickupTime}</strong></span>}
                  {isWalk&&<span className="badge badge-blue" style={{fontSize:9}}>Пешеходен</span>}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:6}}>
                  {/* Кола */}
                  {!isWalk&&<div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,color:'var(--text2)',minWidth:50}}>Кола:</span>
                    {t.carNumber?<span style={{display:'flex',alignItems:'center',gap:4}}>
                      <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'car'})}} style={{color:'var(--green)',fontWeight:600,fontSize:11,textDecoration:'underline',textDecorationStyle:'dotted',cursor:'pointer'}}>{t.carNumber}</a>
                      <span onClick={()=>assignCar(t.id,'')} style={{color:'var(--red)',cursor:'pointer',fontSize:13,lineHeight:1}} title="Премахни">{'✕'}</span>
                    </span>:
                    <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'car'})}} style={{color:'var(--red)',fontWeight:600,fontSize:11,textDecoration:'underline',cursor:'pointer'}}>{'✕'} Няма</a>}
                    {popover&&popover.tourId===t.id&&popover.field==='car'&&<div ref={popRef} style={{position:'absolute',right:10,zIndex:50,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.15)',padding:10,minWidth:220,maxHeight:200,overflowY:'auto',marginTop:2}}>
                      <div style={{fontSize:11,color:'var(--text2)',marginBottom:6,fontWeight:600}}>Избери кола:</div>
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        {activeVehicles.map(v=>{
                          const isRT=selData.dayRoundTrips.cars.has(v.name);
                          const isSvc=selData.inServiceCars.has(v.name);
                          const isFree=selData.freeCars.find(fc=>fc.id===v.id);
                          let bg,clr,suffix;
                          if(isRT){bg='rgba(220,38,38,.05)';clr='var(--red)';suffix=' ● обиколен'}
                          else if(isSvc){bg='rgba(234,88,12,.05)';clr='var(--orange)';suffix=' ● сервиз'}
                          else if(!isFree){bg='rgba(217,119,6,.05)';clr='var(--gold)';suffix=' ● заета'}
                          else{bg='rgba(45,138,78,.06)';clr='var(--green)';suffix=''}
                          return <div key={v.id} onClick={()=>assignCar(t.id,v.name)} style={{padding:'5px 8px',borderRadius:5,cursor:'pointer',fontSize:11,background:bg,border:'1px solid '+clr+'25',color:clr,fontWeight:isFree?500:700}} onMouseEnter={e=>e.currentTarget.style.opacity='.8'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>{v.name}{v.seats?' ('+v.seats+')':''}{suffix}</div>
                        })}
                      </div>
                    </div>}
                  </div>}
                  {/* Гид */}
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,color:'var(--text2)',minWidth:50}}>Гид:</span>
                    {t.guide?<span style={{display:'flex',alignItems:'center',gap:4}}>
                      <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'guide'})}} style={{color:'var(--green)',fontWeight:600,fontSize:11,textDecoration:'underline',textDecorationStyle:'dotted',cursor:'pointer'}}>{t.guide}</a>
                      <span onClick={()=>assignGuide(t.id,'')} style={{color:'var(--red)',cursor:'pointer',fontSize:13,lineHeight:1}} title="Премахни">{'✕'}</span>
                    </span>:
                    <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'guide'})}} style={{color:'var(--red)',fontWeight:600,fontSize:11,textDecoration:'underline',cursor:'pointer'}}>{'✕'} Няма</a>}
                    {popover&&popover.tourId===t.id&&popover.field==='guide'&&<div ref={popRef} style={{position:'absolute',right:10,zIndex:50,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.15)',padding:10,minWidth:200,maxHeight:200,overflowY:'auto',marginTop:2}}>
                      <div style={{fontSize:11,color:'var(--text2)',marginBottom:6,fontWeight:600}}>Свободни гидове:</div>
                      {selData.freeGuides.length===0&&<div style={{fontSize:11,color:'var(--red)'}}>Няма свободни</div>}
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        {selData.freeGuides.map(g=><div key={g.name} onClick={()=>assignGuide(t.id,g.name)} style={{padding:'5px 8px',borderRadius:5,cursor:'pointer',fontSize:11,background:'rgba(45,138,78,.06)',border:'1px solid rgba(45,138,78,.15)',color:'var(--green)',fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background='rgba(45,138,78,.15)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(45,138,78,.06)'}>{g.name}</div>)}
                      </div>
                    </div>}
                  </div>
                  {/* Шофьор */}
                  {!isWalk&&<div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,color:'var(--text2)',minWidth:50}}>Шофьор:</span>
                    {t.driver?<span style={{display:'flex',alignItems:'center',gap:4}}>
                      <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'driver'});setDriverInput(t.driver||'')}} style={{color:'var(--green)',fontWeight:600,fontSize:11,textDecoration:'underline',textDecorationStyle:'dotted',cursor:'pointer'}}>{t.driver}</a>
                      <span onClick={()=>assignDriver(t.id,'')} style={{color:'var(--red)',cursor:'pointer',fontSize:13,lineHeight:1}} title="Премахни">{'✕'}</span>
                    </span>:
                    <a href="#" onClick={e=>{e.preventDefault();setPopover({tourId:t.id,field:'driver'});setDriverInput('')}} style={{color:'var(--red)',fontWeight:600,fontSize:11,textDecoration:'underline',cursor:'pointer'}}>{'✕'} Няма</a>}
                    {popover&&popover.tourId===t.id&&popover.field==='driver'&&<div ref={popRef} style={{position:'absolute',right:10,zIndex:50,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.15)',padding:10,minWidth:200,marginTop:2}}>
                      <div style={{fontSize:11,color:'var(--text2)',marginBottom:6,fontWeight:600}}>Име на шофьор:</div>
                      <div style={{display:'flex',gap:4}}>
                        <input value={driverInput} onChange={e=>setDriverInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&driverInput.trim())assignDriver(t.id,driverInput.trim())}} placeholder="Въведи име..." style={{flex:1,padding:'5px 8px',borderRadius:5,border:'1px solid var(--border)',fontSize:11}} autoFocus/>
                        <button onClick={()=>{if(driverInput.trim())assignDriver(t.id,driverInput.trim())}} className="btn btn-primary btn-sm" style={{fontSize:10,padding:'4px 8px'}}>OK</button>
                      </div>
                    </div>}
                  </div>}
                </div>
              </div>})}
            </div>


            {/* Обединяване на турове */}
            {selData.mergeGroups.filter(mg=>!mg.alreadyMerged).length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--purple)',marginBottom:8,borderBottom:'2px solid var(--purple)',paddingBottom:4}}>{'🔗'} Обединяване ({selData.mergeGroups.filter(mg=>!mg.alreadyMerged).length})</div>
              {selData.mergeGroups.filter(mg=>!mg.alreadyMerged).map((mg,i)=>{
                const ids=mg.tours.map(t=>t.id);
                // Find which car can fit all
                const guideCount=1; // one guide for all
                const fittingCars=activeVehicles.filter(v=>{
                  if(!v.active||!v.seats)return false;
                  const pax=parseSeatsP(v.seats);
                  return pax>=mg.totalPax+guideCount;
                });
                const fittingCarsGD=activeVehicles.filter(v=>{
                  if(!v.active||!v.seats)return false;
                  const pax=parseSeatsP(v.seats);
                  return pax>=mg.totalPax;
                });
                // Get existing assignments from any tour in the group
                const existingCar=mg.tours.find(t=>t.carNumber)?.carNumber||'';
                const existingGuide=mg.tours.find(t=>t.guide)?.guide||'';
                const existingDriver=mg.tours.find(t=>t.driver)?.driver||'';
                const existingGID=mg.tours.some(t=>t.guideIsDriver);
                return <MergeCard key={i} mg={mg} ids={ids} fittingCars={fittingCars} fittingCarsGD={fittingCarsGD}
                  existingCar={existingCar} existingGuide={existingGuide} existingDriver={existingDriver} existingGID={existingGID}
                  activeVehicles={activeVehicles} activeGuides={activeGuides} selData={selData} mergeTours={mergeTours} parseSeatsP={parseSeatsP}/>
              })}
            </div>}

            {selData.mergeGroups.filter(mg=>mg.alreadyMerged).length>0&&<div style={{marginBottom:16}}>
              {selData.mergeGroups.filter(mg=>mg.alreadyMerged).map((mg,i)=>
                <div key={i} style={{padding:'6px 10px',marginBottom:4,borderRadius:6,background:'rgba(45,138,78,.06)',border:'1px solid rgba(45,138,78,.2)',fontSize:11,color:'var(--green)',fontWeight:600}}>
                  {'✅'} {mg.name} — {mg.tours.length} резервации обединени ({mg.totalPax} пакс)
                </div>
              )}
            </div>}
            {/* Наеми */}
            {selData.dayRentals.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--orange)',marginBottom:8,borderBottom:'2px solid var(--orange)',paddingBottom:4}}>Наеми ({selData.dayRentals.length})</div>
              {selData.dayRentals.map((r,i)=><div key={i} style={{padding:'8px 10px',marginBottom:6,borderRadius:6,background:'rgba(217,119,6,.04)',border:'1px solid rgba(217,119,6,.2)',fontSize:12}}>
                <div style={{fontWeight:700,marginBottom:3}}>{r.vehicle||'Кола'}</div>
                <div style={{color:'var(--text2)'}}>Клиент: <strong style={{color:'var(--text)'}}>{r.client||'—'}</strong></div>
                <div style={{color:'var(--text2)'}}>Период: {r.dateFrom} — {r.dateTo} ({r.days} дни) | <strong style={{color:'var(--green)'}}>{r.totalPrice} EUR</strong></div>
              </div>)}
            </div>}

            {/* Обиколни турове */}
            {selData.dayRTList.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',marginBottom:8,borderBottom:'2px solid var(--accent)',paddingBottom:4}}>{'🌍'} Обиколни турове ({selData.dayRTList.length})</div>
              {selData.dayRTList.map((rt,i)=>{
                const from=parseDate(rt.dateFrom),to=parseDate(rt.dateTo);
                const numDays=from&&to?Math.round((to-from)/(1000*60*60*24))+1:0;
                const curDay=from&&selectedDate?Math.round((selectedDate-from)/(1000*60*60*24))+1:0;
                const dayInfo=rt.days&&rt.days[curDay-1]?rt.days[curDay-1]:null;
                return <div key={i} style={{padding:'10px 12px',marginBottom:6,borderRadius:8,background:'rgba(79,70,229,.04)',border:'1px solid rgba(79,70,229,.15)',fontSize:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:13,color:'var(--accent)'}}>{rt.name||'Обиколен тур'}</span>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(79,70,229,.08)',color:'var(--accent)',fontWeight:600}}>Ден {curDay}/{numDays}</span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'3px 12px',color:'var(--text2)',marginBottom:4}}>
                    <span>Клиент: <strong style={{color:'var(--text)'}}>{rt.client||'—'}</strong></span>
                    <span>Период: <strong style={{color:'var(--text)'}}>{rt.dateFrom} — {rt.dateTo}</strong></span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'3px 12px',color:'var(--text2)'}}>
                    {rt.vehicle&&<span>🚐 <strong style={{color:'var(--text)'}}>{rt.vehicle}</strong></span>}
                    {rt.guide&&<span>🧑‍🏫 <strong style={{color:'var(--text)'}}>{rt.guide}</strong></span>}
                    {rt.driver&&<span>🚗 <strong style={{color:'var(--text)'}}>{rt.driver}</strong></span>}
                  </div>
                  {dayInfo&&dayInfo.description&&<div style={{marginTop:6,padding:'6px 8px',borderRadius:4,background:'rgba(79,70,229,.03)',fontSize:11,color:'var(--text)'}}>📍 {dayInfo.description}</div>}
                  {dayInfo&&dayInfo.hotel&&<div style={{marginTop:3,fontSize:11,color:'var(--text2)'}}>🏨 {dayInfo.hotel}</div>}
                  <div style={{marginTop:6,padding:'4px 8px',borderRadius:4,background:'rgba(192,57,43,.05)',fontSize:10,color:'var(--red)',fontWeight:600}}>🔒 Кола, гид и шофьор блокирани за периода</div>
                </div>})}
            </div>}

            {/* Конфликти */}
            {selData.conflicts.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--red)',marginBottom:8,borderBottom:'2px solid var(--red)',paddingBottom:4}}>{'!'} Конфликти</div>
              {selData.conflicts.map((c,i)=><div key={i} style={{padding:'8px 10px',marginBottom:4,borderRadius:6,background:'rgba(220,38,38,.05)',border:'1px solid rgba(192,57,43,.2)',fontSize:12,color:'var(--red)',fontWeight:600}}>
                {c} — използва се повече от веднъж!
              </div>)}
            </div>}

            {/* Коли — статус */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:8,borderBottom:'2px solid var(--border)',paddingBottom:4}}>Коли ({activeVehicles.length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {activeVehicles.map(v=>{
                  const isBusy=!selData.freeCars.find(fc=>fc.id===v.id);
                  const isRT=selData.dayRoundTrips.cars.has(v.name);
                  const isSvc=selData.inServiceCars.has(v.name);
                  const isRental=selData.dayRentals.some(r=>r.vehicle===v.name);
                  const isTour=selData.dayTours.some(t=>t.carNumber===v.name);
                  let bg,clr,label;
                  if(isRT){bg='rgba(220,38,38,.08)';clr='var(--red)';label=' ● обиколен'}
                  else if(isSvc){bg='rgba(234,88,12,.08)';clr='var(--orange)';label=' ● сервиз'}
                  else if(isRental){bg='rgba(59,130,246,.08)';clr='#3B82F6';label=' ● наем'}
                  else if(isTour){bg='rgba(217,119,6,.08)';clr='var(--gold)';label=' ● тур'}
                  else{bg='rgba(45,138,78,.08)';clr='var(--green)';label=''}
                  return <span key={v.id} style={{padding:'3px 8px',borderRadius:6,background:bg,border:'1px solid '+clr+'33',fontSize:11,color:clr,fontWeight:isBusy?700:400}}>{v.name}{label}</span>
                })}
              </div>
              <div style={{display:'flex',gap:12,marginTop:8,fontSize:10,color:'var(--text2)'}}>
                <span><span style={{color:'var(--green)'}}>●</span> свободна</span>
                <span><span style={{color:'var(--red)'}}>●</span> обиколен тур</span>
                <span><span style={{color:'var(--orange)'}}>●</span> сервиз</span>
                <span><span style={{color:'#3B82F6'}}>●</span> наем</span>
                <span><span style={{color:'var(--gold)'}}>●</span> тур</span>
              </div>
            </div>

            {/* Свободни гидове */}
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--green)',marginBottom:8,borderBottom:'2px solid var(--green)',paddingBottom:4}}>Свободни гидове ({selData.freeGuides.length})</div>
              {selData.freeGuides.length===0?<div style={{fontSize:12,color:'var(--red)',padding:'4px 0'}}>Всички гидове са заети!</div>:
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {selData.freeGuides.map(g=><span key={g.name} style={{padding:'3px 8px',borderRadius:6,background:'rgba(45,138,78,.08)',border:'1px solid rgba(45,138,78,.2)',fontSize:11,color:'var(--green)'}}>{g.name}</span>)}
              </div>}
            </div>

          </div>
        </div>:<div style={{background:'var(--card)',borderRadius:10,border:'1px solid var(--border)',padding:'40px 20px',textAlign:'center',color:'var(--text2)'}}>
          <div style={{fontSize:32,marginBottom:8}}>{'\u{1F447}'}</div>
          <div style={{fontSize:14}}>Кликни на ден от календара</div>
        </div>}
      </div>
    </div>
  </div>
}

export default PlanningPage;
