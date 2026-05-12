import { useState } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function FinesPage({fines,setFines}){
  const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const blank={vehicle:'',fineDate:'',driver:'',amountEur:null,payDate:'',status:''};
  const save=(form)=>{if(form.id){setFines(p=>p.map(f=>f.id===form.id?form:f))}else{setFines(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setFines(p=>p.filter(f=>f.id!==delId));setDelId(null)};
  return <div>
    <div className="topbar"><h2>Фишове ({fines.length})</h2><button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button></div>
    <div className="scroll-table"><table><thead><tr><th>Кола</th><th>Дата фиш</th><th>Водач</th><th>Сума €</th><th>Дата плащане</th><th>Статус</th><th></th></tr></thead>
    <tbody>{fines.map(f=><tr key={f.id}><td>{f.vehicle}</td><td>{f.fineDate}</td><td>{f.driver}</td><td><strong>{f.amountEur}</strong></td><td>{f.payDate}</td><td>{f.status}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...f})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(f.id)}>✕</button></td></tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Нов фиш"} onClose={()=>setEditing(null)}>
      <div><div className="form-grid">
        <div className="form-group"><label>Номер кола</label><input value={editing.vehicle} onChange={e=>setEditing(p=>({...p,vehicle:e.target.value}))}/></div>
        <div className="form-group"><label>Дата на фиш</label><input value={editing.fineDate} onChange={e=>setEditing(p=>({...p,fineDate:e.target.value}))}/></div>
        <div className="form-group"><label>Водач</label><input value={editing.driver} onChange={e=>setEditing(p=>({...p,driver:e.target.value}))}/></div>
        <div className="form-group"><label>Сума €</label><input type="number" step="0.01" value={editing.amountEur||''} onChange={e=>setEditing(p=>({...p,amountEur:+e.target.value||null}))}/></div>
        <div className="form-group"><label>Дата плащане</label><input value={editing.payDate} onChange={e=>setEditing(p=>({...p,payDate:e.target.value}))}/></div>
        <div className="form-group full"><label>Статус</label><input value={editing.status} onChange={e=>setEditing(p=>({...p,status:e.target.value}))}/></div>
      </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>save(editing)}>Запази</button></div></div>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий фиш?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default FinesPage
