import { useState } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function StopsGuidePage({stops,setStops}){
  const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const blank={startDate:'',endDate:'',guideName:''};
  const save=(form)=>{if(form.id){setStops(p=>p.map(s=>s.id===form.id?form:s))}else{setStops(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setStops(p=>p.filter(s=>s.id!==delId));setDelId(null)};
  return <div>
    <div className="topbar"><h2>STOP Гидове ({stops.length})</h2><button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button></div>
    <div className="scroll-table"><table><thead><tr><th>Начална дата</th><th>Крайна дата</th><th>Гид</th><th></th></tr></thead>
    <tbody>{stops.map(s=><tr key={s.id}><td>{s.startDate}</td><td>{s.endDate}</td><td><strong>{s.guideName}</strong></td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...s})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(s.id)}>✕</button></td></tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Нов STOP"} onClose={()=>setEditing(null)}>
      <div><div className="form-grid">
        <div className="form-group"><label>Начална дата</label><input value={editing.startDate} onChange={e=>setEditing(p=>({...p,startDate:e.target.value}))}/></div>
        <div className="form-group"><label>Крайна дата</label><input value={editing.endDate} onChange={e=>setEditing(p=>({...p,endDate:e.target.value}))}/></div>
        <div className="form-group full"><label>Гид</label><input value={editing.guideName} onChange={e=>setEditing(p=>({...p,guideName:e.target.value}))}/></div>
      </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>save(editing)}>Запази</button></div></div>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default StopsGuidePage
