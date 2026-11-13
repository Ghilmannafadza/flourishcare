// Template Laporan Evaluasi Perkembangan (12 sesi) — diambil apa adanya dari prototipe PM
// (index.html, konstanta EVT). BT 33, SI 40, TW 56, OT 54 indikator.
// Format indikator: [kode, indikator, acuan usia, target kelulusan (skor 4)]

export type EvalService = "BT" | "SI" | "OT" | "TW";
export type EvalAspect = { k: string; nama: string; ind: [string, string, string, string][] };
export type EvalTemplate = { judul: string; target: string; aspek: EvalAspect[]; lulus?: string };

export const EVT: Record<EvalService, EvalTemplate> = {
 "BT": {
  "judul": "TERAPI PERILAKU",
  "target": "perilaku belajar, kepatuhan, komunikasi fungsional, bermain dan sosial, regulasi diri, serta pengurangan perilaku menantang.",
  "aspek": [
   {
    "k": "A",
    "nama": "Perilaku Dasar Belajar & Atensi",
    "ind": [
     [
      "A1",
      "Merespons panggilan nama (menoleh/berorientasi ke pemanggil)",
      "1–2 th",
      "Merespons ≤3 detik pada ≥8 dari 10 panggilan, di ≥2 setting"
     ],
     [
      "A2",
      "Perhatian bersama: mengikuti arah tunjuk dan menunjuk untuk berbagi minat",
      "1–2 th",
      "Mengikuti tunjuk ≥8/10 percobaan; menunjuk untuk berbagi ≥3 kali per sesi"
     ],
     [
      "A3",
      "Imitasi gerakan tubuh (motorik kasar) dan aksi dengan objek",
      "1–3 th",
      "Meniru ≥10 gerakan/aksi baru tanpa bantuan (≥80%)"
     ],
     [
      "A4",
      "Imitasi gerakan tangan/jari dan ekspresi wajah",
      "2–3 th",
      "Meniru ≥8 gerakan tangan/jari dan ≥5 ekspresi/gerak wajah"
     ],
     [
      "A5",
      "Mencocokkan identik dan menyortir (warna/bentuk/kategori)",
      "2–3 th",
      "Mencocokkan ≥10 benda/gambar; menyortir ≥3 kategori; akurasi ≥90%"
     ],
     [
      "A6",
      "Bertahan pada tugas meja (on-task)",
      "2–6 th",
      "Bertahap: 2–3 th ≥5 menit; 4–5 th ≥10 menit; ≥6 th ≥15 menit, prompt minimal"
     ],
     [
      "A7",
      "Menyelesaikan tugas sampai selesai dan menandai selesai",
      "3–4 th",
      "Menyelesaikan rangkaian 3–5 langkah secara mandiri ≥80%"
     ]
    ]
   },
   {
    "k": "B",
    "nama": "Kepatuhan & Mengikuti Instruksi",
    "ind": [
     [
      "B1",
      "Instruksi 1 langkah familiar (duduk, ke sini, beri)",
      "1–2 th",
      "≥15 instruksi berbeda, ≥80%, tanpa gestur"
     ],
     [
      "B2",
      "Instruksi 2 langkah",
      "2–3 th",
      "≥80% pada ≥10 pasang instruksi berbeda"
     ],
     [
      "B3",
      "Instruksi 3 langkah dan instruksi kelompok",
      "4–5 th",
      "≥80%, termasuk instruksi umum ke seluruh kelas"
     ],
     [
      "B4",
      "Merespons “stop”, “tidak boleh”, dan “tunggu”",
      "1–2 th",
      "Berhenti/menunggu ≤3 detik pada ≥80%, termasuk saat tertarik pada benda favorit"
     ],
     [
      "B5",
      "Mengikuti jadwal visual dan rutinitas",
      "3–4 th",
      "Mengikuti ≥4 aktivitas berurutan hanya dengan isyarat visual"
     ],
     [
      "B6",
      "Mengikuti aturan rumah/sekolah/permainan",
      "4–5 th",
      "Mengikuti ≥3 aturan secara konsisten tanpa pengingat berulang"
     ]
    ]
   },
   {
    "k": "C",
    "nama": "Komunikasi Fungsional",
    "ind": [
     [
      "C1",
      "Meminta (mand) benda/aktivitas secara fungsional (kata, isyarat, gambar/PECS, AAC)",
      "1–2 th",
      "Spontan ≥10 item berbeda; ≥5 kali per sesi tanpa prompt"
     ],
     [
      "C2",
      "Meminta bantuan",
      "2–3 th",
      "Meminta bantuan spontan ≥80% saat mengalami kesulitan"
     ],
     [
      "C3",
      "Menolak/memprotes secara tepat (tidak mau, sudah)",
      "2–3 th",
      "Menolak secara fungsional alih-alih perilaku menantang ≥80%"
     ],
     [
      "C4",
      "Meminta istirahat/jeda",
      "3–4 th",
      "Memakai kata/kartu istirahat secara mandiri saat jenuh atau kewalahan ≥80%"
     ],
     [
      "C5",
      "Menjawab pertanyaan sosial dasar (nama, umur, kamu mau apa?)",
      "3–4 th",
      "Menjawab benar ≥80% dengan ≥2 orang berbeda"
     ]
    ]
   },
   {
    "k": "D",
    "nama": "Bermain & Interaksi Sosial",
    "ind": [
     [
      "D1",
      "Bermain mandiri secara fungsional",
      "2–3 th",
      "Bermain dengan ≥5 jenis mainan secara mandiri ≥10 menit"
     ],
     [
      "D2",
      "Bermain paralel di dekat anak lain",
      "2–3 th",
      "Bertahan ≥5 menit di dekat teman tanpa menjauh/agresi"
     ],
     [
      "D3",
      "Bergantian (turn-taking) dan berbagi",
      "3–4 th",
      "≥5 putaran bergantian dengan 1 teman; berbagi saat diminta ≥3 dari 5 kesempatan"
     ],
     [
      "D4",
      "Merespons dan memulai ajakan bermain",
      "3–4 th",
      "Merespons ≥80%; memulai ajakan spontan ≥2 kali per sesi"
     ],
     [
      "D5",
      "Bermain pura-pura/imajinatif",
      "3–4 th",
      "Menampilkan urutan ≥3 aksi pura-pura bertema (menyuapi, menidurkan boneka)"
     ],
     [
      "D6",
      "Mengenali dan merespons emosi orang lain",
      "4–5 th",
      "Menamai ≥4 emosi dasar dan merespons tepat (menghibur, menawarkan bantuan)"
     ],
     [
      "D7",
      "Bermain berkelompok dengan aturan (menang–kalah)",
      "5–6 th",
      "Bermain 3–4 anak ≥15 menit; menerima kalah tanpa tantrum"
     ]
    ]
   },
   {
    "k": "E",
    "nama": "Regulasi Diri, Transisi & Kontrol Impuls",
    "ind": [
     [
      "E1",
      "Transisi antar aktivitas (dengan peringatan/timer)",
      "2–3 th",
      "Transisi tanpa tantrum pada ≥80% kesempatan"
     ],
     [
      "E2",
      "Menerima “tidak” dan penundaan",
      "3–4 th",
      "Menerima tanpa tantrum ≥80%; menunggu 30 detik – 2 menit"
     ],
     [
      "E3",
      "Menunggu giliran dan mengantre",
      "3–4 th",
      "Menunggu ≥2 menit tanpa meninggalkan tempat atau merebut"
     ],
     [
      "E4",
      "Mengelola frustrasi dengan strategi (tarik napas, minta bantuan)",
      "4–5 th",
      "Memakai strategi mandiri pada ≥3 dari 5 kejadian frustrasi"
     ],
     [
      "E5",
      "Mengenali dan menyebutkan perasaan (skala emosi)",
      "4–5 th",
      "Menunjuk/menyebut tingkat emosi dan kebutuhannya ≥80%"
     ],
     [
      "E6",
      "Menerima perubahan rutinitas atau hal tak terduga",
      "4–5 th",
      "Menerima perubahan yang diberi peringatan ≥80% tanpa perilaku menantang"
     ],
     [
      "E7",
      "Mengendalikan impuls (tidak menyela, merebut, bertindak tanpa berpikir)",
      "4–6 th",
      "≤2 insiden impulsif per sesi selama ≥4 sesi berturut-turut"
     ],
     [
      "E8",
      "Mengelola dorongan bergerak (duduk dengan jeda gerak/fidget terjadwal)",
      "4–6 th",
      "Duduk sesuai tuntutan tugas dengan ≤1 prompt per 10 menit"
     ]
    ]
   }
  ],
  "lulus": "Lulus bila ≥80% indikator pada acuan usia perkembangan berskor 4, seluruh perilaku menantang mencapai target selama ≥8 minggu, dan keterampilan tergeneralisasi ke rumah dan sekolah."
 },
 "SI": {
  "judul": "TERAPI SENSORI MOTORIK (SENSORI INTEGRASI)",
  "target": "modulasi dan diskriminasi sensori, postur dan tonus, keseimbangan dan koordinasi, praksis, serta regulasi arousal.",
  "aspek": [
   {
    "k": "A",
    "nama": "Modulasi Sensori (Respons terhadap Input)",
    "ind": [
     [
      "A1",
      "Taktil kering: sentuhan, pakaian, label, tekstur kain",
      "Semua usia",
      "Menerima ≥5 tekstur/pakaian harian tanpa menghindar atau distres"
     ],
     [
      "A2",
      "Taktil basah/lengket/kotor (cat jari, pasir, lem, adonan)",
      "2–3 th",
      "Bermain ≥10 menit tanpa menghindar atau terus membersihkan tangan"
     ],
     [
      "A3",
      "Taktil perawatan diri (sikat gigi, keramas, potong kuku/rambut)",
      "2–4 th",
      "Menerima ≥3 aktivitas tanpa tantrum pada ≥80% kesempatan"
     ],
     [
      "A4",
      "Oral-sensori: tekstur, suhu, rasa makanan; memasukkan benda ke mulut",
      "2–4 th",
      "Menerima ≥20 makanan dari ≥4 kelompok tekstur; tidak mouthing benda non-makanan (≥3 th)"
     ],
     [
      "A5",
      "Auditori: suara keras, mendadak, keramaian",
      "2–3 th",
      "Bertahan ≥5 menit di lingkungan bising tanpa menutup telinga/menangis (boleh dengan strategi)"
     ],
     [
      "A6",
      "Visual: cahaya terang, keramaian visual, gerakan",
      "2–3 th",
      "Beraktivitas ≥10 menit di ruang terang/ramai tanpa menghindar atau kewalahan"
     ],
     [
      "A7",
      "Vestibular: gerak dan ketinggian (ayunan, perosotan)",
      "2–3 th",
      "Menikmati ≥3 jenis gerakan tanpa ketakutan berlebihan"
     ],
     [
      "A8",
      "Pencarian gerak berlebih (berputar, berlari tanpa henti, melompat terus)",
      "3–6 th",
      "Gerak terkontrol: mampu tenang dengan jeda gerak terjadwal sesuai tuntutan tugas"
     ],
     [
      "A9",
      "Proprioseptif: mencari tekanan/benturan (menabrak, menggigit, menekan)",
      "2–6 th",
      "Memenuhi kebutuhan dengan cara aman (mendorong, menarik, mengangkat, memeluk bantal) ≥80%"
     ]
    ]
   },
   {
    "k": "B",
    "nama": "Diskriminasi & Persepsi Sensori",
    "ind": [
     [
      "B1",
      "Lokalisasi sentuhan (menunjuk bagian yang disentuh, mata tertutup)",
      "3–5 th",
      "Menunjuk tepat ≥8 dari 10 percobaan"
     ],
     [
      "B2",
      "Stereognosis: mengenali benda hanya dengan meraba",
      "4–6 th",
      "Mengenali ≥5 benda umum ≥80%"
     ],
     [
      "B3",
      "Kesadaran tubuh: menunjuk/menyebut bagian tubuh; meniru pose",
      "2–5 th",
      "Menunjuk ≥12 bagian tubuh (3 th); meniru ≥8 dari 10 pose (5 th)"
     ],
     [
      "B4",
      "Regulasi tenaga (menuang, menekan krayon, menutup pintu pelan)",
      "3–5 th",
      "Menyesuaikan tenaga tanpa tumpah/merusak ≥80%"
     ],
     [
      "B5",
      "Persepsi visual-spasial dan figure–ground",
      "4–6 th",
      "Menemukan objek di antara tumpukan dan menempatkan benda sesuai posisi spasial ≥80%"
     ],
     [
      "B6",
      "Diskriminasi auditori (bunyi lingkungan, ritme, arah suara)",
      "3–5 th",
      "Membedakan ≥5 bunyi lingkungan dan menirukan ritme 3–4 ketukan"
     ]
    ]
   },
   {
    "k": "C",
    "nama": "Postur, Tonus & Kekuatan Inti",
    "ind": [
     [
      "C1",
      "Duduk tegak mandiri di kursi/lantai tanpa bersandar",
      "3–6 th",
      "≥10 menit (3–4 th); ≥15 menit (5–6 th), tanpa merosot"
     ],
     [
      "C2",
      "Pola ekstensi (prone extension)",
      "3–6 th",
      "Bertahan ≥10 detik (3–4 th); ≥20 detik (5–6 th)"
     ],
     [
      "C3",
      "Pola fleksi (supine flexion)",
      "3–6 th",
      "Bertahan ≥10 detik (3–4 th); ≥20 detik (5–6 th)"
     ],
     [
      "C4",
      "Stabilitas bahu dan pinggul (merangkak, bear walk, push-up dinding)",
      "3–6 th",
      "Mempertahankan posisi/berjalan 5 langkah tanpa runtuh ≥80%"
     ],
     [
      "C5",
      "Daya tahan aktivitas fisik",
      "3–6 th",
      "Aktif bermain ≥15–20 menit tanpa mudah lelah atau banyak bersandar"
     ],
     [
      "C6",
      "Pola berjalan dan stabilitas sendi (lutut, tungkai, pergelangan kaki)",
      "2–6 th",
      "Berdiri/berjalan ≥10 menit tanpa tanda nyeri atau jatuh berulang; rujuk fisioterapi bila ada temuan"
     ]
    ]
   },
   {
    "k": "D",
    "nama": "Keseimbangan & Koordinasi",
    "ind": [
     [
      "D1",
      "Keseimbangan statis: berdiri satu kaki",
      "3–6 th",
      "3 detik (3 th); 5 detik (4 th); 8–10 detik (5–6 th)"
     ],
     [
      "D2",
      "Keseimbangan dinamis: berjalan di garis/balok, berjinjit",
      "3–6 th",
      "Berjalan 3 m di garis/balok tanpa turun"
     ],
     [
      "D3",
      "Melompat dua kaki → satu kaki → lompat tali",
      "2–6 th",
      "Dua kaki ke depan (2–3 th); satu kaki ≥3–5 kali (4–5 th); lompat tali/skipping (6 th)"
     ],
     [
      "D4",
      "Koordinasi bilateral (jumping jack, merangkak silang, pola tepuk)",
      "4–6 th",
      "Melakukan pola 4–6 gerakan berurutan ≥80%"
     ],
     [
      "D5",
      "Menyilang garis tengah tubuh",
      "3–5 th",
      "Menyilang pada ≥5 aktivitas tanpa berganti tangan di tengah"
     ],
     [
      "D6",
      "Dominansi tangan/lateralisasi",
      "4–6 th",
      "Preferensi tangan konsisten ≥90% tugas"
     ],
     [
      "D7",
      "Koordinasi mata–tangan/kaki (melempar, menangkap, menendang bola)",
      "3–6 th",
      "Melempar ke sasaran 1,5 m ≥3/5; menangkap bola besar dari 2 m ≥3/5; menendang bola ke sasaran"
     ]
    ]
   },
   {
    "k": "E",
    "nama": "Praksis & Motorik Kasar",
    "ind": [
     [
      "E1",
      "Ideasi: mengusulkan cara bermain pada alat",
      "4–6 th",
      "Mengusulkan ≥2 ide berbeda tanpa contoh"
     ],
     [
      "E2",
      "Perencanaan dan urutan motorik (sirkuit rintangan)",
      "3–6 th",
      "3 pos (3 th) hingga 5–6 pos (5–6 th) berurutan tanpa demonstrasi ulang"
     ],
     [
      "E3",
      "Naik-turun tangga bergantian kaki",
      "3–4 th",
      "Naik-turun tanpa pegangan dengan kaki bergantian"
     ],
     [
      "E4",
      "Memanjat (tangga, jungle gym, panjat rendah)",
      "3–5 th",
      "Memanjat dengan pola empat titik dan aman ≥80%"
     ],
     [
      "E5",
      "Berlari, mengubah arah, dan berhenti mendadak",
      "3–5 th",
      "Berhenti/berbelok sesuai aba-aba tanpa menabrak ≥80%"
     ],
     [
      "E6",
      "Bersepeda roda tiga/dua atau skuter",
      "3–6 th",
      "Roda tiga ≥3 m (3 th); roda dua/skuter seimbang (5–6 th)"
     ],
     [
      "E7",
      "Mengikuti gerak berirama/senam",
      "3–5 th",
      "Mengikuti ≥8 hitungan gerak ritmis ≥80%"
     ]
    ]
   },
   {
    "k": "F",
    "nama": "Regulasi Arousal & Adaptasi Sensori",
    "ind": [
     [
      "F1",
      "Tingkat siaga (arousal) sesuai tuntutan tugas",
      "2–6 th",
      "Tenang-fokus ≥80% durasi sesi; tidak lesu atau hiperaktif berlebihan"
     ],
     [
      "F2",
      "Pulih dari overstimulasi dengan strategi sensori",
      "3–6 th",
      "Pulih ≤10 menit dengan strategi (ruang tenang, tekanan dalam, ear defender) ≥80%"
     ],
     [
      "F3",
      "Mengenali dan menyampaikan kebutuhan sensori",
      "4–6 th",
      "Menyebut/menunjuk kebutuhan (mis. istirahat, ear muff) ≥3 kali per minggu"
     ],
     [
      "F4",
      "Menjalankan sensory diet di rumah/sekolah",
      "4–6 th",
      "Menjalankan jadwal sensory diet ≥5 hari per minggu dengan pengingat minimal"
     ],
     [
      "F5",
      "Toleransi lingkungan baru (kelas, mal, acara ramai)",
      "3–6 th",
      "Beraktivitas ≥20 menit di lingkungan baru dengan strategi minimal"
     ]
    ]
   }
  ],
  "lulus": "Lulus bila ≥80% indikator pada acuan usia perkembangan berskor ≥3 (dan indikator inti berskor 4), tidak ada respons sensori yang mengganggu partisipasi di rumah/sekolah/komunitas, serta anak dan keluarga memiliki strategi sensori yang dijalankan mandiri."
 },
 "TW": {
  "judul": "TERAPI WICARA",
  "target": "bahasa (reseptif, ekspresif, pragmatik), artikulasi, oral motor, makan dan menelan, suara dan kelancaran, serta pendengaran.",
  "aspek": [
   {
    "k": "A",
    "nama": "Pra-linguistik & Komunikasi Awal",
    "ind": [
     [
      "A1",
      "Vokalisasi bertujuan dan babbling (ba-ba, ma-ma, da-da)",
      "0–1 th",
      "≥5 kombinasi konsonan–vokal berulang untuk menarik perhatian"
     ],
     [
      "A2",
      "Imitasi bunyi dan suku kata",
      "1–2 th",
      "Meniru ≥10 bunyi/suku kata baru ≥80%"
     ],
     [
      "A3",
      "Gestur komunikatif (melambai, menunjuk, menggeleng, meminta)",
      "1–2 th",
      "≥8 gestur fungsional spontan"
     ],
     [
      "A4",
      "Perhatian bersama dan menunjuk untuk berbagi",
      "1–2 th",
      "≥3 kali per sesi tanpa prompt"
     ],
     [
      "A5",
      "Giliran vokal (bolak-balik bunyi)",
      "1–2 th",
      "≥3 giliran berturut-turut"
     ]
    ]
   },
   {
    "k": "B",
    "nama": "Bahasa Reseptif (Target Pemahaman)",
    "ind": [
     [
      "B1",
      "Kosakata benda familiar (tunjuk gambar/objek)",
      "1–2 th",
      "≥50 kata benda, ≥80%"
     ],
     [
      "B2",
      "Kosakata kata kerja (aksi)",
      "2–3 th",
      "≥30 kata kerja, ≥80%"
     ],
     [
      "B3",
      "Kata sifat dan konsep dasar (besar–kecil, panas–dingin, banyak–sedikit, warna)",
      "3–4 th",
      "≥15 konsep, ≥80%"
     ],
     [
      "B4",
      "Kata depan/posisi (di dalam, di atas, di bawah, di samping, di depan, di belakang)",
      "3–4 th",
      "≥6 kata depan, ≥80%"
     ],
     [
      "B5",
      "Instruksi 1–2 langkah tanpa isyarat",
      "2–3 th",
      "≥80% pada 10 instruksi, tanpa gestur"
     ],
     [
      "B6",
      "Instruksi 3 langkah dan instruksi kompleks (sebelum/sesudah)",
      "4–5 th",
      "≥80% pada 10 instruksi"
     ],
     [
      "B7",
      "Pertanyaan apa, siapa, di mana",
      "2–3 th",
      "Menjawab/menunjuk benar ≥80%"
     ],
     [
      "B8",
      "Pertanyaan kapan, mengapa, bagaimana",
      "4–5 th",
      "Menjawab relevan ≥80%"
     ],
     [
      "B9",
      "Cerita pendek dan hubungan kata (kategori, lawan kata, fungsi benda)",
      "4–6 th",
      "Menjawab ≥3 dari 4 pertanyaan cerita 3–5 kalimat; memahami ≥5 kategori"
     ]
    ]
   },
   {
    "k": "C",
    "nama": "Bahasa Ekspresif (Target Bahasa)",
    "ind": [
     [
      "C1",
      "Kosakata ekspresif (bicara/isyarat/gambar)",
      "1–3 th",
      "≥50 kata (2 th); ≥200 kata (3 th), mencakup benda, kerja, sifat"
     ],
     [
      "C2",
      "Kombinasi dua kata (mau minum, ibu pergi)",
      "2–3 th",
      "≥10 kombinasi berbeda secara spontan"
     ],
     [
      "C3",
      "Kalimat 3–4 kata (S–P–O)",
      "3–4 th",
      "≥80% ujaran dalam percakapan berupa kalimat 3–4 kata"
     ],
     [
      "C4",
      "Kalimat lengkap dan kompleks (dan, karena, kalau, tetapi)",
      "4–6 th",
      "Kalimat ≥5 kata dengan konjungsi dalam percakapan spontan"
     ],
     [
      "C5",
      "Imbuhan dan morfologi bahasa Indonesia (me-, di-, ber-, -kan, -an; reduplikasi)",
      "4–6 th",
      "Benar ≥80% pada ≥4 jenis imbuhan dalam kalimat spontan"
     ],
     [
      "C6",
      "Menjawab pertanyaan (apa, siapa, di mana, kapan, mengapa)",
      "3–5 th",
      "Menjawab sesuai ≥80%"
     ],
     [
      "C7",
      "Mengajukan pertanyaan",
      "3–5 th",
      "Bertanya ≥5 kali per sesi (apa, mana, kenapa)"
     ],
     [
      "C8",
      "Kata ganti dan kepemilikan (aku, kamu, dia, kami; punyaku)",
      "3–4 th",
      "Benar ≥80% dalam ujaran spontan"
     ],
     [
      "C9",
      "Bercerita dan menceritakan ulang (naratif)",
      "4–6 th",
      "Menceritakan 3–5 kejadian berurutan dengan awal–tengah–akhir"
     ]
    ]
   },
   {
    "k": "D",
    "nama": "Pragmatik & Komunikasi Sosial",
    "ind": [
     [
      "D1",
      "Menyapa, berpamitan, berterima kasih, meminta maaf",
      "2–4 th",
      "Spontan ≥80% pada situasi yang relevan"
     ],
     [
      "D2",
      "Giliran bicara dalam percakapan",
      "3–5 th",
      "≥3 giliran dengan topik yang sama"
     ],
     [
      "D3",
      "Memulai dan mempertahankan topik",
      "4–6 th",
      "Mempertahankan topik ≥5 giliran"
     ],
     [
      "D4",
      "Menyesuaikan volume, nada, dan sopan santun sesuai lawan bicara",
      "4–6 th",
      "Menyesuaikan ≥80% pada konteks berbeda"
     ],
     [
      "D5",
      "Meminta klarifikasi dan memperbaiki pesan (apa?, maksudnya?)",
      "4–5 th",
      "Melakukan perbaikan saat tidak dipahami ≥80%"
     ],
     [
      "D6",
      "Memahami bahasa tubuh, ekspresi wajah, dan intonasi",
      "3–5 th",
      "Menafsirkan ≥5 ekspresi/nada dengan benar"
     ],
     [
      "D7",
      "Komunikasi alternatif/augmentatif (isyarat, PECS, AAC) bila bicara belum fungsional",
      "Semua usia",
      "≥10 pesan fungsional berbeda secara mandiri di ≥2 setting"
     ]
    ]
   },
   {
    "k": "E",
    "nama": "Artikulasi & Fonologi (acuan klinis umum)",
    "ind": [
     [
      "E1",
      "Vokal (a, i, u, e, o)",
      "1–2 th",
      "Diproduksi benar ≥90%"
     ],
     [
      "E2",
      "Konsonan bilabial dan w (p, b, m, w)",
      "2–3 th",
      "Benar ≥90% pada posisi awal dan tengah kata"
     ],
     [
      "E3",
      "Konsonan alveolar dan velar (t, d, n, k, g, ng)",
      "3–4 th",
      "Benar ≥90% pada posisi awal dan tengah kata"
     ],
     [
      "E4",
      "Konsonan frikatif, lateral, palatal (s, l, h, j, c, ny)",
      "4–5 th",
      "Benar ≥90% di semua posisi"
     ],
     [
      "E5",
      "Fonem /r/ dan gugus konsonan (str-, pl-, kr-)",
      "5–7 th",
      "Benar ≥90% dalam kata dan kalimat"
     ],
     [
      "E6",
      "Proses fonologis (penghilangan suku kata, penggantian, penyederhanaan)",
      "2–5 th",
      "Proses yang tidak sesuai usia ≤10%"
     ],
     [
      "E7",
      "Intelligibilitas (kejelasan bicara)",
      "2–5 th",
      "Dimengerti orang asing ≥50% (2 th); ≥75% (3 th); ≥90% (4–5 th)"
     ]
    ]
   },
   {
    "k": "F",
    "nama": "Oral Motorik & Fungsi Oral (Target Oral)",
    "ind": [
     [
      "F1",
      "Bibir tertutup saat istirahat dan menelan",
      "2–6 th",
      "Bibir rapat ≥80% pengamatan pada aktivitas tenang"
     ],
     [
      "F2",
      "Kontrol air liur (drooling)",
      "2–4 th",
      "Tidak ada air liur menetes saat aktivitas biasa ≥80% pengamatan (≥4 th)"
     ],
     [
      "F3",
      "Gerak bibir (menyatukan, mencucu, tersenyum, meniup ciuman)",
      "2–5 th",
      "Meniru ≥5 gerakan bibir terpisah dari rahang"
     ],
     [
      "F4",
      "Gerak lidah (menjulur, mengangkat, kiri– kanan, menjilat bibir)",
      "3–5 th",
      "Meniru ≥5 gerakan lidah terpisah dari rahang"
     ],
     [
      "F5",
      "Gerak rahang (membuka–menutup terkontrol, stabil)",
      "3–5 th",
      "Membuka–menutup terkontrol; rahang stabil saat lidah/bibir bergerak"
     ],
     [
      "F6",
      "Meniup (gelembung, peluit, balon) dan menyedot (sedotan)",
      "2–4 th",
      "Meniup ≥5 detik terkontrol; menyedot dengan sedotan tanpa bocor"
     ],
     [
      "F7",
      "Imitasi urutan gerak oral",
      "4–5 th",
      "Meniru urutan 2–3 gerakan oral ≥80%"
     ]
    ]
   },
   {
    "k": "G",
    "nama": "Makan & Menelan (Feeding)",
    "ind": [
     [
      "G1",
      "Menggigit dan mengunyah (rotary) makanan padat",
      "2–4 th",
      "Mengunyah ≥3 jenis makanan padat tanpa tersedak atau menyimpan di pipi"
     ],
     [
      "G2",
      "Minum dari gelas terbuka",
      "2–3 th",
      "Tanpa tumpah banyak dan tanpa tersedak ≥80%"
     ],
     [
      "G3",
      "Transisi tekstur (puree → lunak → padat → campuran)",
      "1–4 th",
      "Menerima ≥4 tekstur sesuai usia"
     ],
     [
      "G4",
      "Menelan aman (tanpa batuk/tersedak berulang atau suara basah)",
      "Semua usia",
      "Tidak ada tanda aspirasi ≥90% waktu makan; bila ada, rujuk dokter/pemeriksaan menelan"
     ],
     [
      "G5",
      "Variasi makanan dan durasi makan",
      "2–6 th",
      "Makan ≥20 jenis makanan; durasi makan ≤30–40 menit"
     ]
    ]
   },
   {
    "k": "H",
    "nama": "Suara & Kelancaran",
    "ind": [
     [
      "H1",
      "Kualitas suara dan resonansi (tidak serak kronis, tidak hipernasal)",
      "3–6 th",
      "Suara jernih tanpa serak/nasalitas bermakna; bila ada, rujuk THT"
     ],
     [
      "H2",
      "Volume, intonasi, dan prosodi",
      "3–6 th",
      "Menyesuaikan volume dan intonasi sesuai konteks ≥80%"
     ],
     [
      "H3",
      "Kelancaran bicara",
      "3–6 th",
      "Disfluensi ≤3% suku kata tanpa ketegangan/perilaku sekunder"
     ]
    ]
   },
   {
    "k": "I",
    "nama": "Pendengaran & Pemrosesan Auditori",
    "ind": [
     [
      "I1",
      "Skrining pendengaran terkini (audiometri/OAE/BERA, timpanometri)",
      "Semua usia",
      "Hasil ≤12 bulan terakhir terdokumentasi (☐ normal ☐ ada gangguan: ......)"
     ],
     [
      "I2",
      "Merespons suara dan lokalisasi arah bunyi",
      "0–2 th",
      "Menoleh ke sumber suara ≥8 dari 10 percobaan"
     ],
     [
      "I3",
      "Diskriminasi bunyi (lingkungan, ritme, bunyi huruf)",
      "3–5 th",
      "Membedakan pasangan bunyi ≥80%"
     ],
     [
      "I4",
      "Memori auditori (mengulang kata/angka/kalimat)",
      "3–6 th",
      "Mengulang 3 kata (3 th) hingga kalimat 5–6 kata atau 4 angka (5–6 th)"
     ]
    ]
   }
  ],
  "lulus": "Lulus bila bahasa reseptif dan ekspresif, artikulasi, serta fungsi oral berada pada rentang usia kronologis (atau selisih ≤6 bulan), intelligibilitas ≥90% dengan orang asing, dan komunikasi fungsional tampak di semua setting. Untuk anak dengan hambatan menetap, program dapat diakhiri ketika capaian stabil dan keluarga mampu menjalankan program rumah."
 },
 "OT": {
  "judul": "TERAPI OKUPASI",
  "target": "kemandirian (ADL), motorik halus, pra-menulis dan visual motor, kesiapan sekolah, serta bermain dan partisipasi.",
  "aspek": [
   {
    "k": "A",
    "nama": "Kemandirian / Aktivitas Sehari-hari (ADL)",
    "ind": [
     [
      "A1",
      "Makan: makan sendiri dengan jari/sendok",
      "1–3 th",
      "Menghabiskan ≥½ porsi secara mandiri dengan sendok, tumpah minimal"
     ],
     [
      "A2",
      "Makan: memakai garpu, mengoles, memotong makanan lunak",
      "4–6 th",
      "Memakai sendok-garpu benar; memotong makanan lunak dengan pisau makan (6 th)"
     ],
     [
      "A3",
      "Minum dan menuang: gelas/botol sendiri, menuang air",
      "2–5 th",
      "Minum dari gelas terbuka tanpa tumpah; menuang air dari teko kecil ≥80%"
     ],
     [
      "A4",
      "Membuka kemasan, bekal, dan botol minum",
      "4–6 th",
      "Membuka ≥3 jenis kemasan/tutup secara mandiri"
     ],
     [
      "A5",
      "Berpakaian: melepas baju, celana, kaus kaki, sepatu",
      "2–3 th",
      "Melepas mandiri ≥80% (boleh dibantu pada bagian sulit)"
     ],
     [
      "A6",
      "Berpakaian: memakai baju, celana, kaus kaki, sepatu dengan arah benar",
      "3–4 th",
      "Memakai lengkap secara mandiri dalam ≤10 menit"
     ],
     [
      "A7",
      "Mengancing (besar → kecil) dan menarik resleting",
      "4–5 th",
      "Mengancing 3–4 kancing dan memasang resleting secara mandiri"
     ],
     [
      "A8",
      "Mengikat tali sepatu/simpul",
      "6–7 th",
      "Mengikat tali sepatu mandiri ≥80%"
     ],
     [
      "A9",
      "Toilet training: BAK/BAB di toilet dan memberi tanda",
      "2–4 th",
      "Kering siang hari ≥90% dan memberi tanda/ke toilet sendiri"
     ],
     [
      "A10",
      "Toilet mandiri: membuka-memakai pakaian, membersihkan diri, menyiram",
      "4–6 th",
      "Seluruh urutan mandiri tanpa pengawasan langsung"
     ],
     [
      "A11",
      "Mencuci tangan (6 langkah)",
      "3–5 th",
      "Seluruh langkah mandiri ≥80% (sebelum makan dan setelah toilet)"
     ],
     [
      "A12",
      "Menggosok gigi",
      "3–6 th",
      "Menggosok semua permukaan ≥2 menit dengan pengawasan minimal"
     ],
     [
      "A13",
      "Mandi: menyabun, membilas, mengeringkan badan",
      "4–6 th",
      "Mandi mandiri dengan pengawasan minimal"
     ],
     [
      "A14",
      "Merapikan diri (menyisir, mengelap hidung/wajah)",
      "4–6 th",
      "Dilakukan mandiri ≥80% kesempatan"
     ],
     [
      "A15",
      "Merapikan mainan/perlengkapan setelah bermain",
      "2–4 th",
      "Membereskan ≥80% setelah 1 kali instruksi"
     ],
     [
      "A16",
      "Rutinitas pagi/malam 3–5 langkah dengan jadwal visual",
      "4–6 th",
      "Menyelesaikan rutinitas hanya dengan isyarat visual"
     ],
     [
      "A17",
      "Tugas rumah sederhana dan keselamatan dasar (benda panas, menyeberang, orang asing)",
      "4–6 th",
      "Mengerjakan ≥3 tugas rumah; menyebut/menunjukkan ≥3 aturan keselamatan"
     ]
    ]
   },
   {
    "k": "B",
    "nama": "Motorik Halus & Koordinasi Tangan–Mata",
    "ind": [
     [
      "B1",
      "Menggenggam, melepaskan, dan memindahkan benda terkontrol",
      "1–2 th",
      "Memindahkan benda antar-wadah tanpa jatuh ≥80%"
     ],
     [
      "B2",
      "Pencapitan (pinch) jempol–telunjuk dan mengambil benda kecil",
      "1–2 th",
      "Mengambil ≥10 benda kecil dalam 1 menit tanpa menjatuhkan"
     ],
     [
      "B3",
      "Menyusun balok/menara",
      "2–5 th",
      "4 balok (2 th); 6 balok (3 th); 9–10 balok (4– 5 th)"
     ],
     [
      "B4",
      "Memasukkan manik/mengulir tali",
      "3–5 th",
      "Mengulir ≥10 manik besar–sedang berurutan (dengan pola pada 5 th)"
     ],
     [
      "B5",
      "Memutar tutup, membuka-mengunci, menekan tombol",
      "2–4 th",
      "Membuka/menutup ≥3 jenis tutup atau kunci mainan"
     ],
     [
      "B6",
      "Manipulasi dalam tangan (translasi, rotasi, shift)",
      "4–6 th",
      "Menyimpan 5 koin di telapak lalu mengeluarkan satu per satu tanpa bantuan tangan lain"
     ],
     [
      "B7",
      "Meremas dan membentuk adonan (playdough)",
      "3–5 th",
      "Menggulung, membentuk bola/ular, dan menekan cetakan ≥80%"
     ],
     [
      "B8",
      "Menggunting (snip → garis lurus → lingkaran → bentuk)",
      "2–6 th",
      "Snip (2–3 th); garis lurus 15 cm (3–4 th); lingkaran (4–5 th); bentuk kompleks (5–6 th)"
     ],
     [
      "B9",
      "Melipat kertas",
      "3–5 th",
      "Melipat dua (3 th); menjadi segitiga/persegi (4–5 th)"
     ],
     [
      "B10",
      "Puzzle dan konstruksi (lego)",
      "3–6 th",
      "Puzzle 6–12 keping; membangun dari contoh ≥80%"
     ],
     [
      "B11",
      "Kekuatan dan daya tahan tangan (memeras spons, menjepit)",
      "3–6 th",
      "Memeras spons/menjepit ≥10 kali tanpa lelah"
     ],
     [
      "B12",
      "Koordinasi dua tangan (satu menahan, satu bekerja)",
      "3–5 th",
      "Menahan kertas sambil menggunting/menulis ≥80%"
     ]
    ]
   },
   {
    "k": "C",
    "nama": "Pra-Menulis & Visual Motor",
    "ind": [
     [
      "C1",
      "Pegangan alat tulis (palmar → digital → tripod dinamis)",
      "2–6 th",
      "Tripod dinamis/fungsional ≥80% dengan tekanan stabil (5–6 th)"
     ],
     [
      "C2",
      "Mencoret, garis vertikal dan horizontal",
      "2–3 th",
      "Meniru ≥80% garis dengan arah benar"
     ],
     [
      "C3",
      "Meniru bentuk: lingkaran, silang (+), persegi, segitiga, belah ketupat",
      "3–7 th",
      "Lingkaran (3 th); + (4 th); persegi (4–5 th); segitiga (5 th); belah ketupat (6–7 th)"
     ],
     [
      "C4",
      "Mewarnai dalam batas",
      "4–6 th",
      "Mewarnai dengan ≤¼ keluar batas pada gambar sederhana"
     ],
     [
      "C5",
      "Menyalin huruf/angka dan menulis nama sendiri",
      "4–7 th",
      "Menulis nama sendiri terbaca (5 th); menyalin huruf dan angka 1–10 benar (6–7 th)"
     ],
     [
      "C6",
      "Menelusuri garis, labirin, menghubungkan titik",
      "4–6 th",
      "Menelusuri tanpa keluar jalur ≥80%"
     ],
     [
      "C7",
      "Persepsi visual (konstansi bentuk, closure, posisi spasial)",
      "4–6 th",
      "Menjawab benar ≥80% pada tugas pencocokan/penyelesaian bentuk"
     ],
     [
      "C8",
      "Pelacakan visual dan fiksasi tanpa memutar kepala",
      "3–5 th",
      "Mengikuti objek bergerak horizontal/vertikal/diagonal secara mulus ≥80%"
     ],
     [
      "C9",
      "Menggambar orang",
      "3–6 th",
      "≥4 bagian (3–4 th); ≥8 bagian (5–6 th)"
     ]
    ]
   },
   {
    "k": "D",
    "nama": "Kesiapan Sekolah",
    "ind": [
     [
      "D1",
      "Berpisah dari orang tua/pengasuh di sekolah",
      "3–6 th",
      "Berpisah tanpa distres berkepanjangan (≤5 menit) pada ≥80% hari"
     ],
     [
      "D2",
      "Duduk dan bertahan pada tugas meja",
      "4–6 th",
      "≥10 menit (4 th); ≥15–20 menit (5–6 th)"
     ],
     [
      "D3",
      "Mengikuti rutinitas kelas (lingkaran pagi, transisi, istirahat)",
      "4–6 th",
      "Mengikuti jadwal kelas dengan prompt minimal ≥80% hari"
     ],
     [
      "D4",
      "Mengikuti instruksi kelompok, mengantre, dan menunggu giliran",
      "4–6 th",
      "Merespons instruksi umum ≥80%; mengantre ≥3 menit"
     ],
     [
      "D5",
      "Menyelesaikan tugas mandiri 10–15 menit",
      "5–6 th",
      "Menyelesaikan tugas sesuai instruksi tanpa pengingat berulang"
     ],
     [
      "D6",
      "Mengelola perlengkapan sekolah (tas, bekal, botol, alat tulis)",
      "5–7 th",
      "Menyiapkan, membawa, dan merapikan ≥80% secara mandiri"
     ],
     [
      "D7",
      "Mengenali dan menjaga barang milik sendiri",
      "4–6 th",
      "Mengenali nama/tanda barang dan menyimpannya di tempat yang benar"
     ],
     [
      "D8",
      "Meminta izin/bantuan guru dan ke toilet sendiri",
      "4–6 th",
      "Menyampaikan kebutuhan kepada guru secara fungsional ≥80%"
     ],
     [
      "D9",
      "Bekerja dan bermain bersama teman sebaya",
      "4–6 th",
      "Bekerja dalam kelompok 3–4 anak ≥10 menit tanpa konflik berkepanjangan"
     ],
     [
      "D10",
      "Pra-akademik dasar (menghitung 1–10, mengenal huruf/angka, warna, bentuk, pola)",
      "4–6 th",
      "Menghitung 10 benda (satu-satu); mengenali ≥10 huruf/angka; meneruskan pola AB/ABC"
     ],
     [
      "D11",
      "Postur dan regulasi sensori di kelas (duduk di lantai, kebisingan)",
      "4–6 th",
      "Mengikuti kegiatan kelas ≥20 menit dengan strategi sensori minimal"
     ],
     [
      "D12",
      "Fungsi eksekutif dasar (inisiasi, urutan 3–5 langkah, organisasi tugas)",
      "4–6 th",
      "Memulai dan menyelesaikan tugas 3–5 langkah hanya dengan isyarat visual"
     ]
    ]
   },
   {
    "k": "E",
    "nama": "Bermain & Partisipasi",
    "ind": [
     [
      "E1",
      "Bermain eksploratif dan fungsional",
      "1–2 th",
      "Mengeksplorasi dan memakai ≥10 mainan sesuai fungsinya"
     ],
     [
      "E2",
      "Bermain konstruktif dan simbolik",
      "3–4 th",
      "Membangun/bermain pura-pura bertema ≥10 menit secara mandiri"
     ],
     [
      "E3",
      "Bermain berkelompok dengan aturan",
      "5–6 th",
      "Mengikuti aturan, giliran, dan menerima kalah"
     ],
     [
      "E4",
      "Partisipasi di komunitas (restoran, belanja, tempat ibadah)",
      "4–6 th",
      "Berpartisipasi ≥30 menit dengan perilaku sesuai konteks"
     ]
    ]
   }
  ],
  "lulus": "Lulus bila ≥80% indikator ADL, motorik halus, dan pra-menulis sesuai usia berstatus Lulus, serta ≥80% indikator Kesiapan Sekolah (aspek D) tercapai dengan dukungan minimal di lingkungan sekolah."
 }
} as Record<EvalService, EvalTemplate>;
