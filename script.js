// Global State
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

// DOM Elements
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

// Inisialisasi Icon
lucide.createIcons();

// Sistem Toast
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0`;
    
    let bgClass = type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                  type === 'error' ? "bg-rose-50 border-rose-200 text-rose-900" :
                  "bg-blue-50 border-blue-200 text-blue-900";
                  
    let iconMarkup = type === 'success' ? `<i data-lucide="check-circle-2" class="text-emerald-500 w-5 h-5 flex-shrink-0"></i>` :
                     type === 'error' ? `<i data-lucide="alert-triangle" class="text-rose-500 w-5 h-5 flex-shrink-0"></i>` :
                     `<i data-lucide="info" class="text-blue-500 w-5 h-5 flex-shrink-0"></i>`;

    toast.className += ` ${bgClass}`;
    toast.innerHTML = `${iconMarkup}<div><h4 class="font-bold">${title}</h4><p class="text-xs opacity-90 mt-0.5">${message}</p></div>`;

    toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'w-5 h-5' } });
    
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 50);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Helpers
function getShortName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]} ${parts[2].charAt(0)}.`;
}

function toProperCase(str) {
    if (!str) return '';
    let cleanStr = String(str).replace(/\s+/g, ' ').trim();
    let parts = cleanStr.split(',');
    
    let namePart = parts[0].split(' ').map(word => {
        const upper = word.toUpperCase();
        if (['SD', 'SDN', 'MI', 'MIM', 'MIN', 'SMP', 'SMA', 'SMK', 'MA', 'MTS', 'PMB', 'VII', 'VIII', 'IX', 'A', 'B', 'C', 'D'].includes(upper)) return upper;
        if (word.includes("'")) return word.split("'").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');

    parts[0] = namePart;
    for (let i = 1; i < parts.length; i++) {
        let degree = parts[i].trim();
        let lower = degree.replace(/\./g, '').toLowerCase();
        if (lower === 'spd') degree = 'S.Pd.';
        else if (lower === 'mpd') degree = 'M.Pd.';
        else if (lower === 'sag') degree = 'S.Ag.';
        else if (lower === 'sip') degree = 'S.IP.';
        else degree = degree.charAt(0).toUpperCase() + degree.slice(1);
        parts[i] = ' ' + degree;
    }
    return parts.join(',');
}

function normalizeSchool(name) {
    if (!name) return "SD SEBELUMNYA";
    let clean = name.toLowerCase().trim();
    clean = clean.replace(/sekolah dasar negeri|sekolah dasar negri|sd negeri|sd negri|sd\s+n\s*/g, 'SDN ');
    clean = clean.replace(/madrasah ibtidaiyah|mi\s+negeri/g, 'MIN ');
    return clean.toUpperCase();
}

// Fitur Konfigurasi Kelas
function initClassConfigurations() {
    if (!configClassesInput) return;
    const classCount = parseInt(configClassesInput.value) || 7;
    const currentConfigs = [...classConfigurations];
    classConfigurations = [];
    classSettingsList.innerHTML = '';

    for (let i = 0; i < classCount; i++) {
        const letter = String.fromCharCode(65 + i); // A, B, C...
        const existing = currentConfigs.find(c => c.letter === letter);
        let defaultType = 'reguler';
        if (i === classCount - 1) defaultType = 'prestasi';
        else if (i < 2) defaultType = 'akademik';

        const configObj = {
            letter: letter,
            type: existing ? existing.type : defaultType,
            waliKelas: existing ? existing.waliKelas : `Wali Kelas VII ${letter}`,
            nip: existing ? existing.nip : ''
        };
        classConfigurations.push(configObj);

        const row = document.createElement('div');
        row.className = "p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2";
        row.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 text-sm">Kelas VII ${letter}</span>
                <select class="class-type-select text-xs border border-slate-300 rounded px-2 py-1 outline-none" data-letter="${letter}">
                    <option value="reguler" ${configObj.type === 'reguler' ? 'selected' : ''}>Reguler</option>
                    <option value="akademik" ${configObj.type === 'akademik' ? 'selected' : ''}>Akademik</option>
                    <option value="prestasi" ${configObj.type === 'prestasi' ? 'selected' : ''}>Prestasi</option>
                </select>
            </div>
            <div class="flex gap-2">
                <input type="text" class="class-walikelas-input w-2/3 px-2 py-1.5 border border-slate-300 rounded text-xs" placeholder="Nama Wali Kelas" value="${configObj.waliKelas}" data-letter="${letter}">
                <input type="text" class="class-nip-input w-1/3 px-2 py-1.5 border border-slate-300 rounded text-xs" placeholder="NIP" value="${configObj.nip}" data-letter="${letter}">
            </div>
        `;
        classSettingsList.appendChild(row);
    }

    // Attach Listeners to dynamic inputs
    document.querySelectorAll('.class-type-select, .class-walikelas-input, .class-nip-input').forEach(el => {
        el.addEventListener('change', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (!conf) return;

            if (e.target.classList.contains('class-type-select')) conf.type = e.target.value;
            else if (e.target.classList.contains('class-walikelas-input')) conf.waliKelas = toProperCase(e.target.value);
            else conf.nip = e.target.value;

            e.target.value = e.target.classList.contains('class-walikelas-input') ? conf.waliKelas : e.target.value;
            
            const dClass = distributedClasses.find(cl => cl.letter === letter);
            if (dClass) {
                dClass.waliKelas = conf.waliKelas;
                dClass.nip = conf.nip;
                renderClassContent();
            }
            triggerAutosave();
        });
    });
}

const configInputs = document.querySelectorAll('.config-input');
configInputs.forEach(el => el.addEventListener('change', triggerAutosave));
if(configClassesInput) configClassesInput.addEventListener('change', initClassConfigurations);

// Autosave & Firebase Sync
let saveTimeout = null;
function triggerAutosave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveConfigToFirestore, 1000);
}

async function saveConfigToFirestore() {
    if (!isFirebaseActive || !authUser) return;
    try {
        const data = {
            ta: document.getElementById('config-ta').value,
            date: document.getElementById('config-date').value,
            capacity: document.getElementById('config-capacity').value,
            classes: document.getElementById('config-classes').value,
            kepsekName: document.getElementById('config-kepsek-name').value,
            kepsekNip: document.getElementById('config-kepsek-nip').value,
            classConfigurations: classConfigurations
        };
        await db.collection('artifacts').doc(appId).collection('users').doc(authUser.uid).collection('settings').doc('config').set(data);
        document.getElementById('autosave-indicator').classList.remove('hidden');
        setTimeout(() => document.getElementById('autosave-indicator').classList.add('hidden'), 2000);
    } catch (err) {
        console.error("Autosave Failed:", err);
    }
}

async function loadConfigFromFirestore() {
    if (!isFirebaseActive || !authUser) return;
    try {
        const docSnap = await db.collection('artifacts').doc(appId).collection('users').doc(authUser.uid).collection('settings').doc('config').get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if(data.ta) document.getElementById('config-ta').value = data.ta;
            if(data.date) document.getElementById('config-date').value = data.date;
            if(data.capacity) document.getElementById('config-capacity').value = data.capacity;
            if(data.classes) document.getElementById('config-classes').value = data.classes;
            if(data.kepsekName) document.getElementById('config-kepsek-name').value = data.kepsekName;
            if(data.kepsekNip) document.getElementById('config-kepsek-nip').value = data.kepsekNip;
            if(data.classConfigurations) classConfigurations = data.classConfigurations;
            initClassConfigurations();
        }
    } catch (err) {
        console.error("Load Config Failed:", err);
    }
}

async function initFirebase() {
    try {
        let configToUse = defaultFirebaseConfig;
        if (!firebase.apps.length) firebase.initializeApp(configToUse);
        db = firebase.firestore();
        const auth = firebase.auth();
        
        const userCredential = await auth.signInAnonymously();
        authUser = userCredential.user;
        
        if (authUser) {
            isFirebaseActive = true;
            document.getElementById('firebase-status-text').innerText = "Cloud Terhubung";
            document.getElementById('firebase-status').classList.replace('bg-slate-800/80', 'bg-emerald-900/80');
            document.querySelector('#firebase-status span').classList.replace('bg-slate-500', 'bg-emerald-400');
            document.getElementById('btn-load-cloud').classList.remove('hidden');
            
            await loadConfigFromFirestore();
            if (classConfigurations.length === 0) initClassConfigurations();
        }
    } catch (err) {
        console.error("Firebase Init Error:", err);
        initClassConfigurations(); // Fallback lokal
    }
}

async function saveResultToFirestore() {
    if (!isFirebaseActive || !authUser) return;
    try {
        const data = { rawStudents, distributedClasses, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('results').doc('latest_distribution').set(data);
        showToast("Hasil Tersimpan", "Berhasil disimpan ke cloud.", "success");
    } catch (err) {
        showToast("Gagal Menyimpan", "Terjadi kesalahan sinkronisasi cloud.", "error");
    }
}

async function loadResultFromFirestore(explicit = false) {
    if (!isFirebaseActive || !authUser) return;
    try {
        const docSnap = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('results').doc('latest_distribution').get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.rawStudents) rawStudents = data.rawStudents;
            if (data.distributedClasses) {
                distributedClasses = data.distributedClasses.map(c => ({ ...c, seating: arrangeSeating(c.students || []) }));
                activeClassIndex = 0;
                renderStatsPanel();
                renderClassTabs();
                renderClassContent();
                mainStateCard.classList.add('hidden');
                resultCard.classList.remove('hidden');
                quickStats.classList.remove('hidden');
                if (explicit) showToast("Data Dimuat", "Hasil pembagian terakhir berhasil direstore.", "success");
            }
        } else if (explicit) {
            showToast("Data Kosong", "Belum ada riwayat pembagian kelas di cloud.", "error");
        }
    } catch (err) {
        if(explicit) showToast("Error", "Gagal memuat data.", "error");
    }
}

// Logika Algoritma Distribusi Kelas
function processAndDistribute() {
    if(rawStudents.length === 0) return;
    
    // Normalisasi
    rawStudents.forEach(s => {
        s.namaSiswa = toProperCase(s.namaSiswa);
        s.namaSekolah = normalizeSchool(s.namaSekolah);
    });

    const numClasses = classConfigurations.length;
    const capacityPerClass = parseInt(document.getElementById('config-capacity').value) || 32;
    
    let classes = classConfigurations.map(conf => ({
        letter: conf.letter,
        type: conf.type,
        waliKelas: conf.waliKelas,
        nip: conf.nip,
        capacity: capacityPerClass,
        students: []
    }));

    // Pemisahan berdasarkan prestasi (prioritas kelas prestasi)
    let poolPrestasi = rawStudents.filter(s => s.prestasi === 'Sertifikat');
    let poolReguler = rawStudents.filter(s => s.prestasi !== 'Sertifikat');

    // Distribusi kelas prestasi
    const kelasPrestasi = classes.filter(c => c.type === 'prestasi');
    if (kelasPrestasi.length > 0) {
        poolPrestasi.forEach(s => {
            let targetClass = kelasPrestasi.sort((a,b) => a.students.length - b.students.length)[0];
            if(targetClass.students.length < targetClass.capacity) targetClass.students.push(s);
            else poolReguler.push(s); // Jika penuh, lempar ke reguler
        });
    } else {
        poolReguler.push(...poolPrestasi); // Jika tidak ada kelas prestasi, gabung semua
    }

    // Distribusi merata (berdasarkan Gender & Sekolah)
    let boys = poolReguler.filter(s => s.jenisKelamin === 'L');
    let girls = poolReguler.filter(s => s.jenisKelamin === 'P');
    const availableClasses = classes.filter(c => c.type !== 'prestasi');

    const distributePool = (pool) => {
        // Group by school to spread them out
        pool.sort((a,b) => a.namaSekolah.localeCompare(b.namaSekolah));
        pool.forEach(s => {
            let targetClass = availableClasses.filter(c => c.students.length < c.capacity)
                                              .sort((a, b) => a.students.length - b.students.length)[0];
            if(targetClass) targetClass.students.push(s);
        });
    }

    distributePool(boys);
    distributePool(girls);

    classes.forEach(c => {
        c.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
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
    
    showToast("Pembagian Selesai", "Siswa berhasil didistribusikan secara proporsional.", "success");
    saveResultToFirestore();
}

function arrangeSeating(students) {
    const boys = students.filter(s => s.jenisKelamin === 'L');
    const girls = students.filter(s => s.jenisKelamin === 'P');
    let pairs = [];
    
    // Pasangkan sesama gender dahulu
    while (boys.length >= 2) pairs.push([boys.shift(), boys.shift()]);
    while (girls.length >= 2) pairs.push([girls.shift(), girls.shift()]);
    
    // Sisa digabungkan atau dibiarkan sendiri
    if (boys.length > 0 && girls.length > 0) pairs.push([boys.shift(), girls.shift()]);
    else if (boys.length > 0) pairs.push([boys.shift(), null]);
    else if (girls.length > 0) pairs.push([girls.shift(), null]);
    
    return pairs;
}

// Render Functions UI
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
        btn.className = `px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`;
        btn.innerHTML = `VII ${c.letter} <span class="ml-1 text-[10px] ${isActive ? 'bg-blue-500 text-blue-100' : 'bg-slate-200 text-slate-500'} px-1.5 py-0.5 rounded-full">${c.students.length}</span>`;
        btn.addEventListener('click', () => { activeClassIndex = index; renderClassTabs(); renderClassContent(); });
        classTabs.appendChild(btn);
    });
}

function setViewMode(mode) {
    viewMode = mode;
    toggleListView.className = mode === 'list' ? 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition flex items-center gap-1.5' : 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5';
    toggleSeatingView.className = mode === 'seating' ? 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition flex items-center gap-1.5' : 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5';
    renderClassContent();
}

function renderClassContent() {
    if (distributedClasses.length === 0) return;
    const currentClass = distributedClasses[activeClassIndex];
    dynamicContentArea.innerHTML = viewMode === 'list' ? renderTableView(currentClass) : renderSeatingView(currentClass);
    lucide.createIcons({ root: dynamicContentArea });
}

function renderTableView(c) {
    let tbody = c.students.map((s, i) => `
        <tr class="hover:bg-slate-50 border-b border-slate-100">
            <td class="p-3 text-center text-xs text-slate-500">${i + 1}</td>
            <td class="p-3 text-xs font-mono text-slate-500">${s.nisn}</td>
            <td class="p-3 font-semibold text-sm text-slate-800">${s.namaSiswa}</td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${s.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">${s.jenisKelamin}</span>
            </td>
            <td class="p-3 text-xs text-slate-600">${s.namaSekolah}</td>
        </tr>
    `).join('');

    return `
        <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th class="p-3 text-center w-12">No</th>
                        <th class="p-3">NISN</th>
                        <th class="p-3">Nama Lengkap Siswa</th>
                        <th class="p-3 text-center">L/P</th>
                        <th class="p-3">Asal Sekolah</th>
                    </tr>
                </thead>
                <tbody class="bg-white">${tbody}</tbody>
            </table>
        </div>
    `;
}

function renderSeatingView(c) {
    let html = `
        <div class="bg-slate-800 rounded-xl p-6 text-white min-h-[400px]">
            <div class="bg-slate-700 text-center py-2 rounded-lg font-bold text-xs uppercase tracking-widest mb-6 flex justify-center items-center gap-2 border border-slate-600">
                <i data-lucide="presentation" class="w-4 h-4 text-slate-400"></i> Papan Tulis & Meja Guru
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    `;

    c.seating.forEach((pair, idx) => {
        const p1 = pair[0] ? `<span class="${pair[0].jenisKelamin === 'L' ? 'text-blue-300' : 'text-rose-300'}">${getShortName(pair[0].namaSiswa)}</span>` : '<span class="text-slate-500 italic">Kosong</span>';
        const p2 = pair[1] ? `<span class="${pair[1].jenisKelamin === 'L' ? 'text-blue-300' : 'text-rose-300'}">${getShortName(pair[1].namaSiswa)}</span>` : '<span class="text-slate-500 italic">Kosong</span>';
        
        html += `
            <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow flex flex-col justify-between">
                <div class="text-center text-[9px] font-extrabold text-slate-500 mb-2.5 uppercase tracking-wider pb-1 border-b border-slate-700">Meja ${idx + 1}</div>
                <div class="flex justify-between items-center gap-2">
                    <div class="w-1/2 bg-slate-700/50 p-2 rounded-lg text-center text-xs font-semibold truncate" title="${pair[0] ? pair[0].namaSiswa : ''}">${p1}</div>
                    <div class="w-1/2 bg-slate-700/50 p-2 rounded-lg text-center text-xs font-semibold truncate" title="${pair[1] ? pair[1].namaSiswa : ''}">${p2}</div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

// Event Listeners Dasar
if(btnDemo) btnDemo.addEventListener('click', () => {
    rawStudents = generateDemoData();
    showToast("Data Simulasi", "240 Siswa berhasil di-generate secara acak.", "success");
});

if(btnProcess) btnProcess.addEventListener('click', () => {
    if(rawStudents.length === 0) { showToast("Data Kosong", "Silakan unggah data dahulu.", "error"); return; }
    processAndDistribute();
});

if(toggleListView) toggleListView.addEventListener('click', () => setViewMode('list'));
if(toggleSeatingView) toggleSeatingView.addEventListener('click', () => setViewMode('seating'));

// Simulasi Data Generator
function generateDemoData() {
    const boys = ["Agus", "Budi", "Candra", "Dedi", "Eko", "Fajar", "Gilang", "Heri"];
    const girls = ["Ayu", "Bunga", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hani"];
    const lasts = ["Pratama", "Saputra", "Wijaya", "Kusuma", "Setiawan"];
    const schools = ["SDN 1 KEDUNGBANTENG", "SDN 2 KEDUNGBANTENG", "MI MAARIF KEDUNGBANTENG"];
    
    let list = [];
    for (let i = 0; i < 240; i++) {
        const isBoy = Math.random() > 0.5;
        const first = isBoy ? boys[Math.floor(Math.random()*boys.length)] : girls[Math.floor(Math.random()*girls.length)];
        const last = lasts[Math.floor(Math.random()*lasts.length)];
        list.push({
            nisn: String(1203000000 + i),
            namaSiswa: `${first} ${last}`,
            jenisKelamin: isBoy ? 'L' : 'P',
            skorNilai: (65 + Math.random() * 34).toFixed(1),
            namaSekolah: schools[Math.floor(Math.random()*schools.length)],
            prestasi: Math.random() < 0.15 ? "Sertifikat" : "Kosong"
        });
    }
    return list;
}

window.onload = function() {
    initFirebase();
    // Fitur cetak/Excel (Menggunakan window.print standar, logic PDF akan disematkan di CSS/Print Area)
    if(btnPrintAll) {
        btnPrintAll.addEventListener('click', () => {
            if(distributedClasses.length === 0) { showToast("Kosong", "Data belum diproses.", "error"); return; }
            window.print();
        });
    }
};
