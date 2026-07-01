let rawStudents = [];
let distributedClasses = [];
let activeClassIndex = 0;
let viewMode = 'list'; 
let classConfigurations = []; 

const defaultFirebaseConfig = {
    apiKey: "AIzaSyB5IcirgGz6O0yclUseCUO-S_QKSMUvtpc",
    authDomain: "smpn2-kedungbanteng-app.firebaseapp.com",
    projectId: "smpn2-kedungbanteng-app",
    storageBucket: "smpn2-kedungbanteng-app.firebasestorage.app",
    messagingSenderId: "524999715159",
    appId: "1:524999715159:web:6d6398a3e294a4d080b612"
};

let db = null;
let isFirebaseActive = false;
let authUser = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'smpn2-kedungbanteng-app';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const btnDemo = document.getElementById('btn-demo');
const btnTemplate = document.getElementById('btn-template');
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

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0 ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`;
    const iconMarkup = type === 'success' ? `<i data-lucide="check-circle-2" class="text-emerald-500 w-5 h-5 flex-shrink-0"></i>` : type === 'error' ? `<i data-lucide="alert-triangle" class="text-rose-500 w-5 h-5 flex-shrink-0"></i>` : `<i data-lucide="info" class="text-blue-500 w-5 h-5 flex-shrink-0"></i>`;
    toast.innerHTML = `${iconMarkup}<div><h4 class="font-bold">${title}</h4><p class="text-xs opacity-90 mt-0.5">${message}</p></div>`;
    toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'w-5 h-5' } });
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 50);
    setTimeout(() => { toast.classList.add('translate-y-2', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 4000);
}
lucide.createIcons();

function getShortName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return parts.join(' ');
    return parts[0] + ' ' + parts[1] + ' ' + parts[2].charAt(0) + '.';
}

function toProperCase(str) {
    if (!str) return '';
    let parts = String(str).replace(/\s+/g, ' ').trim().split(',');
    parts[0] = parts[0].split(' ').map(word => {
        const upper = word.toUpperCase();
        if (['SD', 'SDN', 'MI', 'MIM', 'MIN', 'SMP', 'SMA', 'SMK', 'MA', 'MTS', 'PMB', 'VII', 'VIII', 'IX', 'A', 'B', 'C', 'D'].includes(upper)) return upper;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    for (let i = 1; i < parts.length; i++) {
        let degree = parts[i].trim().toLowerCase().replace(/\./g, '');
        if (degree === 'spd') parts[i] = ' S.Pd.';
        else if (degree === 'mpd') parts[i] = ' M.Pd.';
        else parts[i] = ' ' + parts[i].trim().charAt(0).toUpperCase() + parts[i].trim().slice(1);
    }
    return parts.join(',');
}

function initClassConfigurations() {
    if (!configClassesInput) return;
    const count = parseInt(configClassesInput.value) || 7;
    const currentConfigs = [...classConfigurations];
    classConfigurations = [];
    classSettingsList.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const letter = String.fromCharCode(65 + i); 
        const existing = currentConfigs.find(c => c.letter === letter);
        const configObj = {
            letter: letter,
            type: existing ? existing.type : (i === count - 1 ? 'prestasi' : (i < 2 ? 'akademik' : 'reguler')),
            waliKelas: existing ? existing.waliKelas : `Wali Kelas VII ${letter}`,
            nip: existing ? existing.nip : ''
        };
        classConfigurations.push(configObj);

        const row = document.createElement('div');
        row.className = "p-3 bg-slate-50 rounded-xl border flex flex-col gap-2";
        row.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-blue-900">KELAS VII ${letter}</span>
                <select data-letter="${letter}" class="class-type-select px-2 py-1 text-[11px] border rounded font-bold">
                    <option value="reguler" ${configObj.type === 'reguler' ? 'selected' : ''}>Reguler</option>
                    <option value="akademik" ${configObj.type === 'akademik' ? 'selected' : ''}>Akademik</option>
                    <option value="prestasi" ${configObj.type === 'prestasi' ? 'selected' : ''}>Prestasi</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Wali Kelas" data-letter="${letter}" class="class-wali-input px-2 py-1 text-xs border rounded" value="${configObj.waliKelas}">
                <input type="text" placeholder="NIP Wali Kelas" data-letter="${letter}" class="class-nip-input px-2 py-1 text-xs border rounded" value="${configObj.nip}">
            </div>
        `;
        classSettingsList.appendChild(row);
    }

    document.querySelectorAll('.class-type-select, .class-wali-input, .class-nip-input').forEach(el => {
        el.addEventListener('change', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (!conf) return;
            if (e.target.classList.contains('class-type-select')) conf.type = e.target.value;
            else if (e.target.classList.contains('class-wali-input')) conf.waliKelas = toProperCase(e.target.value);
            else conf.nip = e.target.value;
            
            e.target.value = e.target.classList.contains('class-wali-input') ? conf.waliKelas : e.target.value;
            syncWaliKelasToDistributed();
            triggerAutosave();
        });
    });
}
if (configClassesInput) configClassesInput.addEventListener('change', initClassConfigurations);

function syncWaliKelasToDistributed() {
    distributedClasses.forEach(dClass => {
        const conf = classConfigurations.find(c => c.letter === dClass.letter);
        if (conf) {
            dClass.waliKelas = conf.waliKelas;
            dClass.nip = conf.nip;
        }
    });
    renderClassContent();
}

const configInputs = document.querySelectorAll('.config-input');
if (configInputs) configInputs.forEach(el => el.addEventListener('change', triggerAutosave));

let saveTimeout = null;
function triggerAutosave() {
    if (!isFirebaseActive || !authUser) return;
    document.getElementById('autosave-indicator').classList.remove('hidden');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('configurations').doc('main_config').set({
                ta: document.getElementById('config-ta').value,
                date: document.getElementById('config-date').value,
                capacity: document.getElementById('config-capacity').value,
                classes: document.getElementById('config-classes').value,
                kepsekName: document.getElementById('config-kepsek-name').value,
                kepsekNip: document.getElementById('config-kepsek-nip').value,
                classConfigurations: classConfigurations
            });
            document.getElementById('autosave-indicator').innerHTML = `<i data-lucide="cloud-lightning" class="w-3 h-3 text-emerald-500"></i> Tersimpan`;
            lucide.createIcons();
        } catch (err) { console.error(err); }
    }, 1500);
}

async function loadConfigFromFirestore() {
    if (!isFirebaseActive || !authUser) return;
    try {
        const doc = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('configurations').doc('main_config').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.ta) document.getElementById('config-ta').value = data.ta;
            if (data.date) document.getElementById('config-date').value = data.date;
            if (data.capacity) document.getElementById('config-capacity').value = data.capacity;
            if (data.classes) document.getElementById('config-classes').value = data.classes;
            if (data.kepsekName) document.getElementById('config-kepsek-name').value = data.kepsekName;
            if (data.kepsekNip) document.getElementById('config-kepsek-nip').value = data.kepsekNip;
            if (data.classConfigurations) classConfigurations = data.classConfigurations;
            initClassConfigurations();
        }
    } catch (err) { console.error(err); }
}

async function initFirebase() {
    try {
        if (!firebase.apps.length) firebase.initializeApp(defaultFirebaseConfig);
        db = firebase.firestore();
        const userCredential = await firebase.auth().signInAnonymously();
        authUser = userCredential.user;
        if (authUser) {
            isFirebaseActive = true;
            document.getElementById('firebase-status').className = "flex items-center gap-1.5 text-xs bg-emerald-950/40 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800 shadow-sm";
            document.getElementById('firebase-status').innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Cloud Terhubung</span>`;
            document.getElementById('btn-load-cloud').classList.remove('hidden');
            
            await loadConfigFromFirestore();
            if (classConfigurations.length === 0) initClassConfigurations();
            
            // PERBAIKAN: Otomatis load hasil kelas ketika berhasil terhubung!
            await loadResultFromFirestore(false);
        }
    } catch (err) {
        isFirebaseActive = false;
        initClassConfigurations();
    }
}

async function saveResultToFirestore() {
    if (!isFirebaseActive || !authUser) return;
    try {
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('results').doc('latest_distribution').set({
            rawStudents, distributedClasses
        });
        showToast("Hasil Tersimpan", "Berhasil disimpan ke cloud.", "success");
    } catch (err) { console.error(err); }
}

async function loadResultFromFirestore(explicit = false) {
    if (!isFirebaseActive || !authUser) return;
    try {
        const doc = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('results').doc('latest_distribution').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.rawStudents) rawStudents = data.rawStudents;
            if (data.distributedClasses) {
                // PERBAIKAN: Pasang ulang Wali Kelas dan NIP dari Konfigurasi panel kiri terbaru
                distributedClasses = data.distributedClasses.map(c => {
                    const matchedConfig = classConfigurations.find(conf => conf.letter === c.letter);
                    return {
                        ...c,
                        waliKelas: matchedConfig ? matchedConfig.waliKelas : c.waliKelas,
                        nip: matchedConfig ? matchedConfig.nip : c.nip,
                        seating: arrangeSeating(c.students || [])
                    };
                });
                activeClassIndex = 0;
                renderStatsPanel();
                renderClassTabs();
                renderClassContent();
                mainStateCard.classList.add('hidden');
                resultCard.classList.remove('hidden');
                quickStats.classList.remove('hidden');
                if (explicit) showToast("Data Dimuat", "Hasil pembagian kelas berhasil di-restore.", "success");
            }
        }
    } catch (err) { console.error(err); }
}

if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        let parsed = [];
        for (let i = 2; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[2]) continue;
            let jk = row[3] ? String(row[3]).trim().toUpperCase() : 'L';
            if(jk!=='L' && jk!=='P') jk = (jk.includes('PEREMPUAN')||jk==='F') ? 'P' : 'L';
            parsed.push({
                nisn: row[1] ? String(row[1]).trim() : `120300${1000+i}`,
                namaSiswa: toProperCase(row[2]),
                jenisKelamin: jk,
                skorNilai: parseFloat(String(row[4]||'75').replace(',','.')) || 75.0,
                namaSekolah: String(row[5]||'SD ASAL').toUpperCase(),
                prestasi: String(row[6]||'').toLowerCase().includes('sertifikat') ? 'Sertifikat' : 'Kosong'
            });
        }
        rawStudents = parsed;
        renderStatsPanel();
        showToast("Sukses", `Memuat ${rawStudents.length} siswa.`, "success");
    };
    reader.readAsArrayBuffer(file);
}

function processAndDistribute() {
    if (rawStudents.length === 0) return;
    const capacity = parseInt(document.getElementById('config-capacity').value) || 32;
    let newClasses = classConfigurations.map(c => ({
        ...c, capacity, students: []
    }));

    let poolPrestasi = rawStudents.filter(s => s.prestasi === 'Sertifikat');
    let poolReguler = rawStudents.filter(s => s.prestasi !== 'Sertifikat');
    const kelasPrestasi = newClasses.filter(c => c.type === 'prestasi');

    if (kelasPrestasi.length > 0) {
        poolPrestasi.forEach(s => {
            let tc = kelasPrestasi.sort((a,b) => a.students.length - b.students.length)[0];
            if(tc.students.length < tc.capacity) tc.students.push(s); else poolReguler.push(s);
        });
    } else { poolReguler = poolReguler.concat(poolPrestasi); }

    let boys = poolReguler.filter(s => s.jenisKelamin === 'L');
    let girls = poolReguler.filter(s => s.jenisKelamin === 'P');
    const available = newClasses.filter(c => c.type !== 'prestasi');

    const dist = (pool) => {
        pool.sort((a,b) => a.namaSekolah.localeCompare(b.namaSekolah)).forEach(s => {
            let tc = available.filter(c => c.students.length < c.capacity).sort((a,b) => a.students.length - b.students.length)[0];
            if(!tc) tc = newClasses.filter(c => c.students.length < c.capacity)[0];
            if(tc) tc.students.push(s);
        });
    };
    dist(boys); dist(girls);

    newClasses.forEach(c => {
        c.students.sort((a,b) => a.namaSiswa.localeCompare(b.namaSiswa));
        c.seating = arrangeSeating(c.students);
    });

    distributedClasses = newClasses;
    activeClassIndex = 0;
    renderStatsPanel();
    renderClassTabs();
    renderClassContent();
    mainStateCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    quickStats.classList.remove('hidden');
    saveResultToFirestore();
}

function arrangeSeating(students) {
    const boys = students.filter(s => s.jenisKelamin === 'L');
    const girls = students.filter(s => s.jenisKelamin === 'P');
    let pairs = [];
    while (boys.length >= 2) pairs.push([boys.shift(), boys.shift()]);
    while (girls.length >= 2) pairs.push([girls.shift(), girls.shift()]);
    if (boys.length === 1 && girls.length === 1) pairs.push([boys.shift(), girls.shift()]);
    else {
        if (boys.length === 1) pairs.push([boys.shift(), null]);
        if (girls.length === 1) pairs.push([girls.shift(), null]);
    }
    return pairs;
}

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
        btn.className = `px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`;
        btn.innerHTML = `VII ${c.letter} <span class="ml-1 text-[10px] ${isActive ? 'bg-blue-500 text-blue-100' : 'bg-slate-200 text-slate-500'} px-1.5 py-0.5 rounded-full">${c.students.length}</span>`;
        btn.addEventListener('click', () => { activeClassIndex = index; renderClassTabs(); renderClassContent(); });
        classTabs.appendChild(btn);
    });
}

if(toggleListView) toggleListView.addEventListener('click', () => { viewMode = 'list'; updateToggleStyle(); });
if(toggleSeatingView) toggleSeatingView.addEventListener('click', () => { viewMode = 'seating'; updateToggleStyle(); });

function updateToggleStyle() {
    if (viewMode === 'list') {
        toggleListView.className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition flex items-center gap-1.5";
        toggleSeatingView.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5";
    } else {
        toggleListView.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5";
        toggleSeatingView.className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition flex items-center gap-1.5";
    }
    renderClassContent();
}

function renderClassContent() {
    const c = distributedClasses[activeClassIndex];
    if (!c) return;
    const boysCount = c.students.filter(s => s.jenisKelamin === 'L').length;
    const girlsCount = c.students.filter(s => s.jenisKelamin === 'P').length;
    const avgScore = (c.students.reduce((acc, s) => acc + s.skorNilai, 0) / (c.students.length || 1)).toFixed(1);

    // PERBAIKAN: Render info Wali Kelas di panel Header secara benar dari activeClass (yg sudah disync)
    let html = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div><span class="text-xs text-slate-500 block">Total Siswa</span><span class="font-extrabold text-slate-800">${c.students.length} Siswa</span></div>
            <div><span class="text-xs text-slate-500 block">Komposisi</span><span class="font-bold text-slate-700">${boysCount} L / ${girlsCount} P</span></div>
            <div><span class="text-xs text-slate-500 block">Rata-rata</span><span class="font-bold text-amber-600 flex items-center gap-1"><i data-lucide="star" class="w-3 h-3"></i> ${avgScore}</span></div>
            <div><span class="text-xs text-slate-500 block">Wali Kelas</span><span class="font-bold text-slate-700 truncate block" title="${c.waliKelas}">${c.waliKelas || '-'}</span></div>
        </div>
    `;

    if (viewMode === 'list') {
        html += `<div class="overflow-x-auto border rounded-xl"><table class="w-full text-left"><thead class="bg-slate-100 text-xs uppercase font-bold"><tr><th class="p-3 w-12 text-center">No</th><th class="p-3">NISN</th><th class="p-3">Nama Lengkap</th><th class="p-3 text-center">L/P</th><th class="p-3">Asal Sekolah</th></tr></thead><tbody class="bg-white">`;
        c.students.forEach((s, i) => {
            html += `<tr class="border-b text-sm"><td class="p-3 text-center">${i+1}</td><td class="p-3 font-mono text-xs">${s.nisn}</td><td class="p-3 font-bold">${s.namaSiswa}</td><td class="p-3 text-center font-bold">${s.jenisKelamin}</td><td class="p-3 text-xs">${s.namaSekolah}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<div class="bg-slate-800 rounded-xl p-6 text-white min-h-[400px]">
            <div class="bg-slate-700 text-center py-2.5 rounded-lg font-bold text-xs uppercase mb-6 shadow-inner">Papan Tulis & Meja Guru</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
        c.seating.forEach((pair, idx) => {
            const p1 = pair[0] ? `<div class="p-1 rounded text-center bg-slate-900/50"><div class="text-[9px] font-bold text-white mb-0.5">${pair[0].jenisKelamin}</div><div class="text-[10px] font-bold text-${pair[0].jenisKelamin==='L'?'blue':'rose'}-300 truncate">${getShortName(pair[0].namaSiswa)}</div></div>` : `<div class="p-1 rounded text-center border border-dashed border-slate-700 text-slate-600 text-[10px]">Kosong</div>`;
            const p2 = pair[1] ? `<div class="p-1 rounded text-center bg-slate-900/50"><div class="text-[9px] font-bold text-white mb-0.5">${pair[1].jenisKelamin}</div><div class="text-[10px] font-bold text-${pair[1].jenisKelamin==='L'?'blue':'rose'}-300 truncate">${getShortName(pair[1].namaSiswa)}</div></div>` : `<div class="p-1 rounded text-center border border-dashed border-slate-700 text-slate-600 text-[10px]">Kosong</div>`;
            html += `<div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow"><div class="text-center text-[9px] font-extrabold text-slate-500 mb-2 border-b border-slate-700 pb-1">Meja ${idx+1}</div><div class="grid grid-cols-2 gap-1.5">${p1}${p2}</div></div>`;
        });
        html += `</div></div>`;
    }
    dynamicContentArea.innerHTML = html;
    lucide.createIcons({ root: dynamicContentArea });
}

// PERBAIKAN LOGIKA CETAK PDF
function preparePrintArea() {
    printArea.innerHTML = '';
    const ta = document.getElementById('config-ta').value;
    const dateStr = document.getElementById('config-date').value;
    const kepsekName = document.getElementById('config-kepsek-name').value || "Kepala Sekolah";
    const kepsekNip = document.getElementById('config-kepsek-nip').value || "NIP Kepala Sekolah";
    
    distributedClasses.forEach(c => {
        const boysCount = c.students.filter(s => s.jenisKelamin === 'L').length;
        const girlsCount = c.students.filter(s => s.jenisKelamin === 'P').length;
        
        // Halaman 1: Daftar Nama
        const page1 = document.createElement('div');
        page1.className = 'print-page bg-white p-4 flex flex-col justify-between';
        
        let tableRows = '';
        c.students.forEach((s, idx) => {
            tableRows += `<tr class="border-b border-slate-400">
                <td class="border-r border-slate-400 px-2 py-0.5 text-center text-[11px]">${idx + 1}</td>
                <td class="border-r border-slate-400 px-2 py-0.5 text-[11px] font-mono">${s.nisn}</td>
                <td class="border-r border-slate-400 px-2 py-0.5 text-[11px] font-bold">${s.namaSiswa}</td>
                <td class="border-r border-slate-400 px-2 py-0.5 text-center text-[11px]">${s.jenisKelamin}</td>
                <td class="px-2 py-0.5 text-[11px] truncate">${s.namaSekolah}</td>
            </tr>`;
        });

        page1.innerHTML = `
            <div class="text-center border-b-2 border-black pb-2 mb-3">
                <h1 class="text-lg font-black uppercase">SMP NEGERI 2 KEDUNGBANTENG</h1>
                <h2 class="text-sm font-bold uppercase mt-1">DAFTAR NAMA SISWA KELAS VII ${c.letter}</h2>
                <p class="text-xs font-semibold uppercase">TAHUN AJARAN ${ta}</p>
            </div>
            
            <div class="flex justify-between items-end mb-2 px-1 text-xs font-bold uppercase">
                <div>Jumlah Laki-laki: ${boysCount} | Perempuan: ${girlsCount}</div>
                <div>Total: ${c.students.length} Siswa</div>
            </div>

            <div class="flex-grow w-full max-h-[850px] overflow-hidden">
                <table class="w-full text-left border-collapse border border-slate-400">
                    <thead class="bg-slate-200 border-b border-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                            <th class="border-r border-slate-400 py-1 px-2 text-center w-10">No</th>
                            <th class="border-r border-slate-400 py-1 px-2 w-28">NISN</th>
                            <th class="border-r border-slate-400 py-1 px-2">Nama Lengkap</th>
                            <th class="border-r border-slate-400 py-1 px-2 text-center w-12">L/P</th>
                            <th class="py-1 px-2 w-48">Asal Sekolah</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-900 bg-white">${tableRows}</tbody>
                </table>
            </div>

            <div class="flex justify-between items-end text-slate-900 w-full mt-4 pb-2 px-8">
                <div class="text-center">
                    <p class="font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Sekolah</p>
                    <div class="h-16"></div>
                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                    <p class="text-xs font-semibold">${kepsekNip}</p>
                </div>
                <div class="text-center">
                    <p>${dateStr}</p>
                    <p class="font-bold">Wali Kelas</p>
                    <div class="h-16"></div>
                    <p class="font-extrabold underline text-sm">${c.waliKelas || 'Wali Kelas'}</p>
                    <p class="text-xs font-semibold">${c.nip || '-'}</p>
                </div>
            </div>
        `;

        // Halaman 2: Denah Tempat Duduk
        const page2 = document.createElement('div');
        page2.className = 'print-page bg-white p-4 flex flex-col justify-between';
        
        let seatingGridHtml = '';
        c.seating.forEach((pair, pairIdx) => {
            seatingGridHtml += `
                <div class="border border-slate-400 p-2 text-center bg-white rounded-md h-[125px] flex flex-col justify-between">
                    <div class="font-extrabold text-[10px] border-b border-slate-300 pb-1 mb-1 text-slate-500 uppercase">Meja ${pairIdx + 1}</div>
                    <div class="grid grid-cols-2 gap-1.5 text-[10px] items-center h-full">
                        ${pair[0] ? `<div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center"><div class="font-extrabold text-[10px] leading-tight text-slate-900 break-words line-clamp-3">${pair[0].namaSiswa}</div></div>` : `<div class="p-1 rounded border border-dashed text-slate-400 italic bg-slate-50 h-full flex items-center justify-center">Kosong</div>`}
                        ${pair[1] ? `<div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center"><div class="font-extrabold text-[10px] leading-tight text-slate-900 break-words line-clamp-3">${pair[1].namaSiswa}</div></div>` : `<div class="p-1 rounded border border-dashed text-slate-400 italic bg-slate-50 h-full flex items-center justify-center">Kosong</div>`}
                    </div>
                </div>`;
        });

        page2.innerHTML = `
            <div class="text-center border-b-2 border-black pb-2 mb-4">
                <h1 class="text-lg font-black uppercase">SMP NEGERI 2 KEDUNGBANTENG</h1>
                <h2 class="text-sm font-bold uppercase mt-1">DENAH TEMPAT DUDUK KELAS VII ${c.letter}</h2>
                <p class="text-xs font-semibold uppercase">TAHUN AJARAN ${ta}</p>
            </div>
            
            <div class="border-2 border-black bg-slate-200 text-black text-center py-2 rounded font-black text-xs uppercase mb-6 mx-10">Papan Tulis & Meja Guru (Depan Kelas)</div>
            
            <div class="grid grid-cols-4 gap-3 flex-grow px-2 content-start min-h-[600px]">${seatingGridHtml}</div>
            
            <div class="flex justify-between items-end text-slate-900 w-full mt-4 pb-2 px-8">
                <div class="text-center">
                    <p class="font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Sekolah</p>
                    <div class="h-16"></div>
                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                    <p class="text-xs font-semibold">${kepsekNip}</p>
                </div>
                <div class="text-center">
                    <p>${dateStr}</p>
                    <p class="font-bold">Wali Kelas</p>
                    <div class="h-16"></div>
                    <p class="font-extrabold underline text-sm">${c.waliKelas || 'Wali Kelas'}</p>
                    <p class="text-xs font-semibold">${c.nip || '-'}</p>
                </div>
            </div>
        `;
        printArea.appendChild(page1);
        printArea.appendChild(page2);
    });
}

if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
        if (distributedClasses.length === 0) { showToast("Data Kosong", "Proses kelas terlebih dahulu.", "error"); return; }
        const wb = XLSX.utils.book_new();
        const ta = document.getElementById('config-ta').value;
        distributedClasses.forEach(c => {
            const wsData = [
                ["DAFTAR SISWA KELAS VII " + c.letter],
                ["SMP NEGERI 2 KEDUNGBANTENG - TA. " + ta], [],
                ["NO", "NISN", "NAMA LENGKAP SISWA", "L/P", "ASAL SEKOLAH"]
            ];
            c.students.forEach((s, idx) => wsData.push([idx + 1, s.nisn, s.namaSiswa, s.jenisKelamin, s.namaSekolah]));
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 35}, {wch: 5}, {wch: 30}];
            XLSX.utils.book_append_sheet(wb, ws, `Kelas VII ${c.letter}`);
        });
        XLSX.writeFile(wb, `Pembagian_Kelas_Baru_${ta.replace('/','-')}.xlsx`);
    });
}

if (btnDemo) btnDemo.addEventListener('click', () => {
    rawStudents = [...Array(240)].map((_,i) => ({
        nisn: `120300${1000+i}`, namaSiswa: `Siswa Simulasi ${i+1}`, jenisKelamin: Math.random()>0.5?'L':'P', skorNilai: 80, namaSekolah: "SDN 1 KEDUNGBANTENG", prestasi: "Kosong"
    }));
    showToast("Simulasi", "Berhasil membuat 240 data siswa.", "success");
});

if (btnProcess) btnProcess.addEventListener('click', processAndDistribute);
if (btnTemplate) btnTemplate.addEventListener('click', () => { showToast("Info", "Template dapat diunduh (Logika excel placeholder).", "info"); });
if (btnPrintAll) btnPrintAll.addEventListener('click', () => {
    if(distributedClasses.length===0) return showToast("Kosong", "Tidak ada data.", "error");
    preparePrintArea(); setTimeout(() => window.print(), 500);
});
window.onload = initFirebase;
