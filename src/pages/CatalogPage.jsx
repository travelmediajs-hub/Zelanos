import { useState, useMemo } from 'react';
import { Modal, ConfirmModal } from '../components/Modal';
import { genId } from '../utils/helpers';

export function buildInitialCatalog(tours){
  const map={};let cid=1;
  tours.forEach(t=>{if(!t.tour)return;let name=t.tour,lang=t.tourLanguage||'';
    if(!lang){const m=name.match(/ - ([^-]+)$/);if(m){lang=m[1];name=name.replace(/ - [^-]+$/,'')}}else{name=name.replace(/ - [^-]+$/,'')}
    if(!map[name])map[name]={id:cid++,name,languages:[],salePrice:null,childPrice:null,duration:'',needsCar:true,description:''};
    if(lang&&!map[name].languages.includes(lang))map[name].languages.push(lang);
    if(t.salePrice&&!map[name].salePrice)map[name].salePrice=t.salePrice;
    if(name.includes('WALKING'))map[name].needsCar=false;
  });return Object.values(map);
}

function CatalogPage({catalog,setCatalog}){
  const [search,setSearch]=useState('');const [editing,setEditing]=useState(null);const [delId,setDelId]=useState(null);
  const filtered=useMemo(()=>{const s=search.toLowerCase();return !s?catalog:catalog.filter(c=>c.name.toLowerCase().includes(s))},[catalog,search]);
  const blank={name:'',languages:[],salePrice:null,childPrice:null,duration:'',needsCar:true,isEvening:false,description:''};
  const save=(form)=>{
    if(typeof form.languages==='string')form.languages=form.languages.split(',').map(s=>s.trim()).filter(Boolean);
    if(form.id){setCatalog(p=>p.map(c=>c.id===form.id?form:c))}else{setCatalog(p=>[...p,{...form,id:genId(p)}])};setEditing(null)};
  const del=()=>{setCatalog(p=>p.filter(c=>c.id!==delId));setDelId(null)};
  return <div>
    <div className="topbar"><h2>Каталог турове ({filtered.length})</h2><div style={{display:'flex',gap:8}}>
      <input className="search-box" placeholder="Търси..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn btn-primary" onClick={()=>setEditing({...blank})}>+ Нов тур</button>
    </div></div>
    <div className="scroll-table"><table><thead><tr><th>Име на тур</th><th>Продължителност</th><th>Кола</th><th>Вечерен</th><th>Описание</th><th></th></tr></thead>
    <tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td>
      <td>{c.duration}</td>
      <td>{c.needsCar?<span className="badge badge-green">да</span>:<span className="badge badge-yellow">не</span>}</td>
      <td>{c.isEvening?<span className="badge badge-orange">🌙 вечерен</span>:<span style={{color:'var(--text3)'}}>—</span>}</td>
      <td title={c.description} style={{maxWidth:200}}>{c.description}</td>
      <td style={{whiteSpace:'nowrap'}}><button className="btn btn-ghost btn-sm" onClick={()=>setEditing({...c})}>✎</button>{' '}
        <button className="btn btn-danger btn-sm" onClick={()=>setDelId(c.id)}>✕</button></td>
    </tr>)}</tbody></table></div>
    {editing&&<Modal title={editing.id?"Редактирай":"Нов тур в каталога"} onClose={()=>setEditing(null)}>
      <div><div className="form-grid">
        <div className="form-group full"><label>Име на тур</label><input value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))}/></div>
        <div className="form-group"><label>Продължителност</label><input placeholder="Цял ден, Полудневен, Вечерен" value={editing.duration||''} onChange={e=>setEditing(p=>({...p,duration:e.target.value}))}/></div>
        <div className="form-group"><label>Нужна кола</label><select value={editing.needsCar?'да':'не'} onChange={e=>setEditing(p=>({...p,needsCar:e.target.value==='да'}))}><option>да</option><option>не</option></select></div>
        <div className="form-group"><label>Вечерен тур</label><div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><input type="checkbox" checked={!!editing.isEvening} onChange={e=>setEditing(p=>({...p,isEvening:e.target.checked}))} style={{width:18,height:18,cursor:'pointer'}}/><span style={{fontSize:13,color:editing.isEvening?'var(--orange)':'var(--text2)'}}>{editing.isEvening?'🌙 Да, вечерен':'Не'}</span></div></div>
        <div className="form-group full"><label>Описание</label><textarea rows={3} value={editing.description||''} onChange={e=>setEditing(p=>({...p,description:e.target.value}))}/></div>
      </div><div className="form-actions"><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Отказ</button><button className="btn btn-primary" onClick={()=>save(editing)}>Запази</button></div></div>
    </Modal>}
    {delId&&<ConfirmModal msg="Изтрий тур от каталога?" onConfirm={del} onCancel={()=>setDelId(null)}/>}
  </div>
}

export default CatalogPage;
