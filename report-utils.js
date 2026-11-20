/* Shared report formatting; data stays on this device. */
(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = value => String(value ?? '').normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF\uFE0F]/g,'').replace(/\p{Extended_Pictographic}/gu,'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-');
  const houses = {MERAH:[[255,235,238],[169,37,52]],BIRU:[[232,242,255],[34,89,169]],HIJAU:[[230,247,238],[31,119,74]],KUNING:[[255,247,210],[128,97,0]]};
  function filename(data) { return 'Senarai_Murid_SKST_' + new Date(data.createdAt).toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'}) + '.pdf'; }
  function table(data) {
    const headers = ['Bil.','Nama murid','Kelas','Jantina','Rumah sukan','Sejarah perubatan',...(data.includeIC ? ['No. K/P'] : [])];
    return '<table class="student-table' + (data.includeIC ? ' has-ic' : '') + '"><colgroup>' + ['num','name','class','gender','house','medical',...(data.includeIC ? ['ic'] : [])].map(c => '<col class="col-' + c + '">').join('') + '</colgroup><thead><tr>' + headers.map(h => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' + data.students.map((s,i) => '<tr><td class="number">' + (i+1) + '</td><td><strong class="student-name">' + escape(s.name) + '</strong>' + (s.match !== 'matched' ? '<small class="match-warning">Padanan perlu semakan</small>' : '') + '</td><td>' + escape(s.className) + '</td><td>' + escape(s.gender) + '</td><td class="report-house ' + escape(s.house.toLowerCase()) + '">' + escape(s.house || 'Belum dipadankan') + '</td><td class="medical-cell' + (s.sick ? ' medical-attention' : '') + '">' + (s.sick ? '<span class="medical-label">Ada sejarah perubatan</span><span class="medical-detail">' + escape(s.medical) + '</span>' : 'Tiada sejarah direkodkan') + '</td>' + (data.includeIC ? '<td class="ic-cell">' + escape(s.ic || 'Tidak tersedia') + '</td>' : '') + '</tr>').join('') + '</tbody></table>';
  }
  function makePdf(data) {
    if (!root.jspdf?.jsPDF) throw Error('Komponen PDF belum dimuat. Muat semula aplikasi.');
    const doc = new root.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    doc.setProperties({title:'Senarai murid SK Sungai Tiram',subject:'Senarai mengikut tapisan admin',author:'SK Sungai Tiram'});
    const width = 273, left = 12;
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    const filterLines = doc.splitTextToSize(plain((data.labels?.length ? data.labels : ['Semua murid']).join(' | ')),width);
    const top = 34 + filterLines.length * 3.5;
    const columns = [{header:'Bil.',dataKey:'num'},{header:'Nama murid',dataKey:'name'},{header:'Kelas',dataKey:'className'},{header:'Jantina',dataKey:'gender'},{header:'Rumah sukan',dataKey:'house'},{header:'Sejarah perubatan',dataKey:'medical'},...(data.includeIC ? [{header:'No. K/P',dataKey:'ic'}] : [])];
    const widths = data.includeIC ? [9,69,24,22,28,85,36] : [9,77,24,25,34,104];
    const columnStyles = {}; columns.forEach((c,i) => columnStyles[c.dataKey] = {cellWidth:widths[i]});
    const options = {
      columns, body:data.students.map((s,i) => ({num:String(i+1),name:plain(s.name)+(s.match !== 'matched' ? '\n(Padanan perlu semakan)' : ''),className:plain(s.className),gender:plain(s.gender),house:plain(s.house || 'Belum dipadankan'),medical:plain(s.sick ? s.medical : 'Tiada sejarah direkodkan'),ic:plain(s.ic || 'Tidak tersedia'),sick:Boolean(s.sick)})),
      startY:top, margin:{top,bottom:16,left,right:12}, theme:'grid', showHead:'everyPage', rowPageBreak:'avoid',
      styles:{font:'helvetica',fontSize:7.5,cellPadding:2.5,lineColor:[222,226,237],lineWidth:0.2,textColor:[64,78,100],overflow:'linebreak',valign:'middle'},
      headStyles:{fillColor:[235,232,251],textColor:[82,75,135],fontStyle:'bold',fontSize:7.5},
      alternateRowStyles:{fillColor:[249,250,254]},columnStyles,
      didParseCell:cell => {
        if (cell.section !== 'body') return;
        if (cell.column.dataKey === 'medical' && cell.row.raw.sick) { cell.cell.styles.fillColor=[255,239,244];cell.cell.styles.textColor=[155,49,77]; }
        if (cell.column.dataKey === 'house' && houses[cell.row.raw.house]) { const color=houses[cell.row.raw.house];cell.cell.styles.fillColor=color[0];cell.cell.styles.textColor=color[1];cell.cell.styles.fontStyle='bold'; }
        if (cell.column.dataKey === 'name') cell.cell.styles.fontStyle='bold';
      },
      willDrawPage:() => {
        doc.setFont('helvetica','bold'); doc.setFontSize(11);doc.setTextColor(65,66,115);doc.text('SEKOLAH KEBANGSAAN SUNGAI TIRAM',left,12);
        doc.setFontSize(14);doc.text('SENARAI MURID',left,19);
        doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(102,110,135);
        doc.text('Tarikh: '+new Date(data.createdAt).toLocaleString('ms-MY')+'   |   Jumlah: '+data.students.length+' murid',left,25);
        doc.text(filterLines,left,30);
      }
    };
    if (typeof doc.autoTable === 'function') doc.autoTable(options);
    else if (typeof root.autoTable === 'function') root.autoTable(doc,options);
    else throw Error('Komponen jadual PDF belum dimuat. Pastikan folder vendor dimuat naik.');
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++) {doc.setPage(p);doc.setDrawColor(224,226,238);doc.line(12,198,285,198);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(121,125,145);doc.text('Kegunaan guru | Sorotan merah jambu: ada sejarah perubatan',12,203);doc.text('Halaman '+p+' / '+pages,285,203,{align:'right'});}
    return doc;
  }
  root.SKST_REPORT = {table,makePdf,filename};
})(typeof window === 'undefined' ? globalThis : window);
