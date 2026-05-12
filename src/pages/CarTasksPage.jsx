import { useState, useMemo } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function CarTasksPage({tasks,setTasks}){
  const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);const [filter,setFilter]=useState('all');
  const filtered=useMemo(()=>filter==='all'?tasks:tasks.filter(t=>t.status===filter),[tasks,filter]);
  const blank={car:'',reportDate:'',task:'',reportedBy:'',priority:'ВАЖНО',status:'НОВО',notes:''};
  const save=(form)=>{if(form.id){setTasks(p=>p.map(t=>t.id===form.id?form:t))}else{setTasks(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setTasks(p=>p.filter(t=>t.id!==delId));setDelId(null)};
  const prBadge=(p)=>p==='СПЕШНО'?'badge badge-red':p==='ВАЖНО'?'badge badge-orange':'badge badge-blue';
  const stBadge=(s)=>s==='ФИНАЛ'?'badge badge-green':s==='В ПРОЦЕС'?'badge badge-yellow':'badge badge-blue';
  return <div>
    <div className="topbar"><h2>Задачи за коли ({filtered.length})</h2><div style={{display:'flex',gap:8}}>
      <select className="search-box" style={{width:'auto'}} value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Всички</option><option value="НОВО">Нови</option><option value="В ПРОЦЕС">В процес</option><option value="ФИНАЛ">Финал</option>
      </select>
      <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button>
    </div></div>
    <div className="scroll-table"><table><thead><tr><th>Кола</th><th>Задача</th><th>Съобщил</th><th>Приоритет</th><th>Статус</th><th>Забележки</th><th></th></tr></thead>
    <tbody>{filtered.map(t=><tr key={t.id}><td><strong>{t.car}</strong></td><td>{t.task}</td><td>{t.reportedBy}</td>
      <td><span className={prBadge(t.priority)}>{t.priority}</span></td>
      <td><span className={stBadge(t.status)}>{t.status}</span></td><td title={t.notes}>{t.notes}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...t})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(t.id)}>✕</button></td></tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Нова задача"} onClose={()=>setEditing(null)}>
      <div><div className="form-grid">
        <div className="form-group"><label>Кола</label><input value={editing.car} onChange={e=>setEditing(p=>({...p,car:e.target.value}))}/></div>
        <div className="form-group"><label>Дата</label><input value={editing.reportDate} onChange={e=>setEditing(p=>({...p,reportDate:e.target.value}))}/></div>
        <div className="form-group full"><label>Задача</label><input value={editing.task} onChange={e=>setEditing(p=>({...p,task:e.target.value}))}/></div>
        <div className="form-group"><label>Съобщил</label><input value={editing.reportedBy} onChange={e=>setEditing(p=>({...p,reportedBy:e.target.value}))}/></div>
        <div className="form-group"><label>Приоритет</label><select value={editing.priority} onChange={e=>setEditing(p=>({...p,priority:e.target.value}))}><option>СПЕШНО</option><option>ВАЖНО</option><option>НОРМАЛНО</option></select></div>
        <div className="form-group"><label>Статус</label><select value={editing.status} onChange={e=>setEditing(p=>({...p,status:e.target.value}))}><option>НОВО</option><option>В ПРОЦЕС</option><option>ФИНАЛ</option></select></div>
        <div className="form-group full"><label>Забележки</label><textarea rows={2} value={editing.notes} onChange={e=>setEditing(p=>({...p,notes:e.target.value}))}/></div>
      </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>save(editing)}>Запази</button></div></div>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий задача?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default CarTasksPage
