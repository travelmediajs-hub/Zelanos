import { useState, useMemo } from 'react'
import { Modal, ConfirmModal } from '../components/Modal'
import { genId } from '../utils/helpers'

function GuidesPage({guides,setGuides}){
  const [search,setSearch]=useState('');const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const filtered=useMemo(()=>guides.filter(g=>{const s=search.toLowerCase();return !s||g.name.toLowerCase().includes(s)||g.email.toLowerCase().includes(s)||g.languages.toLowerCase().includes(s)||g.phone.includes(s)}),[guides,search]);
  const blank={name:'',email:'',phone:'',languages:'',fee:'',drives:'да',notes:''};
  const save=(form)=>{if(form.id){setGuides(p=>p.map(g=>g.id===form.id?form:g))}else{setGuides(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setGuides(p=>p.filter(g=>g.id!==delId));setDelId(null)};
  return <div>
    <div className="topbar"><h2>Гидове ({filtered.length})</h2><div style={{display:'flex',gap:8}}>
      <input className="search-box" placeholder="Търси по име, език, имейл..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Добави</button>
    </div></div>
    <div className="scroll-table"><table><thead><tr><th>Име</th><th>Имейл</th><th>Телефон</th><th>Езици</th><th>Хонорар</th><th>Шофира</th><th>Забележки</th><th></th></tr></thead>
    <tbody>{filtered.map(g=><tr key={g.id}><td><strong>{g.name}</strong></td><td>{g.email}</td><td>{g.phone}</td><td>{g.languages}</td><td>{g.fee}</td>
      <td>{g.drives==='да'?<span className="badge badge-green">да</span>:<span className="badge badge-red">не</span>}</td>
      <td title={g.notes}>{g.notes}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...g})}>✎</button>{' '}<button className="btn btn-danger btn-sm" onClick={()=>setDelId(g.id)}>✕</button></td>
    </tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай гид":"Нов гид"} onClose={()=>setEditing(null)}>
      <GuideForm data={editing} onSave={save} onCancel={()=>setEditing(null)}/></Modal>}
    {delId&&<ConfirmModal msg="Изтрий този гид?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}
export function GuideForm({data,onSave,onCancel}){
  const[f,setF]=useState(data);const u=(k,v)=>setF(p=>({...p,[k]:v}));
  return <div><div className="form-grid">
    <div className="form-group"><label>Име</label><input value={f.name} onChange={e=>u('name',e.target.value)}/></div>
    <div className="form-group"><label>Имейл</label><input value={f.email} onChange={e=>u('email',e.target.value)}/></div>
    <div className="form-group"><label>Телефон</label><input value={f.phone} onChange={e=>u('phone',e.target.value)}/></div>
    <div className="form-group"><label>Езици</label><input value={f.languages} onChange={e=>u('languages',e.target.value)}/></div>
    <div className="form-group"><label>Хонорар</label><input value={f.fee} onChange={e=>u('fee',e.target.value)}/></div>
    <div className="form-group"><label>Шофира</label><select value={f.drives} onChange={e=>u('drives',e.target.value)}><option value="да">да</option><option value="не">не</option></select></div>
    <div className="form-group full"><label>Забележки</label><textarea rows={2} value={f.notes} onChange={e=>u('notes',e.target.value)}/></div>
  </div><div className="form-actions"><button className="btn btn-ghost" onClick={onCancel}>Отказ</button><button className="btn btn-primary" onClick={()=>onSave(f)}>Запази</button></div></div>
}

export default GuidesPage
