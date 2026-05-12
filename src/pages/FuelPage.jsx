import { useState, useMemo } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function FuelPage({fuel,setFuel}){
  const [search,setSearch]=useState('');const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const filtered=useMemo(()=>fuel.filter(f=>{const s=search.toLowerCase();return !s||f.vehicle.toLowerCase().includes(s)||f.driver.toLowerCase().includes(s)||f.tour.toLowerCase().includes(s)||f.date.includes(s)}),[fuel,search]);
  const totals=useMemo(()=>({km:filtered.reduce((a,f)=>a+(f.totalKm||0),0),cost:filtered.reduce((a,f)=>a+(f.totalFuelCost||0),0),liters:filtered.reduce((a,f)=>a+(f.liters||0),0)}),[filtered]);
  const blank={date:'',vehicle:'',driver:'',tour:'',kmStart:null,kmEnd:null,totalKm:null,pricePerLiter:null,totalFuelCost:null,liters:null,notes:''};
  const save=(form)=>{if(form.id){setFuel(p=>p.map(f=>f.id===form.id?form:f))}else{setFuel(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setFuel(p=>p.filter(f=>f.id!==delId));setDelId(null)};
  return <div>
    <div className="stats-row">
      <div className="stat-card"><div className="label">Общ пробег</div><div className="value blue">{totals.km.toLocaleString()} км</div></div>
      <div className="stat-card"><div className="label">Общо гориво</div><div className="value red">{totals.cost.toFixed(2)} €</div></div>
      <div className="stat-card"><div className="label">Литри</div><div className="value">{totals.liters.toFixed(1)} л</div></div>
    </div>
    <div className="topbar"><h2>Гориво ({filtered.length})</h2><div style={{display:'flex',gap:8}}>
      <input className="search-box" placeholder="Търси..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button>
    </div></div>
    <div className="scroll-table"><table><thead><tr><th>Дата</th><th>МПС</th><th>Шофьор</th><th>Тур</th><th>Км начало</th><th>Км край</th><th>Пробег</th><th>€/л</th><th>Цена €</th><th>Литри</th><th></th></tr></thead>
    <tbody>{filtered.map(f=><tr key={f.id}><td>{f.date}</td><td>{f.vehicle}</td><td>{f.driver}</td><td>{f.tour}</td><td>{f.kmStart}</td><td>{f.kmEnd}</td><td><strong>{f.totalKm}</strong></td><td>{f.pricePerLiter}</td><td>{f.totalFuelCost}</td><td>{f.liters}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...f})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(f.id)}>✕</button></td></tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Ново зареждане"} onClose={()=>setEditing(null)}>
      <FuelForm data={editing} onSave={save} onCancel={()=>setEditing(null)}/></Modal>}
    {delId&&<ConfirmModal msg="Изтрий запис за гориво?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}
export function FuelForm({data,onSave,onCancel}){
  const[f,setF]=useState(data);const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return <div><div className="form-grid">
    <div className="form-group"><label>Дата</label><input value={f.date||''} onChange={e=>u('date',e.target.value)}/></div>
    <div className="form-group"><label>МПС</label><input value={f.vehicle} onChange={e=>u('vehicle',e.target.value)}/></div>
    <div className="form-group"><label>Шофьор</label><input value={f.driver} onChange={e=>u('driver',e.target.value)}/></div>
    <div className="form-group"><label>Тур</label><input value={f.tour} onChange={e=>u('tour',e.target.value)}/></div>
    <div className="form-group"><label>Км начало</label><input type="number" value={f.kmStart||''} onChange={e=>u('kmStart',+e.target.value||null)}/></div>
    <div className="form-group"><label>Км край</label><input type="number" value={f.kmEnd||''} onChange={e=>u('kmEnd',+e.target.value||null)}/></div>
    <div className="form-group"><label>Пробег</label><input type="number" value={f.totalKm||''} onChange={e=>u('totalKm',+e.target.value||null)}/></div>
    <div className="form-group"><label>€/литър</label><input type="number" step="0.01" value={f.pricePerLiter||''} onChange={e=>u('pricePerLiter',+e.target.value||null)}/></div>
    <div className="form-group"><label>Цена €</label><input type="number" step="0.01" value={f.totalFuelCost||''} onChange={e=>u('totalFuelCost',+e.target.value||null)}/></div>
    <div className="form-group"><label>Литри</label><input type="number" step="0.01" value={f.liters||''} onChange={e=>u('liters',+e.target.value||null)}/></div>
    <div className="form-group full"><label>Забележки</label><input value={f.notes||''} onChange={e=>u('notes',e.target.value)}/></div>
  </div><div className="form-actions"><button className="btn btn-ghost" onClick={onCancel}>Отказ</button><button className="btn btn-primary" onClick={()=>onSave(f)}>Запази</button></div></div>
}

export default FuelPage
