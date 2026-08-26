import { useState, useEffect } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function StopsCarPage({stops,setStops,vehicles,openTarget,onOpenHandled}){
  const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const blank={vehicle:'',startDate:'',endDate:'',who:'',notes:''};
  // Дълбока навигация от таблото: предпопълнен нов STOP от избрани дни в Гант-а
  useEffect(()=>{
    if(!openTarget)return;
    if(openTarget.create)setEditing({...blank,...openTarget.create});
    onOpenHandled&&onOpenHandled();
  },[openTarget]);
  const save=(form)=>{if(form.id){setStops(p=>p.map(s=>s.id===form.id?form:s))}else{setStops(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setStops(p=>p.filter(s=>s.id!==delId));setDelId(null)};
  return <div>
    <div className="topbar"><h2>STOP Автобуси/Коли ({stops.length})</h2><button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button></div>
    <div className="scroll-table"><table><thead><tr><th>Номер</th><th>От</th><th>До</th><th>Кой го взима</th><th>Забележка</th><th></th></tr></thead>
    <tbody>{stops.map(s=><tr key={s.id}><td><strong>{s.vehicle}</strong></td><td>{s.startDate}</td><td>{s.endDate}</td><td>{s.who}</td><td title={s.notes}>{s.notes}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...s})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(s.id)}>✕</button></td></tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Нов запис"} onClose={()=>setEditing(null)}>
      <div><div className="form-grid">
        <div className="form-group"><label>Номер бус/кола</label>
          {/* Избор от регистъра — точното име гарантира, че STOP-ът се вижда
              в Гант-а на таблото. Стар запис с име извън регистъра се показва
              като допълнителна опция, за да не се загуби при редакция. */}
          <select value={editing.vehicle||''} onChange={e=>setEditing(p=>({...p,vehicle:e.target.value}))} style={{width:'100%'}}>
            <option value="">— избери кола —</option>
            {(vehicles||[]).filter(v=>v.active).map(v=><option key={v.id} value={v.name}>{v.name}{v.seats?' ('+v.seats+')':''}</option>)}
            {editing.vehicle&&!(vehicles||[]).some(v=>v.name===editing.vehicle)&&<option value={editing.vehicle}>{editing.vehicle} (извън регистъра)</option>}
          </select>
        </div>
        <div className="form-group"><label>Начална дата</label><input value={editing.startDate} onChange={e=>setEditing(p=>({...p,startDate:e.target.value}))}/></div>
        <div className="form-group"><label>Крайна дата</label><input value={editing.endDate} onChange={e=>setEditing(p=>({...p,endDate:e.target.value}))}/></div>
        <div className="form-group full"><label>Кой го взима</label><input value={editing.who} onChange={e=>setEditing(p=>({...p,who:e.target.value}))}/></div>
        <div className="form-group full"><label>Забележка</label><textarea rows={2} value={editing.notes} onChange={e=>setEditing(p=>({...p,notes:e.target.value}))}/></div>
      </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>save(editing)}>Запази</button></div></div>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default StopsCarPage
