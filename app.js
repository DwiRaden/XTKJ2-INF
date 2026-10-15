
/* ======================================
   KELAS KITA — APP.JS
   ====================================== */

const SUPABASE_URL = "https://radxvffcqhjceyhedgfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_W9haCcO2DfYrZGeLyO5CHw_0sUpWDyG";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const KATEGORI = [
  "tugas",
  "seragam",
  "jadwal",
  "piket",
  "report_taruna"
];

const NAMA = {
  tugas: "Tugas",
  seragam: "Seragam",
  jadwal: "Jadwal & Kegiatan",
  piket: "Piket",
  report_taruna: "Laporan Taruna"
};

const LIST_ID = {
  tugas: "tugas-list",
  seragam: "seragam-list",
  jadwal: "jadwal-list",
  piket: "piket-list",
  report_taruna: "report_taruna-list"
};

const $ = (id) => document.getElementById(id);

let currentUser = null;
let izinKategori = [];
let semuaData = [];

function status(teks) {
  $("status-message").textContent = teks;
}

function elemen(tag, className, teks) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (teks !== undefined) node.textContent = teks;
  return node;
}

function formatTanggal(tanggal) {
  if (!tanggal) return "Tanggal belum ditentukan";

  const [y, m, d] = tanggal.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(y, m - 1, d));
}

function detailJadwal(isi = "") {
  const hasil = { tiba: "", mulai: "", catatan: "" };

  for (const baris of isi.split("\n")) {
    const match = baris.match(
      /^\s*(jam wajib tiba|wajib tiba|tiba|jam kegiatan|jam mulai|mulai|catatan)\s*:\s*(.*)$/i
    );

    if (!match) continue;

    const kunci = match[1].toLowerCase();
    const nilai = match[2].trim();

    if (["jam wajib tiba", "wajib tiba", "tiba"].includes(kunci)) {
      hasil.tiba = nilai;
    } else if (["jam kegiatan", "jam mulai", "mulai"].includes(kunci)) {
      hasil.mulai = nilai;
    } else {
      hasil.catatan = nilai;
    }
  }

  if (!hasil.tiba && !hasil.mulai && !hasil.catatan) {
    hasil.catatan = isi.trim();
  }

  return hasil;
}

function kosong(container, teks) {
  container.replaceChildren(elemen("p", "empty-state", teks));
}

function isiPilihanKategori() {
  const select = $("info-category");
  select.replaceChildren();

  for (const kategori of izinKategori) {
    const option = document.createElement("option");
    option.value = kategori;
    option.textContent = NAMA[kategori];
    select.append(option);
  }
}

function resetForm() {
  $("info-form").reset();
  $("info-id").value = "";
  $("save-button").textContent = "Simpan informasi";
  $("cancel-edit").hidden = true;

  if (izinKategori.length) {
    $("info-category").value = izinKategori[0];
  }
}

function mulaiEdit(item) {
  if (!izinKategori.includes(item.kategori)) {
    status("Akun ini tidak memiliki izin untuk mengedit kategori tersebut.");
    return;
  }

  $("info-id").value = item.id;
  $("info-category").value = item.kategori;
  $("info-title").value = item.judul;
  $("info-date").value = item.tanggal || "";
  $("info-content").value = item.isi || "";
  $("save-button").textContent = "Simpan perubahan";
  $("cancel-edit").hidden = false;

  $("management-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function hapusItem(item) {
  if (!izinKategori.includes(item.kategori)) {
    status("Akun ini tidak memiliki izin menghapus kategori tersebut.");
    return;
  }

  if (!confirm(`Hapus "${item.judul}"?`)) return;

  status("Menghapus informasi...");

  const { error } = await supabaseClient
    .from("kelas_info")
    .delete()
    .eq("id", item.id);

  if (error) {
    console.error(error);
    status("Gagal menghapus. Periksa izin akun dan koneksi.");
    return;
  }

  status("Informasi berhasil dihapus.");
  await muatData();
}

function kartuInformasi(item) {
  const kartu = elemen("article", "data-item");

  kartu.append(elemen("h3", "", item.judul || "Tanpa judul"));

  if (item.kategori === "jadwal") {
    const detail = detailJadwal(item.isi || "");

    kartu.append(elemen("p", "data-date", formatTanggal(item.tanggal)));

    if (detail.tiba) {
      kartu.append(elemen("p", "data-detail", `Wajib tiba: ${detail.tiba}`));
    }

    if (detail.mulai) {
      kartu.append(elemen("p", "data-detail", `Kegiatan mulai: ${detail.mulai}`));
    }

    if (detail.catatan) {
      kartu.append(elemen("p", "data-description", detail.catatan));
    }
  } else {
    if (item.tanggal) {
      kartu.append(elemen("p", "data-date", formatTanggal(item.tanggal)));
    }

    if (item.isi) {
      kartu.append(elemen("p", "data-description", item.isi));
    }
  }

  if (currentUser && izinKategori.includes(item.kategori)) {
    const actions = elemen("div", "data-actions");

    const edit = elemen("button", "button secondary", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => mulaiEdit(item));

    const hapus = elemen("button", "button danger", "Hapus");
    hapus.type = "button";
    hapus.addEventListener("click", () => hapusItem(item));

    actions.append(edit, hapus);
    kartu.append(actions);
  }

  return kartu;
}

function renderKategori(data, kategori) {
  const container = $(LIST_ID[kategori]);
  if (!container) return;

  container.replaceChildren();

  const daftar = [...data].filter((item) => item.kategori === kategori);

  if (kategori === "jadwal") {
    daftar.sort((a, b) =>
      (a.tanggal || "9999-12-31").localeCompare(b.tanggal || "9999-12-31")
    );
  } else {
    daftar.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  if (!daftar.length) {
    kosong(
      container,
      kategori === "jadwal"
        ? "Belum ada jadwal atau kegiatan."
        : `Belum ada informasi ${NAMA[kategori].toLowerCase()}.`
    );
    return;
  }

  daftar.forEach((item) => container.append(kartuInformasi(item)));
}

function renderDashboard(data) {
  for (const kategori of KATEGORI) {
    const countId = `count-${kategori.replace("_taruna", "")}`;
    const target = $(countId);

    if (target) {
      target.textContent = data.filter((item) => item.kategori === kategori).length;
    }
  }

  const container = $("dashboard-list");
  container.replaceChildren();

  const terbaru = [...data]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (!terbaru.length) {
    kosong(container, "Belum ada informasi kelas.");
    return;
  }

  terbaru.forEach((item) => {
    const kartu = elemen("article", "data-item");
    kartu.append(
      elemen("p", "data-date", NAMA[item.kategori] || item.kategori),
      elemen("h3", "", item.judul)
    );

    if (item.kategori === "jadwal" && item.tanggal) {
      kartu.append(elemen("p", "data-description", formatTanggal(item.tanggal)));
    } else if (item.isi) {
      kartu.append(elemen("p", "data-description", item.isi));
    }

    container.append(kartu);
  });
}

async function muatData() {
  status("Memuat informasi kelas...");

  const { data, error } = await supabaseClient
    .from("kelas_info")
    .select("*");

  if (error) {
    console.error("Gagal membaca data:", error);
    status("Gagal membaca data. Periksa URL, publishable key, dan RLS.");
    return;
  }

  semuaData = data || [];
  renderDashboard(semuaData);

  for (const kategori of KATEGORI) {
    renderKategori(semuaData, kategori);
  }

  status("Informasi kelas berhasil dimuat.");
}

async function muatIzin() {
  izinKategori = [];

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from("manager_permissions")
      .select("kategori")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Gagal membaca izin:", error);
      status("Login berhasil, tetapi izin akun gagal dibaca.");
    } else {
      izinKategori = [...new Set(
        (data || [])
          .map((row) => row.kategori)
          .filter((kategori) => KATEGORI.includes(kategori))
      )];
    }
  }

  $("login-form").hidden = Boolean(currentUser);
  $("account-info").hidden = !currentUser;
  $("management-panel").hidden = !currentUser || izinKategori.length === 0;

  if (currentUser) {
    $("account-email").textContent = `Login sebagai: ${currentUser.email}`;
  } else {
    $("account-email").textContent = "";
  }

  isiPilihanKategori();
  resetForm();
}

async function perbaruiSesi() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    status("Gagal memeriksa sesi login.");
    return;
  }

  currentUser = data.session?.user || null;

  await muatIzin();
  await muatData();
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  status("Mencoba login...");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login gagal:", error.message);
    status("Login gagal. Periksa email dan password akun.");
    return;
  }

  $("login-password").value = "";
  await perbaruiSesi();
  status(
    izinKategori.length
      ? "Login berhasil."
      : "Login berhasil, tetapi akun belum diberi izin kategori."
  );
});

$("logout-button").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error(error);
    status("Gagal logout.");
    return;
  }

  currentUser = null;
  izinKategori = [];
  await muatIzin();
  await muatData();
  status("Kamu sudah logout.");
});

$("info-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    status("Login terlebih dahulu.");
    return;
  }

  const id = $("info-id").value;
  const kategori = $("info-category").value;

  if (!izinKategori.includes(kategori)) {
    status("Akun ini tidak memiliki izin untuk kategori tersebut.");
    return;
  }

  const judul = $("info-title").value.trim();
  const isi = $("info-content").value.trim();
  const tanggal = $("info-date").value || null;

  if (!judul) {
    status("Judul wajib diisi.");
    return;
  }

  status("Menyimpan informasi...");

  let result;

  if (id) {
    result = await supabaseClient
      .from("kelas_info")
      .update({ kategori, judul, isi, tanggal })
      .eq("id", id)
      .select()
      .single();
  } else {
    result = await supabaseClient
      .from("kelas_info")
      .insert({ kategori, judul, isi, tanggal })
      .select()
      .single();
  }

  if (result.error) {
    console.error("Gagal menyimpan:", result.error);
    status("Gagal menyimpan. Periksa izin kategori dan koneksi.");
    return;
  }

  resetForm();
  status("Informasi berhasil disimpan.");
  await muatData();
});

$("cancel-edit").addEventListener("click", resetForm);

$("refresh-button").addEventListener("click", async () => {
  await muatData();
});

const HALAMAN = {
  dashboard: ["Dashboard", "Informasi terbaru kelas X TKJ 2."],
  tugas: ["Tugas", "Informasi tugas dan tenggat pengumpulan."],
  seragam: ["Seragam", "Informasi ketentuan seragam."],
  jadwal: ["Jadwal & Kegiatan", "Jadwal pelajaran dan kegiatan sekolah."],
  piket: ["Piket", "Pembagian dan informasi piket kelas."],
  report: ["Laporan Taruna", "Informasi laporan kegiatan taruna."]
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const halaman = button.dataset.page;

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `page-${halaman}`);
    });

    $("page-title").textContent = HALAMAN[halaman][0];
    $("page-subtitle").textContent = HALAMAN[halaman][1];
  });
});

window.tesSupabase = muatData;

supabaseClient.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;

  // Tunda operasi tambahan agar callback auth tidak menjalankan
  // permintaan Supabase bertingkat di dalam callback.
  setTimeout(() => {
    muatIzin().then(muatData);
  }, 0);
});

perbaruiSesi();
