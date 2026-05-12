import { useState } from 'react';

function MergeCard({mg,ids,fittingCars,fittingCarsGD,existingCar,existingGuide,existingDriver,existingGID,activeVehicles,activeGuides,selData,mergeTours,parseSeatsP}){
  const [car,setCar]=useState(existingCar);
  const [guide,setGuide]=useState(existingGuide);
  const [driver,setDriver]=useState(existingDriver);
  const [gid,setGid]=useState(existingGID);
  
  const availCars=gid?fittingCarsGD:fittingCars;
  const selectedCar=activeVehicles.find(v=>v.name===car);
  const maxPax=selectedCar?parseSeatsP(selectedCar.seats):0;
  const guideSeats=guide&&!gid?1:0;
  const remaining=maxPax-mg.totalPax-guideSeats;
  const canMerge=car&&guide&&(gid||driver)&&remaining>=0;
  
  return <div style={{padding:'10px 12px',marginBottom:8,borderRadius:8,background:'rgba(139,92,246,.04)',border:'1px solid rgba(139,92,246,.25)',fontSize:12}}>
    <div style={{fontWeight:700,marginBottom:6,color:'var(--purple)'}}>{mg.name}</div>
    <div style={{marginBottom:6,fontSize:11,color:'var(--text2)'}}>
      {mg.tours.map((t,j)=><div key={j} style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}>
        <span>{t.name||'—'} {t.tour&&t.tour.includes(' - ')?<span style={{opacity:.6}}>({t.tour.split(' - ').pop()})</span>:null}</span>
        <span style={{fontWeight:600}}>{(t.adults||0)+(t.children||0)} пакс</span>
      </div>)}
      <div style={{borderTop:'1px solid rgba(139,92,246,.2)',paddingTop:3,marginTop:3,fontWeight:700,display:'flex',justifyContent:'space-between'}}>
        <span>Общо</span><span>{mg.totalPax} пакс</span>
      </div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div>
        <label style={{fontSize:10,color:'var(--text2)',fontWeight:600}}>Кола</label>
        <select value={car} onChange={e=>setCar(e.target.value)} style={{width:'100%',fontSize:11,padding:'4px 6px',borderRadius:4,border:'1px solid var(--border)'}}>
          <option value="">— избери —</option>
          {activeVehicles.filter(v=>v.active).map(v=>{
            const pax=parseSeatsP(v.seats);
            const fits=pax>=mg.totalPax+(gid?0:1);
            const isRT=selData.dayRoundTrips.cars.has(v.name);
            const isSvc=selData.inServiceCars.has(v.name);
            return <option key={v.id} value={v.name} style={{color:isRT?'var(--red)':isSvc?'var(--orange)':!fits?'#999':'inherit',fontWeight:fits?700:'normal'}}>
              {v.name} ({v.seats}){isRT?' ● обик.':isSvc?' ● сервиз':fits?' ✓':' ✕ малка'}
            </option>
          })}
        </select>
        {car&&selectedCar&&<div style={{fontSize:10,marginTop:2,color:remaining>=0?'var(--green)':'var(--red)',fontWeight:600}}>
          {remaining>=0?remaining+' свободни места':'Надвишени с '+Math.abs(remaining)+'!'}
        </div>}
      </div>
      <div style={{display:'flex',gap:6}}>
        <div style={{flex:1}}>
          <label style={{fontSize:10,color:'var(--text2)',fontWeight:600}}>Гид</label>
          <select value={guide} onChange={e=>{setGuide(e.target.value);if(gid)setDriver(e.target.value)}} style={{width:'100%',fontSize:11,padding:'4px 6px',borderRadius:4,border:'1px solid var(--border)'}}>
            <option value="">— избери —</option>
            {activeGuides.map(g=><option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
          <label style={{display:'flex',alignItems:'center',gap:4,marginTop:3,fontSize:10,cursor:'pointer'}}><input type="checkbox" checked={gid} onChange={e=>{setGid(e.target.checked);if(e.target.checked)setDriver(guide)}}/> Гидът шофира</label>
        </div>
        {!gid&&<div style={{flex:1}}>
          <label style={{fontSize:10,color:'var(--text2)',fontWeight:600}}>Шофьор</label>
          <input value={driver} onChange={e=>setDriver(e.target.value)} style={{width:'100%',fontSize:11,padding:'4px 6px',borderRadius:4,border:'1px solid var(--border)'}} placeholder="Име..."/>
        </div>}
      </div>
    </div>
    <button onClick={()=>{if(canMerge)mergeTours(ids,car,guide,driver,gid)}} disabled={!canMerge}
      style={{marginTop:8,width:'100%',padding:'6px',borderRadius:6,border:'none',cursor:canMerge?'pointer':'not-allowed',
        background:canMerge?'linear-gradient(135deg,#8B5CF6,var(--accent))':'var(--border)',
        color:canMerge?'#fff':'var(--text2)',fontWeight:700,fontSize:12,opacity:canMerge?1:.6}}>
      {'🔗'} Обедини {mg.tours.length} резервации в 1 кола
    </button>
  </div>
}

export default MergeCard;
