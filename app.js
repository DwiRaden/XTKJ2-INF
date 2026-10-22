"use strict";

// ===============================
// KONFIGURASI SUPABASE
// ===============================
const SUPABASE_URL = "https://radxvffcqhjceyhedgfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_W9haCcO2DfYrZGeLyO5CHw_0sUpWDyG";

if (!window.supabase) {
  throw new Error("Supabase JS belum dimuat di index.html.");
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ===============================
// KONFIGURASI APLIKASI
// ===============================
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

const HALAMAN = {
  dashboard: ["Dashboard", "Informasi terbaru kelas kita."],
  tugas: ["Tugas", "Daftar tugas dan pekerjaan sekolah."],
  seragam: ["Seragam", "Informasi seragam kelas."],
  jadwal: ["Jadwal & Kegiatan", "Jadwal pelajaran dan kegiatan."],
  piket: ["Piket", "Informasi jadwal piket kelas."],
  report: ["Laporan Taruna", "Informasi laporan taruna."]
};

const $ = id => document.getElementById(id);

let currentUser = null;
let izinKategori = [];
let semuaData = [];
let guestMode = new URLSearchParams(location.search).get("mode") === "guest";
let sedangMemuat = false;

// ===============================
// UTILITAS
// ===============================
function status(pesan) {
  const el = $("status-message");
  if (el) el.textContent = pesan || "";
}

function formatTanggal(tanggal) {
  if (!tanggal) return "Tanggal belum ditentukan";

  const date = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(date.getTime())) return tanggal;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function kosong(pesan = "Belum ada informasi.") {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = pesan;
  return div;
}

function bolehEdit(kategori) {
  return Boolean(currentUser && izinKategori.includes(kategori));
}

// ===============================
// FORM PENGELOLA
// ===============================
function isiPilihanKategori() {
  const select = $("info-category");
  if (!select) return;

  select.replaceChildren();

  KATEGORI
    .filter(kategori => izinKategori.includes(kategori))
    .forEach(kategori => {
      const option = document.createElement("option");
      option.value = kategori;
      option.textContent = NAMA[kategori];
      select.appendChild(option);
    });
}

function resetForm() {
  const form = $("info-form");
  if (!form) return;

  form.reset();

  if ($("info-id")) $("info-id").value = "";
  if ($("save-button")) $("save-button").textContent = "Simpan informasi";
  if ($("cancel-edit")) $("cancel-edit").hidden = true;
}

function mulaiEdit(item) {
  if (!bolehEdit(item.kategori)) {
    status("Akunmu tidak memiliki izin mengedit kategori ini.");
    return;
  }

  $("info-id").value = item.id;
  $("info-category").value = item.kategori;
  $("info-title").value = item.judul || "";
  $("info-date").value = item.tanggal || "";
  $("info-content").value = item.isi || "";
  $("save-button").textContent = "Simpan perubahan";
  $("cancel-edit").hidden = false;

  $("management-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ===============================
// TAMPILKAN KARTU INFORMASI
// ===============================
function kartuInformasi(item) {
  const card = document.createElement("article");
  card.className = "data-item";

  const category = document.createElement("span");
  category.className = "eyebrow";
  category.textContent = NAMA[item.kategori] || item.kategori;

  const title = document.createElement("h3");
  title.textContent = item.judul || "Tanpa judul";

  const date = document.createElement("div");
  date.className = "data-date";
  date.textContent = formatTanggal(item.tanggal);

  const description = document.createElement("p");
  description.className = "data-description";
  description.textContent = item.isi || "";

  const details = document.createElement("div");
  details.className = "data-detail";
  details.append(category, title, date, description);
  card.appendChild(details);

  if (bolehEdit(item.kategori)) {
    const actions = document.createElement("div");
    actions.className = "data-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => mulaiEdit(item));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button danger";
    remove.textContent = "Hapus";
    remove.addEventListener("click", () => hapusItem(item));

    actions.append(edit, remove);
    card.appendChild(actions);
  }

  return card;
}

function renderKategori(kategori) {
  const container = $(LIST_ID[kategori]);
  if (!container) return;

  container.replaceChildren();

  const items = semuaData.filter(item => item.kategori === kategori);

  if (!items.length) {
    container.appendChild(kosong());
    return;
  }

  items.forEach(item => container.appendChild(kartuInformasi(item)));
}

function renderDashboard() {
  const container = $("dashboard-list");
  if (!container) return;

  container.replaceChildren();

  const counts = {
    tugas: $("count-tugas"),
    seragam: $("count-seragam"),
    jadwal: $("count-jadwal"),
    piket: $("count-piket")
  };

  Object.entries(counts).forEach(([kategori, el]) => {
    if (el) {
      el.textContent = semuaData.filter(
        item => item.kategori === kategori
      ).length;
    }
  });

  if (!semuaData.length) {
    container.appendChild(kosong());
    return;
  }

  semuaData.slice(0, 8).forEach(item => {
    container.appendChild(kartuInformasi(item));
  });
}

// ===============================
// MUAT DATA DARI SUPABASE
// ===============================
async function muatData() {
  if (sedangMemuat) return;
  sedangMemuat = true;

  status("Memuat informasi...");

  try {
    const { data, error } = await supabaseClient
      .from("kelas_info")
      .select("id,kategori,judul,tanggal,isi,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    semuaData = (data || []).filter(item =>
      KATEGORI.includes(item.kategori)
    );

    renderDashboard();
    KATEGORI.forEach(renderKategori);

    status(`Informasi berhasil dimuat · ${semuaData.length} data`);
  } catch (error) {
    console.error("Gagal memuat informasi:", error);
    status("Gagal memuat informasi. Periksa koneksi, key, tabel, dan RLS.");
  } finally {
    sedangMemuat = false;
  }
}

// ===============================
// IZIN PENGURUS
// ===============================
async function muatIzin() {
  izinKategori = [];

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from("manager_permissions")
      .select("kategori")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Gagal membaca izin:", error);
      status("Izin akun gagal dibaca. Periksa tabel manager_permissions.");
    } else {
      izinKategori = [...new Set(
        (data || [])
          .map(row => row.kategori)
          .filter(kategori => KATEGORI.includes(kategori))
      )];
    }
  }

  if ($("login-form")) {
    $("login-form").hidden = Boolean(currentUser) || guestMode;
  }

  if ($("guest-button")) {
    $("guest-button").hidden = Boolean(currentUser) || guestMode;
  }

  if ($("account-info")) {
    $("account-info").hidden = !currentUser && !guestMode;
  }

  if ($("management-panel")) {
    $("management-panel").hidden =
      !currentUser || izinKategori.length === 0;
  }

  if ($("account-email")) {
    if (currentUser) {
      $("account-email").textContent =
        `Login sebagai pengurus: ${currentUser.user_metadata?.username || currentUser.email}`;
    } else if (guestMode) {
      $("account-email").textContent =
        "Kamu masuk sebagai Guest — akses hanya baca.";
    } else {
      $("account-email").textContent = "";
    }
  }

  if ($("logout-button")) {
    $("logout-button").textContent =
      guestMode && !currentUser ? "Keluar dari Guest" : "Logout";
  }

  isiPilihanKategori();
  resetForm();
}

// ===============================
// SESI LOGIN
// ===============================
async function perbaruiSesi() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    status("Gagal memeriksa sesi login.");
    return;
  }

  currentUser = data.session?.user || null;

  if (currentUser) guestMode = false;

  await muatIzin();
  await muatData();
}

// ===============================
// LOGIN PENGURUS
// Username dipetakan ke email khusus.
// Akun harus dibuat terlebih dahulu di Supabase Auth.
// ===============================
if ($("login-form")) {
  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const username = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      status("Username harus 3–30 karakter: huruf, angka, titik, _ atau -.");
      return;
    }

    const email = `${username}@kelas-kita.local`;

    status("Mencoba login pengurus...");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Login gagal:", error.message);
      status("Login gagal. Periksa username dan password.");
      return;
    }

    guestMode = false;
    $("login-password").value = "";

    await perbaruiSesi();

    status(
      izinKategori.length
        ? "Login berhasil."
        : "Login berhasil, tetapi akun belum memiliki izin kategori."
    );
  });
}

// ===============================
// MODE GUEST
// ===============================
if ($("guest-button")) {
  $("guest-button").addEventListener("click", async () => {
    if (currentUser) {
      status("Logout dari akun pengurus terlebih dahulu.");
      return;
    }

    guestMode = true;
    await muatIzin();
    await muatData();

    status("Masuk sebagai Guest. Akses hanya baca.");
  });
}

// ===============================
// LOGOUT
// ===============================
if ($("logout-button")) {
  $("logout-button").addEventListener("click", async () => {
    if (currentUser) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error(error);
        status("Gagal logout.");
        return;
      }
    }

    currentUser = null;
    guestMode = false;
    izinKategori = [];

    await muatIzin();
    await muatData();

    status("Kamu sudah keluar.");
  });
}

// ===============================
// SIMPAN / EDIT INFORMASI
// ===============================
if ($("info-form")) {
  $("info-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) {
      status("Login sebagai pengurus untuk mengelola informasi.");
      return;
    }

    const id = $("info-id").value;
    const kategori = $("info-category").value;

    if (!bolehEdit(kategori)) {
      status("Akunmu tidak memiliki izin untuk kategori ini.");
      return;
    }

    const record = {
      kategori,
      judul: $("info-title").value.trim(),
      tanggal: $("info-date").value || null,
      isi: $("info-content").value.trim()
    };

    if (!record.judul || !record.isi) {
      status("Judul dan isi wajib diisi.");
      return;
    }

    status("Menyimpan informasi...");

    const result = id
      ? await supabaseClient
          .from("kelas_info")
          .update(record)
          .eq("id", id)
          .eq("kategori", kategori)
          .select("id")
      : await supabaseClient
          .from("kelas_info")
          .insert(record)
          .select("id");

    if (result.error) {
      console.error(result.error);
      status("Gagal menyimpan. Periksa izin RLS di Supabase.");
      return;
    }

    if (!result.data?.length) {
      status("Tidak ada data berubah. Periksa izin RLS atau ID data.");
      return;
    }

    resetForm();
    await muatData();
    status("Informasi berhasil disimpan.");
  });
}

if ($("cancel-edit")) {
  $("cancel-edit").addEventListener("click", resetForm);
}

if ($("refresh-button")) {
  $("refresh-button").addEventListener("click", muatData);
}

// ===============================
// HAPUS INFORMASI
// ===============================
async function hapusItem(item) {
  if (!bolehEdit(item.kategori)) {
    status("Akunmu tidak memiliki izin menghapus kategori ini.");
    return;
  }

  if (!confirm(`Hapus informasi "${item.judul}"?`)) return;

  const { error } = await supabaseClient
    .from("kelas_info")
    .delete()
    .eq("id", item.id)
    .eq("kategori", item.kategori);

  if (error) {
    console.error(error);
    status("Gagal menghapus. Periksa izin RLS.");
    return;
  }

  await muatData();
  status("Informasi berhasil dihapus.");
}

// ===============================
// NAVIGASI
// ===============================
document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle("active", section.id === `page-${page}`);
    });

    const [title, subtitle] = HALAMAN[page] || HALAMAN.dashboard;

    if ($("page-title")) $("page-title").textContent = title;
    if ($("page-subtitle")) $("page-subtitle").textContent = subtitle;
  });
});

window.tesSupabase = muatData;

// Jangan melakukan query Supabase langsung di callback auth.
supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;

  if (currentUser) guestMode = false;

  Promise.resolve().then(async () => {
    await muatIzin();
    await muatData();
  });
});

perbaruiSesi();
