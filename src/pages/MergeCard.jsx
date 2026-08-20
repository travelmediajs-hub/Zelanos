import { useState } from 'react';

function MergeCard({mg,ids,fittingCars,fittingCarsGD,existingCar,existingGuide,existingDriver,existingGID,activeVehicles,activeGuides,selData,mergeTours,parseSeatsP}){
  // Избор кои резервации влизат в обединението — по подразбиране неназначените.
  // Така 5 резервации по едно направление могат да станат две групи (напр. 3+2)
  // с различни коли, гидове и шофьори.
  const unassigned=mg.tours.filter(t=>!t.carNumber);
  const defaultSel=unassigned.length?unassigned:mg.tours;
  const [sel,setSel]=useState(()=>new Set(defaultSel.map(t=>t.id)));
  const toggle=(id)=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n});
  const selTours=mg.tours.filter(t=>sel.has(t.id));
  const selPax=selTours.reduce((a,t)=>a+(t.adults||0)+(t.children||0),0);
  // Кола/гид/шофьор се предпопълват само от избраните по подразбиране —
  // иначе втората група наследява екипа на първата и рискува да я презапише
  const [car,setCar]=useState(defaultSel.find(t=>t.carNumber)?.carNumber||'');
  const [guide,setGuide]=useState(defaultSel.find(t=>t.guide)?.guide||'');
  const [driver,setDriver]=useState(defaultSel.find(t=>t.driver)?.driver||'');
  const [gid,setGid]=useState(defaultSel.some(t=>t.guideIsDriver));

  const selectedCar=activeVehicles.find(v=>v.name===car);
  const maxPax=selectedCar?parseSeatsP(selectedCar.seats):0;
  const guideSeats=guide&&!gid?1:0;
  const remaining=maxPax-selPax-guideSeats;
  const reassign=selTours.filter(t=>t.carNumber&&t.carNumber!==car);
  const canMerge=car&&guide&&(gid||driver)&&remaining>=0&&sel.size>0;

  return <div style={{padding:'10px 12px',marginBottom:8,borderRadius:8,background:'rgba(139,92,246,.04)',border:'1px solid rgba(139,92,246,.25)',fontSize:12}}>
    <div style={{fontWeight:700,marginBottom:6,color:'var(--purple)'}}>{mg.name}</div>
    <div style={{marginBottom:6,fontSize:11,color:'var(--text2)'}}>
      {mg.tours.map((t,j)=><div key={j} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',gap:6}}>
        <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',flex:1,minWidth:0}}>
          <input type="checkbox" checked={sel.has(t.id)} onChange={()=>toggle(t.id)}/>
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',opacity:sel.has(t.id)?1:.5}}>{t.name||'—'} {t.tour&&t.tour.includes(' - ')?<span style={{opacity:.6}}>({t.tour.split(' - ').pop()})</span>:null}</span>
        </label>
        <span style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          {t.carNumber&&<span title={'Вече назначена: '+t.carNumber+(t.guide?' / '+t.guide:'')} style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:'rgba(45,138,78,.12)',color:'var(--green)',fontWeight:600}}>{t.carNumber}</span>}
          <span style={{fontWeight:600}}>{(t.adults||0)+(t.children||0)} пакс</span>
        </span>
      </div>)}
      <div style={{borderTop:'1px solid rgba(139,92,246,.2)',paddingTop:3,marginTop:3,fontWeight:700,display:'flex',justifyContent:'space-between'}}>
        <span>Избрани {sel.size} от {mg.tours.length}</span><span>{selPax}{selPax!==mg.totalPax?' / '+mg.totalPax:''} пакс</span>
      </div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div>
        <label style={{fontSize:10,color:'var(--text2)',fontWeight:600}}>Кола</label>
        <select value={car} onChange={e=>setCar(e.target.value)} style={{width:'100%',fontSize:11,padding:'4px 6px',borderRadius:4,border:'1px solid var(--border)'}}>
          <option value="">— избери —</option>
          {activeVehicles.filter(v=>v.active).map(v=>{
            const pax=parseSeatsP(v.seats);
            const fits=pax>=selPax+(gid?0:1);
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
    {reassign.length>0&&<div style={{marginTop:6,padding:'4px 8px',borderRadius:4,fontSize:10,fontWeight:600,background:'rgba(234,88,12,.08)',border:'1px solid rgba(234,88,12,.25)',color:'var(--orange)'}}>
      ⚠️ {reassign.length} от избраните вече {reassign.length===1?'има кола и ще бъде преместена':'имат кола и ще бъдат преместени'} в новата група!
    </div>}
    <button onClick={()=>{if(canMerge)mergeTours([...sel],car,guide,driver,gid)}} disabled={!canMerge}
      style={{marginTop:8,width:'100%',padding:'6px',borderRadius:6,border:'none',cursor:canMerge?'pointer':'not-allowed',
        background:canMerge?'linear-gradient(135deg,#8B5CF6,var(--accent))':'var(--border)',
        color:canMerge?'#fff':'var(--text2)',fontWeight:700,fontSize:12,opacity:canMerge?1:.6}}>
      {'🔗'} {sel.size===1?'Назначи 1 резервация':'Обедини '+sel.size+' резервации в 1 кола'}
    </button>
  </div>
}

export default MergeCard;
