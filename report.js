'use strict';
const el=id=>document.getElementById(id),job=new URLSearchParams(location.search).get('job');
let data=null,pdfUrl='';
function active(){return data&&Date.now()<data.expiresAt;}
function revoke(){data=null;document.body.classList.remove('admin-print');el('reportBody').hidden=true;el('reportTable').innerHTML='';el('reportMeta').textContent='';el('reportFilters').textContent='';el('nativePrint').disabled=true;el('reportSave').disabled=true;el('reportShare').hidden=true;if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl='';el('reportPdfLink').hidden=true;el('reportPdfLink').removeAttribute('href');el('reportStatus').textContent='Sesi admin tamat. Buka laporan semula melalui sistem selepas log masuk.';}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==window.opener||event.data?.job!==job)return;
 if(event.data.type==='SKST_REPORT_REVOKE'){revoke();return;}
 if(event.data.type!=='SKST_REPORT_DATA'||data)return;
 const value=event.data.snapshot;if(!Array.isArray(value?.students)||!value.includeIC||Date.now()>=value.expiresAt)return;
 data=value;document.body.classList.add('admin-print');el('reportBody').hidden=false;
 el('reportMeta').textContent='Tarikh: '+new Date(data.createdAt).toLocaleString('ms-MY')+' · '+data.students.length+' murid';
 el('reportFilters').textContent=(data.labels.length?data.labels:['Semua murid']).join(' · ')+' · Sorotan merah jambu: ada sejarah perubatan';
 el('reportTable').innerHTML=window.SKST_REPORT.table(data);el('nativePrint').disabled=false;el('reportSave').disabled=false;
 el('reportShare').hidden=typeof navigator.share!=='function'||typeof navigator.canShare!=='function';
 el('reportStatus').textContent='Laporan sedia. Tekan Cetak atau Muat turun PDF.';
 window.opener.postMessage({type:'SKST_REPORT_ACK',job},location.origin);
});
el('nativePrint').onclick=()=>{if(!active()){revoke();return;}try{window.print();el('reportStatus').textContent='Jika dialog cetak tidak muncul, gunakan Muat turun PDF.';}catch{el('reportStatus').textContent='Gunakan Muat turun PDF untuk mencetak pada peranti ini.';}};
el('reportSave').onclick=()=>{if(!active()){revoke();return;}try{const doc=window.SKST_REPORT.makePdf(data);if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(doc.output('blob'));el('reportPdfLink').href=pdfUrl;el('reportPdfLink').hidden=false;const a=document.createElement('a');a.href=pdfUrl;a.download=window.SKST_REPORT.filename(data);document.body.append(a);a.click();a.remove();el('reportStatus').textContent='PDF telah dijana. Jika muat turun tidak bermula, tekan Buka PDF yang dijana.';}catch(error){el('reportStatus').textContent=error.message;}};
el('reportShare').onclick=async()=>{if(!active()){revoke();return;}try{const doc=window.SKST_REPORT.makePdf(data),file=new File([doc.output('blob')],window.SKST_REPORT.filename(data),{type:'application/pdf'});if(!navigator.canShare({files:[file]}))throw Error('Gunakan Muat turun PDF pada peranti ini.');await navigator.share({files:[file],title:'Senarai murid SK Sungai Tiram'});}catch(error){if(error.name!=='AbortError')el('reportStatus').textContent=error.message;}};
window.addEventListener('beforeprint',()=>{if(!active())revoke();});
setInterval(()=>{if(data&&!active())revoke();},15000);
if(window.opener&&job){window.opener.postMessage({type:'SKST_REPORT_READY',job},location.origin);setTimeout(()=>{if(!data)el('reportStatus').textContent='Laporan belum diterima. Kembali ke sistem dan gunakan Muat turun PDF dalam mod admin.';},12000);}else{el('reportStatus').textContent='Buka laporan melalui butang Cetak / PDF dalam mod admin pada sistem carian murid.';}
