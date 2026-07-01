// Global State (DIPOSISIKAN DI ATAS UNTUK KEAMANAN INSTANSIASI)
let rawStudents = [];
let distributedClasses = [];
let activeClassIndex = 0;
let viewMode = 'list'; // 'list' or 'seating'
let classConfigurations = []; // To store customized wali kelas name, NIP and class types dynamically.

// Firebase Configuration Terintegrasi Secara Permanen (Sesuai Permintaan Anda)
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

// DOM Elements (DEKLARASI AMAN DI LEVEL ATAS)
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

// Toast Notification System
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0`;
    
    let bgClass = "bg-white border-slate-100";
    let textClass = "text-slate-800";
    let iconMarkup = "";

    if (type === 'success') {
        bgClass = "bg-emerald-50 border-emerald-200";
        textClass = "text-emerald-900";
        iconMarkup = `<i data-lucide="check-circle-2" class="text-emerald-500 w-5 h-5 flex-shrink-0"></i>`;
    } else if (type === 'error') {
        bgClass = "bg-rose-50 border-rose-200";
        textClass = "text-rose-900";
        iconMarkup = `<i data-lucide="alert-triangle" class="text-rose-500 w-5 h-5 flex-shrink-0"></i>`;
    } else {
        bgClass = "bg-blue-50 border-blue-200";
        textClass = "text-blue-900";
        iconMarkup = `<i data-lucide="info" class="text-blue-500 w-5 h-5 flex-shrink-0"></i>`;
    }

    toast.className += ` ${bgClass} ${textClass}`;
    toast.innerHTML = `
        ${iconMarkup}
        <div>
            <h4 class="font-bold">${title}</h4>
            <p class="text-xs opacity-90 mt-0.5">${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'w-5 h-5' } });
    
    // Animate In
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    // Animate Out
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Initialize Lucide Icons
lucide.createIcons();

// Helper pintar untuk memperlebar keterbacaan nama di denah tempat duduk tanpa kepotong kasar
function getShortName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ' ' + parts[1];
    // Format 3 kata atau lebih menjadi: Nama Depan + Nama Tengah + Inisial Akhir (Contoh: "Ahmad Fauzi R.")
    return parts[0] + ' ' + parts[1] + ' ' + parts[2].charAt(0) + '.';
}

// Helper function: Text Proper Case (Dioptimalkan khusus gelar akademik)
function toProperCase(str) {
    if (!str) return '';
    let cleanStr = String(str).replace(/\s+/g, ' ').trim();
    // Pisahkan berdasarkan tanda koma terlebih dahulu untuk memisahkan nama dari gelar akademik
    let parts = cleanStr.split(',');
    
    // Proses nama utama (Proper Case)
    let namePart = parts[0].split(' ').map(word => {
        const upper = word.toUpperCase();
        if (['SD', 'SDN', 'MI', 'MIM', 'MIN', 'SMP', 'SMA', 'SMK', 'MA', 'MTS', 'PMB', 'VII', 'VIII', 'IX', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(upper)) {
            return upper;
        }
        if (word.includes("'")) {
            return word.split("'").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
        }
        if (word.includes("-")) {
            return word.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');

    parts[0] = namePart;

    // Proses standarisasi penulisan gelar akademik setelah koma (S.Pd., M.Pd. dsb.)
    for (let i = 1; i < parts.length; i++) {
        let degree = parts[i].trim();
        let lower = degree.toLowerCase().replace(/\./g, '');
        if (lower === 'spd') degree = 'S.Pd.';
        else if (lower === 'mpd') degree = 'M.Pd.';
        else if (lower === 'skom') degree = 'S.Kom.';
        else if (lower === 'mkom') degree = 'M.Kom.';
        else if (lower === 'st') degree = 'S.T.';
        else if (lower === 'mt') degree = 'M.T.';
        else if (lower === 'ssi') degree = 'S.Si.';
        else if (lower === 'msi') degree = 'M.Si.';
        else if (lower === 'se') degree = 'S.E.';
        else if (lower === 'mm') degree = 'M.M.';
        else if (lower === 'sip') degree = 'S.IP.';
        else if (lower === 'spsi') degree = 'S.Psi.';
        else if (lower === 'drs') degree = 'Drs.';
        else if (lower === 'dra') degree = 'Dra.';
        else {
            degree = degree.charAt(0).toUpperCase() + degree.slice(1);
        }
        parts[i] = ' ' + degree;
    }

    return parts.join(',');
}

// Initialize Dynamic Class Configurations
function initClassConfigurations() {
    if (!configClassesInput) return;
    const classCount = parseInt(configClassesInput.value) || 7;
    const currentConfigs = [...classConfigurations];
    classConfigurations = [];

    classSettingsList.innerHTML = '';

    for (let i = 0; i < classCount; i++) {
        const letter = String.fromCharCode(65 + i); // A, B, C, etc.
        const existing = currentConfigs.find(c => c.letter === letter);

        let defaultType = 'reguler';
        if (i === 6) defaultType = 'prestasi';
        else if (i < 2) defaultType = 'akademik';

        const configObj = {
            letter: letter,
            type: existing ? existing.type : defaultType,
            waliKelas: existing ? existing.waliKelas : `Wali Kelas VII ${letter}`,
            nip: existing ? existing.nip : ''
        };

        classConfigurations.push(configObj);

        const row = document.createElement('div');
        row.className = "p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col gap-2";
        row.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-blue-900">KELAS VII ${letter}</span>
                <select data-letter="${letter}" class="class-type-select px-2 py-1 text-[11px] bg-white border border-slate-200 rounded font-bold text-slate-700">
                    <option value="reguler" ${configObj.type === 'reguler' ? 'selected' : ''}>Reguler</option>
                    <option value="akademik" ${configObj.type === 'akademik' ? 'selected' : ''}>Akademik (Unggulan)</option>
                    <option value="prestasi" ${configObj.type === 'prestasi' ? 'selected' : ''}>Prestasi (Sertifikat)</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Wali Kelas" data-letter="${letter}" class="class-wali-input px-2 py-1 text-xs border border-slate-200 bg-white rounded" value="${configObj.waliKelas}">
                <input type="text" placeholder="NIP Wali Kelas" data-letter="${letter}" class="class-nip-input px-2 py-1 text-xs border border-slate-200 bg-white rounded" value="${configObj.nip}">
            </div>
        `;
        classSettingsList.appendChild(row);
    }

    // Bind update listeners (Dengan pembaruan real-time ke distributedClasses)
    document.querySelectorAll('.class-type-select').forEach(el => {
        el.addEventListener('change', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (conf) {
                conf.type = e.target.value;
                const dClass = distributedClasses.find(cl => cl.letter === letter);
                if (dClass) {
                    dClass.type = conf.type;
                    renderClassContent();
                }
                triggerAutosave();
            }
        });
    });
    
    document.querySelectorAll('.class-wali-input').forEach(el => {
        // Perubahan real-time instan saat mengetik
        el.addEventListener('input', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (conf) {
                conf.waliKelas = e.target.value;
                const dClass = distributedClasses.find(cl => cl.letter === letter);
                if (dClass) {
                    dClass.waliKelas = e.target.value;
                    renderClassContent();
                }
                triggerAutosave();
            }
        });
        
        // Formatisasi gelar secara otomatis saat klik diluar/selesai mengetik (blur)
        el.addEventListener('blur', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (conf) {
                conf.waliKelas = toProperCase(e.target.value);
                e.target.value = conf.waliKelas; // Menampilkan format Proper Case gelar yang benar langsung di layar

                // Sinkronisasi realtime ke data kelas terdistribusi
                const dClass = distributedClasses.find(cl => cl.letter === letter);
                if (dClass) {
                    dClass.waliKelas = conf.waliKelas;
                    renderClassContent();
                }
                triggerAutosave();
            }
        });
    });
    
    document.querySelectorAll('.class-nip-input').forEach(el => {
        el.addEventListener('input', (e) => {
            const letter = e.target.getAttribute('data-letter');
            const conf = classConfigurations.find(c => c.letter === letter);
            if (conf) {
                conf.nip = e.target.value;

                // Sinkronisasi realtime ke data kelas terdistribusi
                const dClass = distributedClasses.find(cl => cl.letter === letter);
                if (dClass) {
                    dClass.nip = conf.nip;
                    renderClassContent();
                }
                triggerAutosave();
            }
        });
    });
}

// Bind update listeners untuk inputs utama
const configInputs = document.querySelectorAll('.config-input');
if (configInputs) {
    configInputs.forEach(el => {
        el.addEventListener('change', () => {
            triggerAutosave();
        });
    });
}
if (configClassesInput) {
    configClassesInput.addEventListener('change', initClassConfigurations);
}

// CLOUD FUNCTIONS: Simpan & Muat Config dengan Firestore (Realtime Autosave)
let saveTimeout = null;
function triggerAutosave() {
    if (!isFirebaseActive || !authUser) return;

    const indicator = document.getElementById('autosave-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        indicator.innerHTML = `<i data-lucide="refresh-cw" class="w-3 h-3 text-blue-500 animate-spin"></i> Menyimpan...`;
        lucide.createIcons();
    }

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const docData = {
                tahunAjaran: document.getElementById('config-ta').value,
                tanggalDokumen: document.getElementById('config-date').value,
                targetKapasitas: document.getElementById('config-capacity').value,
                jumlahKelas: document.getElementById('config-classes').value,
                kepsekNama: document.getElementById('config-kepsek-name').value,
                kepsekNip: document.getElementById('config-kepsek-nip').value,
                classConfigurations: classConfigurations,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Aturan 1: Gunakan jalur publik yang valid /artifacts/{appId}/public/data/configurations/main_config
            await db.collection('artifacts')
                .doc(appId)
                .collection('public')
                .doc('data')
                .collection('configurations')
                .doc('main_config')
                .set(docData);
            
            if (indicator) {
                indicator.innerHTML = `<i data-lucide="cloud-lightning" class="w-3 h-3 text-emerald-500"></i> Tersimpan di Cloud`;
                lucide.createIcons();
            }
        } catch (err) {
            console.error("Gagal melakukan sinkronisasi cloud", err);
            if (indicator) {
                indicator.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3 text-rose-500"></i> Gagal Menyimpan`;
                lucide.createIcons();
            }
        }
    }, 1500); // Tunggu user berhenti mengetik 1.5 detik
}

async function loadConfigFromFirestore() {
    if (!isFirebaseActive || !authUser) return;

    try {
        const docRef = db.collection('artifacts')
            .doc(appId)
            .collection('public')
            .doc('data')
            .collection('configurations')
            .doc('main_config');

        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            
            if (data.tahunAjaran) document.getElementById('config-ta').value = data.tahunAjaran;
            if (data.tanggalDokumen) document.getElementById('config-date').value = data.tanggalDokumen;
            if (data.targetKapasitas) document.getElementById('config-capacity').value = data.targetKapasitas;
            if (data.jumlahKelas) document.getElementById('config-classes').value = data.jumlahKelas;
            if (data.kepsekNama) document.getElementById('config-kepsek-name').value = data.kepsekNama;
            if (data.kepsekNip) document.getElementById('config-kepsek-nip').value = data.kepsekNip;
            if (data.classConfigurations && data.classConfigurations.length > 0) {
                classConfigurations = data.classConfigurations;
            }

            // Muat ulang UI setelan kelas agar sinkron dengan data cloud
            initClassConfigurations();
            showToast("Sinkronisasi Sukses", "Konfigurasi terakhir berhasil dimuat dari database cloud.", "success");
        }
    } catch (err) {
        console.error("Gagal membaca konfigurasi cloud", err);
    }
}

// Inisialisasi Firebase secara dinamis dan aman
async function initFirebase() {
    try {
        let configToUse = defaultFirebaseConfig;
        
        // Default langsung ke kredensial utama Anda
        const savedConfig = localStorage.getItem('reigncast_firebase_config');
        if (savedConfig) {
            configToUse = JSON.parse(savedConfig);
        }
        
        if (configToUse && configToUse.projectId) {
            // MENGATASI CLOUD OFFLINE: Cek jika Firebase belum pernah diinisiasi untuk mencegah error duplikasi instansi
            if (!firebase.apps.length) {
                firebase.initializeApp(configToUse);
            }
            db = firebase.firestore();
            const auth = firebase.auth();
            
            // Aturan 3: Lakukan otentikasi TERLEBIH DAHULU dan tunggu hingga selesai
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                const userCredential = await auth.signInWithCustomToken(__initial_auth_token);
                authUser = userCredential.user;
            } else {
                const userCredential = await auth.signInAnonymously();
                authUser = userCredential.user;
            }

            if (authUser) {
                isFirebaseActive = true;
                
                // Update Indikator UI ke mode Online
                const statusDiv = document.getElementById('firebase-status');
                if (statusDiv) {
                    statusDiv.className = "flex items-center gap-1.5 text-xs bg-emerald-950/40 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800 shadow-sm";
                    statusDiv.innerHTML = `
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Cloud Terhubung</span>
                    `;
                }

                document.getElementById('btn-load-cloud').classList.remove('hidden');

                // Tarik Config yang ada
                await loadConfigFromFirestore();
                if (classConfigurations.length === 0) {
                    initClassConfigurations();
                }
            }
        }
    } catch (err) {
        console.error("Firebase Initialization Error:", err);
        // Fallback Offline Local
        isFirebaseActive = false;
        initClassConfigurations();
    }
}

// CLOUD FUNCTIONS: Simpan & Muat Hasil Analisis (Distribusi Kelas & Denah)
async function saveResultToFirestore() {
    if (!isFirebaseActive || !authUser) return;

    try {
        const payloadData = {
            rawStudents: rawStudents,
            distributedClasses: distributedClasses,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Simpan dalam format payload besar (Bisa mencakup ribuan string)
        await db.collection('artifacts')
            .doc(appId)
            .collection('public')
            .doc('data')
            .collection('results')
            .doc('latest_distribution')
            .set(payloadData);
            
        showToast("Hasil Tersimpan", "Seluruh hasil pembagian kelas baru berhasil diunggah dan disimpan ke database cloud.", "success");
    } catch (err) {
        console.error("Gagal mengunggah hasil pembagian ke cloud:", err);
        showToast("Gagal Menyimpan Hasil", "Terjadi kesalahan saat menyinkronkan hasil pembagian ke cloud.", "error");
    }
}

async function loadResultFromFirestore(explicit = false) {
    if (!isFirebaseActive || !authUser) {
        if (explicit) showToast("Database Offline", "Firebase belum aktif atau belum dikonfigurasi.", "error");
        return;
    }

    try {
        const docRef = db.collection('artifacts')
            .doc(appId)
            .collection('public')
            .doc('data')
            .collection('results')
            .doc('latest_distribution');

        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            
            // Pulihkan data siswa mentah
            if (data.rawStudents && data.rawStudents.length > 0) {
                rawStudents = data.rawStudents;
            }
            
            // Pulihkan struktur distribusi kelas yang ada
            if (data.distributedClasses && data.distributedClasses.length > 0) {
                // Konversi string kembali ke objek karena seating array menyimpan null yang valid
                distributedClasses = data.distributedClasses.map(c => {
                    return {
                        ...c,
                        seating: arrangeSeating(c.students || []) // Re-arrange just in case UI differs
                    };
                });

                activeClassIndex = 0;
                
                // Trigger Render UI Penuh
                renderStatsPanel();
                renderClassTabs();
                renderClassContent();

                mainStateCard.classList.add('hidden');
                resultCard.classList.remove('hidden');
                quickStats.classList.remove('hidden');

                if (explicit) showToast("Data Dimuat", "Hasil pembagian kelas terakhir berhasil di-restore dari Cloud.", "success");
            } else {
                 if (explicit) showToast("Data Kosong", "Belum ada riwayat pembagian kelas di database.", "error");
            }
        } else {
            if (explicit) showToast("Data Kosong", "Belum ada riwayat pembagian kelas di database.", "error");
        }
    } catch (err) {
        console.error("Gagal memuat hasil dari cloud:", err);
        if (explicit) showToast("Error Jaringan", "Gagal memuat data dari cloud database. Periksa koneksi internet.", "error");
    }
}


// Fitur Drag & Drop dan Excel Parsing
if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-blue-500', 'bg-blue-50/20');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/20');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/20');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file) return;

    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
        showToast("Format Tidak Valid", "Hanya mendukung file .xlsx, .xls, atau .csv", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            parseExcelData(jsonData);
        } catch (error) {
            console.error("Error parsing Excel:", error);
            showToast("Gagal Membaca File", "Pastikan format file sesuai dengan template.", "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function normalizeSchoolName(schoolName) {
    if (!schoolName) return "SD SEBELUMNYA";
    
    let cleanName = String(schoolName).toLowerCase().trim();
    
    // Pattern normalisasi umum (Contoh: "sekolah dasar negeri 1" -> "SDN 1")
    cleanName = cleanName.replace(/sekolah dasar negeri|sekolah dasar negri|sd negeri|sd negri|sd\s+n\s*/g, 'SDN ');
    cleanName = cleanName.replace(/sekolah dasar/g, 'SD ');
    cleanName = cleanName.replace(/madrasah ibtidaiyah|mi\s+negeri/g, 'MIN ');
    cleanName = cleanName.replace(/madrasah ibtidaiyah muhammadiyah/g, 'MIM ');
    
    return cleanName.toUpperCase();
}

function parseExcelData(data) {
    if (data.length < 2) {
        showToast("Data Kosong", "File Excel tidak memiliki baris data yang valid.", "error");
        return;
    }

    let parsedList = [];
    
    // Cari baris header (biasanya baris pertama atau kedua)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const rowStr = data[i].join('').toLowerCase();
        if (rowStr.includes('nama') || rowStr.includes('nisn')) {
            headerRowIndex = i;
            break;
        }
    }

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue; // Skip baris kosong

        // Deteksi index kolom secara adaptif (Asumsi Template Standar)
        // [0: No, 1: NISN, 2: Nama, 3: L/P, 4: Nilai, 5: Asal Sekolah, 6: Prestasi]
        
        let nama = row[2] ? String(row[2]).trim() : '';
        if (!nama) continue; // Wajib ada nama

        let jk = row[3] ? String(row[3]).trim().toUpperCase() : 'L';
        if (jk !== 'L' && jk !== 'P') {
            if (jk.includes('LAKI') || jk === 'M') jk = 'L';
            else if (jk.includes('PEREMPUAN') || jk.includes('WANITA') || jk === 'F') jk = 'P';
            else jk = 'L'; // Default if weird
        }

        let sekolah = row[5] ? String(row[5]).trim() : 'SD ASAL';
        let nilaiStr = row[4] ? String(row[4]).replace(',', '.') : '75';
        let prestasi = row[6] ? String(row[6]).trim() : 'Kosong';

        parsedList.push({
            nisn: row[1] ? String(row[1]).trim() : `120300${1000+i}`,
            namaSiswa: toProperCase(nama),
            jenisKelamin: jk,
            skorNilai: parseFloat(nilaiStr) || 75.0,
            namaSekolah: normalizeSchoolName(sekolah),
            prestasi: prestasi.toLowerCase().includes('sertifikat') || prestasi.toLowerCase().includes('juara') ? 'Sertifikat' : 'Kosong'
        });
    }

    if (parsedList.length > 0) {
        rawStudents = parsedList;
        renderStatsPanel();
        showToast("Sukses Mengimpor", `Berhasil memuat ${rawStudents.length} data siswa.`, "success");
        
        // Auto trigger distribution if setup is ready
        setTimeout(() => {
            if (classConfigurations.length > 0) {
                processAndDistribute();
            }
        }, 800);
    } else {
        showToast("Format Salah", "Gagal mengekstrak data. Pastikan format tabel sesuai.", "error");
    }
}

// Logika Distribusi Cerdas
function processAndDistribute() {
    if (rawStudents.length === 0) {
        showToast("Data Kosong", "Silakan unggah data siswa terlebih dahulu.", "error");
        return;
    }

    const numClasses = classConfigurations.length;
    const capacityPerClass = parseInt(document.getElementById('config-capacity').value) || 32;
    
    // Inisialisasi struktur kelas baru
    let newClasses = classConfigurations.map(conf => {
        return {
            letter: conf.letter,
            type: conf.type,
            waliKelas: conf.waliKelas,
            nip: conf.nip,
            capacity: capacityPerClass,
            students: []
        };
    });

    // Pisahkan berdasarkan prestasi (untuk prioritas Kelas Prestasi)
    let poolPrestasi = rawStudents.filter(s => s.prestasi === 'Sertifikat');
    let poolReguler = rawStudents.filter(s => s.prestasi !== 'Sertifikat');

    // Distribusi Kelas Prestasi
    const kelasPrestasi = newClasses.filter(c => c.type === 'prestasi');
    if (kelasPrestasi.length > 0) {
        poolPrestasi.forEach(s => {
            // Cari kelas prestasi yang paling sedikit isinya
            let targetClass = kelasPrestasi.sort((a, b) => a.students.length - b.students.length)[0];
            if (targetClass.students.length < targetClass.capacity) {
                targetClass.students.push(s);
            } else {
                // Jika penuh, lempar ke pool reguler
                poolReguler.push(s);
            }
        });
    } else {
        // Jika tidak ada kelas prestasi, gabung semua ke pool reguler
        poolReguler = poolReguler.concat(poolPrestasi);
    }

    // Pemisahan Gender untuk Distribusi Merata
    let boys = poolReguler.filter(s => s.jenisKelamin === 'L');
    let girls = poolReguler.filter(s => s.jenisKelamin === 'P');

    // Distribusi Laki-laki Merata (Utamakan Reguler & Akademik)
    const availableClasses = newClasses.filter(c => c.type !== 'prestasi');
    
    const distributeToClasses = (studentsPool) => {
        // Acak / urutkan asal sekolah agar tidak bergerombol 1 sekolah di 1 kelas
        studentsPool.sort((a, b) => a.namaSekolah.localeCompare(b.namaSekolah));
        
        studentsPool.forEach(s => {
            let targetClass = availableClasses
                                .filter(c => c.students.length < c.capacity)
                                .sort((a, b) => a.students.length - b.students.length)[0];
            
            // Fallback jika semua kelas reguler/akademik penuh (masukkan ke mana saja yang muat)
            if (!targetClass) {
                 targetClass = newClasses.filter(c => c.students.length < c.capacity)[0];
            }
            
            if (targetClass) {
                targetClass.students.push(s);
            }
        });
    }

    distributeToClasses(boys);
    distributeToClasses(girls);

    // Finalisasi: Sorting abjad & Generate Tempat Duduk
    newClasses.forEach(c => {
        c.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
        c.seating = arrangeSeating(c.students);
    });

    distributedClasses = newClasses;
    activeClassIndex = 0;
    
    renderStatsPanel();
    renderClassTabs();
    renderClassContent();

    // Transisi UI
    mainStateCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    quickStats.classList.remove('hidden');
    
    showToast("Penyusunan Berhasil", "Siswa telah didistribusikan secara proporsional ke semua kelas.", "success");

    // Simpan ke Cloud secara Otomatis
    saveResultToFirestore();
}

// Logika Denah Tempat Duduk Berpasangan Berdasarkan Gender
function arrangeSeating(students) {
    const boys = students.filter(s => s.jenisKelamin === 'L');
    const girls = students.filter(s => s.jenisKelamin === 'P');
    
    let pairs = [];
    
    // Pasangkan sesama laki-laki dahulu
    while (boys.length >= 2) {
        pairs.push([boys.shift(), boys.shift()]);
    }
    
    // Pasangkan sesama perempuan
    while (girls.length >= 2) {
        pairs.push([girls.shift(), girls.shift()]);
    }
    
    // Jika ada sisa 1 laki-laki dan 1 perempuan, gabungkan jika memungkinkan
    if (boys.length === 1 && girls.length === 1) {
        pairs.push([boys.shift(), girls.shift()]);
    } else {
        // Jika hanya sisa 1 orang saja (ganjil)
        if (boys.length === 1) {
            pairs.push([boys.shift(), null]);
        }
        if (girls.length === 1) {
            pairs.push([girls.shift(), null]);
        }
    }
    
    return pairs;
}

function renderStatsPanel() {
    const total = rawStudents.length;
    const boys = rawStudents.filter(s => s.jenisKelamin === 'L').length;
    const girls = rawStudents.filter(s => s.jenisKelamin === 'P').length;
    const prestasi = rawStudents.filter(s => s.prestasi === 'Sertifikat').length;

    document.getElementById('stat-total-students').innerText = total;
    document.getElementById('stat-boys').innerText = boys;
    document.getElementById('stat-girls').innerText = girls;
    document.getElementById('stat-prestasi').innerText = prestasi;
}

function renderClassTabs() {
    classTabs.innerHTML = '';
    
    distributedClasses.forEach((c, index) => {
        const btn = document.createElement('button');
        const isActive = index === activeClassIndex;
        
        btn.className = `px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`;
        
        btn.innerHTML = `
            VII ${c.letter}
            <span class="ml-1 text-[10px] ${isActive ? 'bg-blue-500 text-blue-100' : 'bg-slate-200 text-slate-500'} px-1.5 py-0.5 rounded-full">${c.students.length}</span>
        `;
        
        btn.addEventListener('click', () => {
            activeClassIndex = index;
            renderClassTabs(); // update active state classes
            renderClassContent();
        });
        
        classTabs.appendChild(btn);
    });
}

// Toggle View Listener
if (toggleListView) {
    toggleListView.addEventListener('click', () => {
        viewMode = 'list';
        updateToggleStyle();
    });
}

if (toggleSeatingView) {
    toggleSeatingView.addEventListener('click', () => {
        viewMode = 'seating';
        updateToggleStyle();
    });
}

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

// Render Class Details
function renderClassContent() {
    const activeClass = distributedClasses[activeClassIndex];
    if (!activeClass) return;

    const currentStudents = activeClass.students || [];
    const currentSeating = activeClass.seating || [];
    
    const boysCount = currentStudents.filter(s => s.jenisKelamin === 'L').length;
    const girlsCount = currentStudents.filter(s => s.jenisKelamin === 'P').length;
    const avgScore = (currentStudents.reduce((acc, s) => acc + s.skorNilai, 0) / currentStudents.length || 0).toFixed(1);

    let html = '';

    // Header Info Kelas
    html += `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div>
                <span class="text-xs text-slate-500 block">Total Siswa</span>
                <span class="font-extrabold text-slate-800 text-base">${currentStudents.length} Siswa</span>
            </div>
            <div>
                <span class="text-xs text-slate-500 block">Komposisi Gender</span>
                <span class="font-bold text-slate-700 text-sm">${boysCount} L / ${girlsCount} P</span>
            </div>
            <div>
                <span class="text-xs text-slate-500 block">Rata-rata Nilai</span>
                <span class="font-bold text-amber-600 text-sm flex items-center gap-1">
                    <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-500"></i> ${avgScore}
                </span>
            </div>
            <div>
                <span class="text-xs text-slate-500 block">Wali Kelas</span>
                <span class="font-bold text-slate-700 text-sm truncate block" title="${activeClass.waliKelas}">${activeClass.waliKelas || '-'}</span>
            </div>
        </div>
    `;

    if (viewMode === 'list') {
        // TABLE VIEW
        let tableRows = '';
        currentStudents.forEach((s, idx) => {
            tableRows += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
                    <td class="py-3 px-4 text-center text-xs font-semibold text-slate-500 w-12">${idx + 1}</td>
                    <td class="py-3 px-4 text-xs font-mono text-slate-500 w-32">${s.nisn}</td>
                    <td class="py-3 px-4 font-bold text-sm text-slate-800">${s.namaSiswa}</td>
                    <td class="py-3 px-4 text-center w-24">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold ${s.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">
                            ${s.jenisKelamin}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600 font-medium">${s.namaSekolah}</td>
                </tr>
            `;
        });

        html += `
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr class="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                            <th class="py-3 px-4 text-center w-12">No</th>
                            <th class="py-3 px-4 w-32">NISN</th>
                            <th class="py-3 px-4">Nama Lengkap Siswa</th>
                            <th class="py-3 px-4 text-center w-24">L/P</th>
                            <th class="py-3 px-4">Asal Sekolah</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

    } else {
        // SEATING VIEW (DENAH TEMPAT DUDUK)
        html += `
            <div class="bg-slate-800 rounded-xl p-6 text-white min-h-[400px]">
                
                <div class="bg-slate-700 text-center py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest mb-6 flex justify-center items-center gap-2 border border-slate-600 shadow-inner">
                    <i data-lucide="presentation" class="w-4 h-4 text-slate-400"></i> Papan Tulis & Meja Guru (Depan Kelas)
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        `;

        currentSeating.forEach((pair, pairIdx) => {
            const studentLeft = pair[0];
            const studentRight = pair[1];

            html += `
                <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow flex flex-col justify-between">
                    <div class="text-center text-[9px] font-extrabold text-slate-500 mb-2.5 uppercase tracking-wider pb-1 border-b border-slate-700">Meja ${pairIdx + 1}</div>
                    <div class="grid grid-cols-2 gap-1.5">
                        ${studentLeft ? `
                            <div class="p-1.5 rounded-lg text-center ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-950/80 border border-blue-800 text-blue-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}">
                                <div class="w-4 h-4 rounded-full ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-extrabold mx-auto mb-1">
                                    ${studentLeft.jenisKelamin}
                                </div>
                                <div class="text-[10px] font-bold truncate tracking-tight" title="${studentLeft.namaSiswa}">${getShortName(studentLeft.namaSiswa)}</div>
                                <div class="text-[8px] opacity-75 mt-0.5 truncate">${studentLeft.namaSekolah}</div>
                            </div>
                        ` : `
                            <div class="p-1.5 rounded-lg text-center border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center min-h-[60px]">
                                <span class="text-[10px] text-slate-600 font-semibold italic">Kosong</span>
                            </div>
                        `}

                        ${studentRight ? `
                            <div class="p-1.5 rounded-lg text-center ${studentRight.jenisKelamin === 'L' ? 'bg-blue-950/80 border border-blue-800 text-blue-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}">
                                <div class="w-4 h-4 rounded-full ${studentRight.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-extrabold mx-auto mb-1">
                                    ${studentRight.jenisKelamin}
                                </div>
                                <div class="text-[10px] font-bold truncate tracking-tight" title="${studentRight.namaSiswa}">${getShortName(studentRight.namaSiswa)}</div>
                                <div class="text-[8px] opacity-75 mt-0.5 truncate">${studentRight.namaSekolah}</div>
                            </div>
                        ` : `
                            <div class="p-1.5 rounded-lg text-center border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center min-h-[60px]">
                                <span class="text-[10px] text-slate-600 font-semibold italic">Kosong</span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    dynamicContentArea.innerHTML = html;
    lucide.createIcons({ root: dynamicContentArea }); // Re-init icons inside dynamic content
}

// LOGIKA CETAK PDF 
function preparePrintArea() {
    printArea.innerHTML = '';
    
    const ta = document.getElementById('config-ta').value;
    const dateStr = document.getElementById('config-date').value;
    const kepsekName = document.getElementById('config-kepsek-name').value;
    const kepsekNip = document.getElementById('config-kepsek-nip').value;
    
    distributedClasses.forEach(c => {
        const currentStudents = c.students;
        const currentSeating = c.seating;
        const currentWaliKelas = c.waliKelas;
        const currentWaliNip = c.nip;

        // --- HALAMAN 1: DAFTAR NAMA ---
        const page1 = document.createElement('div');
        page1.className = 'print-page bg-white p-4 flex flex-col justify-between';
        
        let tableRows = '';
        currentStudents.forEach((s, idx) => {
            tableRows += `
                <tr class="border-b border-slate-300">
                    <td class="border border-slate-400 px-3 py-0.5 text-center text-[11px] font-bold">${idx + 1}</td>
                    <td class="border border-slate-400 px-3 py-0.5 text-[11px] font-mono">${s.nisn}</td>
                    <td class="border border-slate-400 px-3 py-0.5 text-[11px] font-bold truncate" title="${s.namaSiswa}">${s.namaSiswa}</td>
                    <td class="border border-slate-400 px-3 py-0.5 text-center text-[11px] font-semibold">${s.jenisKelamin}</td>
                    <td class="border border-slate-400 px-3 py-0.5 text-[11px] truncate" title="${s.namaSekolah}">${s.namaSekolah}</td>
                </tr>
            `;
        });

        page1.innerHTML = `
            <div class="text-center border-b-4 border-double border-slate-900 pb-2 mb-3">
                <div class="flex items-center justify-center gap-4">
                    <img src="https://i.ibb.co.com/LdsMJhz1/Icon-Header-WEB.png" class="w-12 h-12 object-contain logo-transparent" alt="Logo SMPN 2 Kedungbanteng">
                    <div class="text-left">
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">DAFTAR NAMA SISWA KELAS VII ${c.letter}</h2>
                        <h1 class="text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">SMP NEGERI 2 KEDUNGBANTENG</h1>
                        <p class="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">TAHUN AJARAN ${ta}</p>
                    </div>
                </div>
            </div>

            <div class="flex-grow w-full max-h-[850px] overflow-hidden">
                <table class="w-full text-left border-collapse border border-slate-400">
                    <thead class="bg-slate-200 border-b border-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            <th class="border border-slate-400 py-1.5 px-3 text-center w-10">No</th>
                            <th class="border border-slate-400 py-1.5 px-3 w-28">NISN</th>
                            <th class="border border-slate-400 py-1.5 px-3">Nama Lengkap Siswa</th>
                            <th class="border border-slate-400 py-1.5 px-3 text-center w-12">L/P</th>
                            <th class="border border-slate-400 py-1.5 px-3 w-48">Asal Sekolah Dasar</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-900 bg-white">
                        ${tableRows}
                    </tbody>
                </table>
            </div>

            <div class="flex justify-between items-end text-slate-900 w-full mt-4 pb-2 px-8">
                <div class="text-center">
                    <p class="font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Sekolah</p>
                    <div class="h-12"></div>
                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                    <p class="text-sm font-semibold text-slate-800 font-mono">${kepsekNip}</p>
                </div>
                <div class="text-center">
                    <p class="font-bold">&nbsp;</p>
                    <p class="font-bold">Wali Kelas</p>
                    <div class="h-12"></div>
                    <p class="font-extrabold underline text-sm">${currentWaliKelas}</p>
                    <p class="text-sm font-semibold text-slate-800 font-mono">${currentWaliNip}</p>
                </div>
            </div>
        `;

        // --- HALAMAN 2: DENAH TEMPAT DUDUK MEJA BERPASANGAN ---
        const page2 = document.createElement('div');
        page2.className = 'print-page bg-white p-4 flex flex-col justify-between';
        
        let seatingGridHtml = '';
        currentSeating.forEach((pair, pairIdx) => {
            const studentLeft = pair[0];
            const studentRight = pair[1];

            seatingGridHtml += `
                <div class="border border-slate-400 p-2 text-center bg-white rounded-md shadow-sm h-[125px] flex flex-col justify-between">
                    <div class="font-extrabold text-[10px] border-b border-slate-300 pb-1 mb-1 text-slate-500 uppercase">Meja ${pairIdx + 1}</div>
                    <div class="grid grid-cols-2 gap-1.5 text-[10px] items-center h-full">
                        ${studentLeft ? `
                            <div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center">
                                <div class="w-3.5 h-3.5 rounded-full ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-bold mx-auto mb-0.5">${studentLeft.jenisKelamin}</div>
                                <div class="font-extrabold text-[10px] leading-tight text-slate-900 whitespace-normal break-words line-clamp-3 px-0.5" title="${studentLeft.namaSiswa}">${studentLeft.namaSiswa}</div>
                            </div>
                        ` : `
                            <div class="p-1 rounded border border-dashed border-slate-200 text-slate-400 italic bg-slate-50 h-full flex flex-col justify-center text-[9px] font-semibold">Kosong</div>
                        `}

                        ${studentRight ? `
                            <div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center">
                                <div class="w-3.5 h-3.5 rounded-full ${studentRight.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-bold mx-auto mb-0.5">${studentRight.jenisKelamin}</div>
                                <div class="font-extrabold text-[10px] leading-tight text-slate-900 whitespace-normal break-words line-clamp-3 px-0.5" title="${studentRight.namaSiswa}">${studentRight.namaSiswa}</div>
                            </div>
                        ` : `
                            <div class="p-1 rounded border border-dashed border-slate-200 text-slate-400 italic bg-slate-50 h-full flex flex-col justify-center text-[9px] font-semibold">Kosong</div>
                        `}
                    </div>
                </div>
            `;
        });

        page2.innerHTML = `
            <div class="text-center border-b-4 border-double border-slate-900 pb-2 mb-4">
                <div class="flex items-center justify-center gap-4">
                    <img src="https://i.ibb.co.com/LdsMJhz1/Icon-Header-WEB.png" class="w-12 h-12 object-contain logo-transparent" alt="Logo SMPN 2 Kedungbanteng">
                    <div class="text-left">
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">DENAH TEMPAT DUDUK KELAS VII ${c.letter}</h2>
                        <h1 class="text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">SMP NEGERI 2 KEDUNGBANTENG</h1>
                        <p class="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">TAHUN AJARAN ${ta}</p>
                    </div>
                </div>
            </div>

            <div class="border-2 border-slate-900 bg-slate-200 text-slate-900 text-center py-2 rounded font-black text-xs uppercase tracking-widest mb-6 shadow-sm mx-10">
                Papan Tulis & Meja Guru (Depan Kelas)
            </div>

            <div class="grid grid-cols-4 gap-3 flex-grow px-2 content-start min-h-[600px]">
                ${seatingGridHtml}
            </div>

            <div class="flex justify-between items-end text-slate-900 w-full mt-4 pb-2 px-8">
                <div class="text-center">
                    <p class="font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Sekolah</p>
                    <div class="h-12"></div>
                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                    <p class="text-sm font-semibold text-slate-800 font-mono">${kepsekNip}</p>
                </div>
                <div class="text-center">
                    <p class="font-bold">${dateStr}</p>
                    <p class="font-bold">Wali Kelas</p>
                    <div class="h-12"></div>
                    <p class="font-extrabold underline text-sm">${currentWaliKelas}</p>
                    <p class="text-sm font-semibold text-slate-800 font-mono">${currentWaliNip}</p>
                </div>
            </div>
        `;

        printArea.appendChild(page1);
        printArea.appendChild(page2);
    });
}

// LOGIKA EKSPOR EXCEL (DIPERBAIKI SESUAI INSTRUKSI BARU ANDA YANG SUDAH BERHASIL)
if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
        if (distributedClasses.length === 0) { 
            showToast("Data Kosong", "Proses kelas terlebih dahulu.", "error"); 
            return; 
        }
        if (typeof XLSX === 'undefined') { 
            showToast("Gagal", "Library Excel belum dimuat.", "error"); 
            return; 
        }
        
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
            // Mengatur lebar kolom agar rapi saat dibuka di Excel
            ws['!cols'] = [
                {wch: 5},   // No
                {wch: 15},  // NISN
                {wch: 35},  // Nama
                {wch: 5},   // L/P
                {wch: 30}   // Asal Sekolah
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, `Kelas VII ${c.letter}`);
        });
        
        XLSX.writeFile(wb, `Pembagian_Kelas_Baru_${ta.replace('/','-')}.xlsx`);
        showToast("Berhasil", "Berkas Excel berhasil diunduh.", "success");
    });
}

// Template Generator List (Helper Function Template Download)
if (btnTemplate) {
    btnTemplate.addEventListener('click', () => {
        try {
            const wsData = [
                ["NO", "NISN", "NAMA LENGKAP SISWA", "L/P", "NILAI", "ASAL SEKOLAH", "PRESTASI (Opsional)"],
                [1, "1234567890", "Contoh Nama Siswa", "L", "85.5", "SDN 1 KEDUNGBANTENG", "Sertifikat"],
                [2, "1234567891", "Siti Aminah", "P", "90", "MIN 1 BANYUMAS", "Kosong"],
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template Data");
            
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = "Template_PMB_SMPN2_Kedungbanteng.xlsx";
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 200);
            
            showToast("Template Diunduh", "Gunakan template ini untuk mengisi data Anda.", "info");
        } catch (err) {
            console.error("Gagal mengunduh template:", err);
        }
    });
}

// Generate Sample Demo Data
function generateDemoData() {
    const firstNamesBoys = ["Agus", "Budi", "Candra", "Dedi", "Eko", "Fajar", "Gilang", "Heri", "Iwan", "Joko"];
    const firstNamesGirls = ["Ayu", "Bunga", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hani", "Indah", "Julia"];
    const lastNames = ["Pratama", "Saputra", "Wijaya", "Kusuma", "Setiawan", "Mahendra", "Ramadhan", "Lestari", "Putri", "Sari"];
    const schools = ["SDN 1 KEDUNGBANTENG", "SDN 2 KEDUNGBANTENG", "SDN 3 KEDUNGBANTENG", "MIN 1 BANYUMAS", "SD MUHAMMADIYAH", "MI MAARIF KEDUNGBANTENG"];
    
    let list = [];
    
    for (let i = 0; i < 240; i++) {
        const isBoy = Math.random() > 0.5;
        const firstPool = isBoy ? firstNamesBoys : firstNamesGirls;
        
        const firstName = firstPool[Math.floor(Math.random() * firstPool.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const namaSiswa = `${firstName} ${lastName}`;
        
        const score = parseFloat((65 + Math.random() * 34).toFixed(1)); 
        const school = schools[Math.floor(Math.random() * schools.length)];
        const prestasi = Math.random() < 0.15 ? "Sertifikat" : "Kosong";

        list.push({
            nisn: String(1203000000 + i),
            namaSiswa: toProperCase(namaSiswa),
            jenisKelamin: isBoy ? 'L' : 'P',
            skorNilai: score,
            namaSekolah: toProperCase(school),
            prestasi
        });
    }

    return list;
}

// Attach Demo Button
if (btnDemo) {
    btnDemo.addEventListener('click', () => {
        rawStudents = generateDemoData();
        renderStatsPanel();
        showToast("Data Simulasi Di-Generate", "Berhasil membuat 240 data siswa acak.", "success");
    });
}

// Attach Process Button
if (btnProcess) {
    btnProcess.addEventListener('click', processAndDistribute);
}

// Memulai Inisialisasi Koneksi Firebase Firestore saat Window dimuat
window.onload = function() {
    initFirebase();
    
    // Pengikat tombol cetak PDF secara eksplisit
    if (btnPrintAll) {
        btnPrintAll.addEventListener('click', () => {
            if (distributedClasses.length === 0) {
                showToast("Tidak Ada Data", "Silakan susun pembagian kelas terlebih dahulu.", "error");
                return;
            }
            preparePrintArea();
            setTimeout(() => {
                window.print();
            }, 500);
        });
    }
}
