// Global State
let rawStudents = [];
let distributedClasses = [];
let activeClassIndex = 0;
let viewMode = 'list';
let classConfigurations = [];

// DOM Elements
const btnDemo = document.getElementById('btn-demo');
const btnProcess = document.getElementById('btn-process');
const mainStateCard = document.getElementById('main-state-card');
const resultCard = document.getElementById('result-card');
const quickStats = document.getElementById('quick-stats');
const classTabs = document.getElementById('class-tabs');
const dynamicContentArea = document.getElementById('dynamic-content-area');
const toggleListView = document.getElementById('toggle-list-view');
const toggleSeatingView = document.getElementById('toggle-seating-view');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnPrintAll = document.getElementById('btn-print-all');
const printArea = document.getElementById('print-area');
const classSettingsList = document.getElementById('class-settings-list');
const configClassesInput = document.getElementById('config-classes');

lucide.createIcons();

// Sistem Toast Notifikasi
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? "bg-emerald-50 text-emerald-900 border-emerald-200" :
                    type === 'error' ? "bg-rose-50 text-rose-900 border-rose-200" : "bg-blue-50 text-blue-900 border-blue-200";
    toast.className = `flex p-4 rounded-xl shadow border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `<div><h4 class="font-bold">${title}</h4><p class="text-xs opacity-90">${message}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 50);
    setTimeout(() => { toast.classList.add('translate-y-2', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// Helpers
function getShortName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]} ${parts[2].charAt(0)}.`;
}

function normalizeSchool(name) {
    if (!name) return "SD SEBELUMNYA";
    return name.toUpperCase();
}

// Inisialisasi Tipe Kelas
function initClassConfigurations() {
    if (!configClassesInput) return;
    const count = parseInt(configClassesInput.value) || 7;
    classSettingsList.innerHTML = '';
    classConfigurations = [];

    for (let i = 0; i < count; i++) {
        const letter = String.fromCharCode(65 + i);
        let defaultType = (i === count - 1) ? 'prestasi' : (i < 2 ? 'akademik' : 'reguler');
        
        classConfigurations.push({ letter, type: defaultType, waliKelas: `Wali Kelas VII ${letter}`, nip: '' });

        const row = document.createElement('div');
        row.className = "p-3 bg-slate-50 rounded-xl border flex flex-col gap-2 text-xs";
        row.innerHTML = `
            <div class="flex justify-between font-bold text-blue-900">
                <span>VII ${letter}</span>
                <select class="class-type-select px-1 border rounded" data-letter="${letter}">
                    <option value="reguler" ${defaultType==='reguler'?'selected':''}>Reguler</option>
                    <option value="akademik" ${defaultType==='akademik'?'selected':''}>Akademik</option>
                    <option value="prestasi" ${defaultType==='prestasi'?'selected':''}>Prestasi</option>
                </select>
            </div>
            <div class="flex gap-2">
                <input type="text" class="class-wali w-2/3 p-1.5 border rounded" placeholder="Wali Kelas" value="Wali Kelas VII ${letter}" data-letter="${letter}">
                <input type="text" class="class-nip w-1/3 p-1.5 border rounded" placeholder="NIP" data-letter="${letter}">
            </div>
        `;
        classSettingsList.appendChild(row);
    }
    
    document.querySelectorAll('.class-type-select, .class-wali, .class-nip').forEach(el => {
        el.addEventListener('change', (e) => {
            const letter = e.target.dataset.letter;
            const conf = classConfigurations.find(c => c.letter === letter);
            if (e.target.classList.contains('class-type-select')) conf.type = e.target.value;
            else if (e.target.classList.contains('class-wali')) conf.waliKelas = e.target.value;
            else conf.nip = e.target.value;
            
            const dClass = distributedClasses.find(cl => cl.letter === letter);
            if (dClass) {
                dClass.waliKelas = conf.waliKelas;
                dClass.nip = conf.nip;
                renderClassContent();
            }
        });
    });
}
if(configClassesInput) configClassesInput.addEventListener('change', initClassConfigurations);

// Distribusi & Algoritma
function processAndDistribute() {
    if(rawStudents.length === 0) return;
    
    let classes = classConfigurations.map(c => ({
        letter: c.letter, type: c.type, waliKelas: c.waliKelas, nip: c.nip, capacity: 32, students: []
    }));

    // Simple Distribution Logic (Prestasi vs Reguler)
    let sortedStudents = [...rawStudents].sort((a, b) => b.skorNilai - a.skorNilai);
    let classIndex = 0;
    
    sortedStudents.forEach(s => {
        // Jika kelas penuh, pindah ke kelas berikutnya
        while (classes[classIndex].students.length >= classes[classIndex].capacity) {
            classIndex = (classIndex + 1) % classes.length;
        }
        classes[classIndex].students.push(s);
        classIndex = (classIndex + 1) % classes.length;
    });

    classes.forEach(c => {
        c.students.sort((a,b) => a.namaSiswa.localeCompare(b.namaSiswa));
        c.seating = arrangeSeating(c.students);
    });

    distributedClasses = classes;
    activeClassIndex = 0;
    renderStatsPanel();
    renderClassTabs();
    renderClassContent();

    mainStateCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    quickStats.classList.remove('hidden');
    showToast("Berhasil", "Kelas dan denah berhasil disusun.", "success");
}

function arrangeSeating(students) {
    const boys = students.filter(s => s.jenisKelamin === 'L');
    const girls = students.filter(s => s.jenisKelamin === 'P');
    let pairs = [];
    while (boys.length >= 2) pairs.push([boys.shift(), boys.shift()]);
    while (girls.length >= 2) pairs.push([girls.shift(), girls.shift()]);
    if (boys.length > 0 && girls.length > 0) pairs.push([boys.shift(), girls.shift()]);
    else if (boys.length > 0) pairs.push([boys.shift(), null]);
    else if (girls.length > 0) pairs.push([girls.shift(), null]);
    return pairs;
}

// Render UI Components
function renderStatsPanel() {
    document.getElementById('stat-total-students').innerText = rawStudents.length;
    document.getElementById('stat-boys').innerText = rawStudents.filter(s => s.jenisKelamin === 'L').length;
    document.getElementById('stat-girls').innerText = rawStudents.filter(s => s.jenisKelamin === 'P').length;
    document.getElementById('stat-prestasi').innerText = rawStudents.filter(s => s.prestasi === 'Sertifikat').length;
}

function renderClassTabs() {
    classTabs.innerHTML = '';
    distributedClasses.forEach((c, index) => {
        const btn = document.createElement('button');
        const isActive = index === activeClassIndex;
        btn.className = `px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border'}`;
        btn.innerHTML = `VII ${c.letter} <span class="ml-1 text-[10px] ${isActive ? 'bg-blue-500 text-blue-100' : 'bg-slate-200 text-slate-500'} px-1.5 py-0.5 rounded-full">${c.students.length}</span>`;
        btn.addEventListener('click', () => { activeClassIndex = index; renderClassTabs(); renderClassContent(); });
        classTabs.appendChild(btn);
    });
}

function setViewMode(mode) {
    viewMode = mode;
    toggleListView.className = mode === 'list' ? 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition' : 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition';
    toggleSeatingView.className = mode === 'seating' ? 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition' : 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition';
    renderClassContent();
}
toggleListView.addEventListener('click', () => setViewMode('list'));
toggleSeatingView.addEventListener('click', () => setViewMode('seating'));

function renderClassContent() {
    const c = distributedClasses[activeClassIndex];
    if (!c) return;

    const boys = c.students.filter(s => s.jenisKelamin === 'L').length;
    const girls = c.students.filter(s => s.jenisKelamin === 'P').length;
    const avg = (c.students.reduce((a, s) => a + parseFloat(s.skorNilai || 0), 0) / (c.students.length || 1)).toFixed(1);

    // KEMBALIKAN: Keterangan Statistik Header per Kelas
    let html = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div><span class="text-xs text-slate-500 block">Total Siswa</span><span class="font-extrabold text-slate-800">${c.students.length} Siswa</span></div>
            <div><span class="text-xs text-slate-500 block">Komposisi Gender</span><span class="font-bold text-slate-700">${boys} L / ${girls} P</span></div>
            <div><span class="text-xs text-slate-500 block">Rata-rata Nilai</span><span class="font-bold text-amber-600 flex items-center gap-1"><i data-lucide="star" class="w-3.5 h-3.5"></i> ${avg}</span></div>
            <div><span class="text-xs text-slate-500 block">Wali Kelas</span><span class="font-bold text-slate-700 truncate block" title="${c.waliKelas}">${c.waliKelas || '-'}</span></div>
        </div>
    `;

    if (viewMode === 'list') {
        let rows = c.students.map((s, i) => `
            <tr class="border-b">
                <td class="p-2 text-center text-xs">${i + 1}</td>
                <td class="p-2 text-xs font-mono">${s.nisn}</td>
                <td class="p-2 font-semibold text-sm">${s.namaSiswa}</td>
                <td class="p-2 text-center text-xs">${s.jenisKelamin}</td>
                <td class="p-2 text-xs">${s.namaSekolah}</td>
            </tr>
        `).join('');
        html += `<div class="overflow-x-auto border rounded-xl"><table class="w-full text-left"><thead class="bg-slate-100 text-xs"><tr><th class="p-2 text-center w-12">No</th><th class="p-2">NISN</th><th class="p-2">Nama Lengkap</th><th class="p-2 text-center">L/P</th><th class="p-2">Sekolah</th></tr></thead><tbody class="bg-white">${rows}</tbody></table></div>`;
    } else {
        html += `<div class="bg-slate-800 rounded-xl p-6 text-white min-h-[400px]">
            <div class="bg-slate-700 text-center py-2 rounded-lg font-bold text-xs mb-6 uppercase">Papan Tulis Depan Kelas</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
        c.seating.forEach((pair, idx) => {
            const p1 = pair[0] ? getShortName(pair[0].namaSiswa) : 'Kosong';
            const p2 = pair[1] ? getShortName(pair[1].namaSiswa) : 'Kosong';
            html += `
                <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    <div class="text-center text-[9px] font-bold text-slate-500 mb-2 border-b border-slate-700 pb-1">Meja ${idx + 1}</div>
                    <div class="flex justify-between gap-2 text-xs font-semibold">
                        <div class="w-1/2 bg-slate-700/50 p-2 text-center rounded truncate text-${pair[0]?.jenisKelamin==='L'?'blue':'rose'}-300">${p1}</div>
                        <div class="w-1/2 bg-slate-700/50 p-2 text-center rounded truncate text-${pair[1]?.jenisKelamin==='L'?'blue':'rose'}-300">${p2}</div>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    }

    dynamicContentArea.innerHTML = html;
    lucide.createIcons({ root: dynamicContentArea });
}

// LOGIKA CETAK PDF (PERBAIKAN BUG HALAMAN KOSONG)
function preparePrintArea() {
    printArea.innerHTML = '';
    const ta = document.getElementById('config-ta').value;
    const dateStr = document.getElementById('config-date').value;
    const kepsekName = document.getElementById('config-kepsek-name').value;
    const kepsekNip = document.getElementById('config-kepsek-nip').value;
    
    distributedClasses.forEach(c => {
        // Halaman 1: Daftar Siswa
        const page1 = document.createElement('div');
        page1.className = 'print-page bg-white p-8 flex flex-col';
        let tableRows = '';
        c.students.forEach((s, idx) => {
            tableRows += `<tr class="border-b border-gray-400">
                <td class="py-1 px-2 text-center text-xs">${idx + 1}</td>
                <td class="py-1 px-2 text-xs font-mono">${s.nisn}</td>
                <td class="py-1 px-2 font-bold text-xs uppercase">${s.namaSiswa}</td>
                <td class="py-1 px-2 text-center text-xs">${s.jenisKelamin}</td>
                <td class="py-1 px-2 text-xs uppercase">${s.namaSekolah}</td>
            </tr>`;
        });
        page1.innerHTML = `
            <div class="text-center mb-4 border-b-2 border-black pb-2">
                <h1 class="text-xl font-extrabold uppercase">SMP NEGERI 2 KEDUNGBANTENG</h1>
                <h2 class="text-base font-bold uppercase">DAFTAR SISWA KELAS VII ${c.letter}</h2>
                <p class="text-xs font-semibold">TAHUN AJARAN ${ta}</p>
            </div>
            <table class="w-full text-left border-collapse border border-gray-400 mb-6 flex-grow">
                <thead class="bg-gray-100 border-b border-gray-400 uppercase text-xs font-bold">
                    <tr><th class="py-2 px-2 border-r border-gray-400 text-center w-10">No</th>
                    <th class="py-2 px-2 border-r border-gray-400">NISN</th>
                    <th class="py-2 px-2 border-r border-gray-400">Nama Lengkap</th>
                    <th class="py-2 px-2 border-r border-gray-400 text-center w-10">L/P</th>
                    <th class="py-2 px-2">Asal Sekolah</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="flex justify-between items-end text-sm w-full mt-auto pt-4">
                <div class="text-center"><p>Mengetahui,</p><p class="font-bold">Kepala Sekolah</p><div class="h-20"></div><p class="font-extrabold underline">${kepsekName}</p><p>${kepsekNip}</p></div>
                <div class="text-center"><p>${dateStr}</p><p class="font-bold">Wali Kelas</p><div class="h-20"></div><p class="font-extrabold underline">${c.waliKelas}</p><p>${c.nip}</p></div>
            </div>`;
        printArea.appendChild(page1);

        // Halaman 2: Denah
        const page2 = document.createElement('div');
        page2.className = 'print-page bg-white p-8 flex flex-col';
        let seatingGridHtml = '';
        c.seating.forEach((pair, idx) => {
            seatingGridHtml += `
                <div class="border-2 border-gray-800 p-2 flex flex-col">
                    <div class="text-center text-[10px] font-bold mb-2 uppercase border-b border-gray-300 pb-1">Meja ${idx + 1}</div>
                    <div class="flex justify-between items-center gap-2 text-[10px] font-bold uppercase">
                        <div class="w-1/2 border border-gray-400 p-1 text-center h-12 flex items-center justify-center">${pair[0] ? pair[0].namaSiswa : 'KOSONG'}</div>
                        <div class="w-1/2 border border-gray-400 p-1 text-center h-12 flex items-center justify-center">${pair[1] ? pair[1].namaSiswa : 'KOSONG'}</div>
                    </div>
                </div>`;
        });
        page2.innerHTML = `
            <div class="text-center mb-6 border-b-2 border-black pb-2">
                <h1 class="text-xl font-extrabold uppercase">SMP NEGERI 2 KEDUNGBANTENG</h1>
                <h2 class="text-base font-bold uppercase">DENAH TEMPAT DUDUK KELAS VII ${c.letter}</h2>
                <p class="text-xs font-semibold">TAHUN AJARAN ${ta}</p>
            </div>
            <div class="border-2 border-black rounded p-3 text-center font-bold text-sm mb-6 uppercase bg-gray-200">Papan Tulis & Meja Guru</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-grow content-start">${seatingGridHtml}</div>
            <div class="flex justify-between items-end text-sm w-full mt-auto pt-4">
                <div class="text-center"><p>Mengetahui,</p><p class="font-bold">Kepala Sekolah</p><div class="h-20"></div><p class="font-extrabold underline">${kepsekName}</p><p>${kepsekNip}</p></div>
                <div class="text-center"><p>${dateStr}</p><p class="font-bold">Wali Kelas</p><div class="h-20"></div><p class="font-extrabold underline">${c.waliKelas}</p><p>${c.nip}</p></div>
            </div>`;
        printArea.appendChild(page2);
    });
}

if(btnPrintAll) {
    btnPrintAll.addEventListener('click', () => {
        if(distributedClasses.length === 0) { showToast("Data Kosong", "Proses kelas terlebih dahulu.", "error"); return; }
        preparePrintArea();
        setTimeout(() => window.print(), 500); // Tunggu DOM render sebelum print
    });
}

// LOGIKA EKSPOR EXCEL (PERBAIKAN BUG)
if(btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
        if(distributedClasses.length === 0) { showToast("Data Kosong", "Proses kelas terlebih dahulu.", "error"); return; }
        if (typeof XLSX === 'undefined') { showToast("Gagal", "Library Excel belum dimuat.", "error"); return; }
        
        const wb = XLSX.utils.book_new();
        const ta = document.getElementById('config-ta').value;
        
        distributedClasses.forEach(c => {
            const wsData = [
                ["DAFTAR SISWA KELAS VII " + c.letter],
                ["SMP NEGERI 2 KEDUNGBANTENG - TA. " + ta],
                [],
                ["NO", "NISN", "NAMA LENGKAP SISWA", "L/P", "ASAL SEKOLAH"]
            ];
            c.students.forEach((s, idx) => {
                wsData.push([idx + 1, s.nisn, s.namaSiswa, s.jenisKelamin, s.namaSekolah]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{wch:5}, {wch:15}, {wch:35}, {wch:5}, {wch:30}];
            XLSX.utils.book_append_sheet(wb, ws, `Kelas VII ${c.letter}`);
        });
        
        XLSX.writeFile(wb, `Pembagian_Kelas_Baru_${ta.replace('/','-')}.xlsx`);
        showToast("Berhasil", "Berkas Excel berhasil diunduh.", "success");
    });
}

// Data Simulasi
btnDemo.addEventListener('click', () => {
    initClassConfigurations();
    let list = [];
    for (let i = 0; i < 224; i++) {
        const isBoy = Math.random() > 0.5;
        list.push({
            nisn: String(1203000000 + i),
            namaSiswa: (isBoy ? "Budi " : "Siti ") + "Pratama " + i,
            jenisKelamin: isBoy ? 'L' : 'P',
            skorNilai: parseFloat((65 + Math.random() * 34).toFixed(1)),
            namaSekolah: "SDN 1 KEDUNGBANTENG",
            prestasi: Math.random() < 0.15 ? "Sertifikat" : "Kosong"
        });
    }
    rawStudents = list;
    showToast("Data Simulasi", "Berhasil membuat 224 data siswa.", "success");
});

btnProcess.addEventListener('click', processAndDistribute);
window.onload = initClassConfigurations;
