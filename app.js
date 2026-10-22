
"use strict";

const SUPABASE_URL = "https://radxvffcqhjceyhedgfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_W9haCcO2DfYrZGeLyO5CHw_0sUpWDyG";

if (!window.supabase) {
  throw new Error("Supabase JS belum dimuat.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);

const KATEGORI = ["tugas", "seragam", "jadwal", "piket", "report_taruna"];
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

let currentUser = null;
let guestMode = false;
let isManager = false;
let semuaData = [];
let sedangMemuat = false;
let authVersion = 0;

function status(message) {
  if ($("status-message")) $("status-message").textContent = message || "";
}

function formatTanggal(value) {
  if (!value) return "Tanggal belum ditentukan";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
      });
}

function kosong(message = "Belum ada informasi.") {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.textContent = message;
  return el;
}

function bolehEdit(kategori) {
  return Boolean(currentUser && isManager && KATEGORI.includes(kategori));
}

function aturTampilan() {
  const loggedIn = Boolean(currentUser);
  const allowed = loggedIn || guestMode;

  if ($("auth-screen")) $("auth-screen").hidden = allowed;
  if ($("app-container")) $("app-container").hidden = !allowed;
  if ($("account-info")) $("account-info").hidden = !allowed;

  if ($("account-email")) {
    $("account-email").textContent = loggedIn
      ? `Login sebagai pengurus: ${currentUser.email || ""}`
      : guestMode
        ? "Mode Guest — hanya dapat melihat informasi."
        : "";
  }

  if ($("logout-button")) {
    $("logout-button").textContent = guestMode && !loggedIn
      ? "Keluar dari Guest"
      : "Logout";
  }

  if ($("management-panel")) {
    $("management-panel").hidden = !bolehEdit("tugas");
  }

  if ($("menu-toggle")) $("menu-toggle").hidden = !allowed;

  if ($("guest-button")) $("guest-button").hidden = allowed;
  if ($("login-form")) $("login-form").hidden = allowed;
}

function isiPilihanKategori() {
  const select = $("info-category");
  if (!select) return;

  select.replaceChildren();

  if (!isManager) return;

  KATEGORI.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = NAMA[category];
    select.appendChild(option);
  });
}

function resetForm() {
  const form = $("info-form");
  if (form) form.reset();
  if ($("info-id")) $("info-id").value = "";
  if ($("save-button")) $("save-button").textContent = "Simpan informasi";
  if ($("cancel-edit")) $("cancel-edit").hidden = true;
}

function mulaiEdit(item) {
  if (!bolehEdit(item.kategori)) {
    status("Akun ini tidak memiliki izin pengurus.");
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
    behavior: "smooth", block: "start"
  });
}

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

function renderKategori(category) {
  const container = $(LIST_ID[category]);
  if (!container) return;

  container.replaceChildren();
  const items = semuaData.filter(item => item.kategori === category);

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

  for (const category of ["tugas", "seragam", "jadwal", "piket"]) {
    const count = $("count-" + category);
    if (count) {
      count.textContent = semuaData.filter(
        item => item.kategori === category
      ).length;
    }
  }

  if (!semuaData.length) {
    container.appendChild(kosong());
    return;
  }

  semuaData.slice(0, 8).forEach(item => {
    container.appendChild(kartuInformasi(item));
  });
}

function kosongkanData() {
  semuaData = [];
  renderDashboard();
  KATEGORI.forEach(renderKategori);
}

async function muatData() {
  if (!currentUser && !guestMode) {
    kosongkanData();
    return;
  }

  if (sedangMemuat) return;
  sedangMemuat = true;
  const version = authVersion;
  status("Memuat informasi...");

  try {
    const { data, error } = await db
      .from("kelas_info")
      .select("id,kategori,judul,tanggal,isi,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (version !== authVersion || (!currentUser && !guestMode)) return;

    semuaData = (data || []).filter(item => KATEGORI.includes(item.kategori));
    renderDashboard();
    KATEGORI.forEach(renderKategori);
    status(`Informasi berhasil dimuat · ${semuaData.length} data`);
  } catch (error) {
    console.error("Gagal memuat data:", error);
    status("Gagal memuat data. Periksa koneksi dan policy Supabase.");
  } finally {
    sedangMemuat = false;
  }
}

async function muatIzin() {
  isManager = false;

  if (currentUser) {
    const userId = currentUser.id;
    const { data, error } = await db
      .from("manager_permissions")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      console.error("Gagal memeriksa izin:", error);
      status("Izin pengurus gagal diperiksa.");
    } else {
      isManager = Boolean(data && data.length > 0);
    }
  }

  isiPilihanKategori();
  aturTampilan();
  resetForm();
}

async function sinkronkanSesi() {
  const version = ++authVersion;
  const { data, error } = await db.auth.getSession();

  if (version !== authVersion) return;

  if (error) {
    console.error(error);
    currentUser = null;
    guestMode = false;
    isManager = false;
    aturTampilan();
    kosongkanData();
    status("Gagal memeriksa sesi login.");
    return;
  }

  currentUser = data.session?.user || null;
  guestMode = false;

  await muatIzin();
  if (version !== authVersion) return;

  aturTampilan();

  if (currentUser) {
    await muatData();
    status(isManager
      ? "Login berhasil. Mode pengurus aktif."
      : "Login berhasil. Akun ini hanya dapat melihat informasi.");
  } else {
    kosongkanData();
    status("Silakan login atau masuk sebagai Guest.");
  }
}

// Login pengurus: username dipetakan ke email khusus.
if ($("login-form")) {
  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const username = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      status("Username harus 3–30 karakter: huruf, angka, titik, _ atau -.");
      return;
    }

    const button = $("login-form").querySelector('[type="submit"]');
    if (button) button.disabled = true;

    status("Mencoba login...");

    try {
      const { error } = await db.auth.signInWithPassword({
        email: `${username}@kelas-kita.local`,
        password
      });

      if (error) throw error;

      $("login-password").value = "";
      guestMode = false;
      await sinkronkanSesi();
    } catch (error) {
      console.error("Login gagal:", error);
      status("Login gagal. Periksa username dan password.");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// Guest hanya mendapat akses baca melalui policy RLS.
if ($("guest-button")) {
  $("guest-button").addEventListener("click", async () => {
    if (currentUser) return;

    guestMode = true;
    isManager = false;
    authVersion++;

    aturTampilan();
    status("Memuat informasi Guest...");
    await muatData();
    status("Mode Guest aktif. Kamu hanya bisa melihat informasi.");
  });
}

if ($("logout-button")) {
  $("logout-button").addEventListener("click", async () => {
    if (currentUser) {
      const { error } = await db.auth.signOut();
      if (error) {
        console.error(error);
        status("Gagal logout.");
        return;
      }
    }

    authVersion++;
    currentUser = null;
    guestMode = false;
    isManager = false;
    aturTampilan();
    kosongkanData();
    status("Kamu sudah keluar.");
  });
}

if ($("info-form")) {
  $("info-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !isManager) {
      status("Hanya pengurus terdaftar yang bisa mengelola informasi.");
      return;
    }

    const id = $("info-id").value;
    const category = $("info-category").value;

    if (!KATEGORI.includes(category)) {
      status("Pilih kategori yang valid.");
      return;
    }

    const record = {
      kategori: category,
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
      ? await db.from("kelas_info")
          .update(record).eq("id", id).eq("kategori", category).select("id")
      : await db.from("kelas_info").insert(record).select("id");

    if (result.error) {
      console.error(result.error);
      status("Gagal menyimpan. Periksa policy RLS.");
      return;
    }

    if (!result.data?.length) {
      status("Tidak ada data berubah. Periksa izin dan ID data.");
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

async function hapusItem(item) {
  if (!bolehEdit(item.kategori)) {
    status("Hanya pengurus yang bisa menghapus informasi.");
    return;
  }

  if (!confirm(`Hapus informasi "${item.judul}"?`)) return;

  const { data, error } = await db
    .from("kelas_info")
    .delete()
    .eq("id", item.id)
    .eq("kategori", item.kategori)
    .select("id");

  if (error) {
    console.error(error);
    status("Gagal menghapus. Periksa policy RLS.");
    return;
  }

  if (!data?.length) {
    status("Data tidak terhapus. Periksa izin RLS.");
    return;
  }

  await muatData();
  status("Informasi berhasil dihapus.");
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    if (!currentUser && !guestMode) {
      status("Pilih Login atau Guest terlebih dahulu.");
      return;
    }

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

    $("sidebar")?.classList.remove("open");
    if ($("menu-toggle")) $("menu-toggle").setAttribute("aria-expanded", "false");
  });
});

window.tesSupabase = muatData;

// Sesi login dipulihkan saat halaman dibuka.
db.auth.onAuthStateChange((_event, session) => {
  authVersion++;
  currentUser = session?.user || null;

  if (currentUser) guestMode = false;

  // Jalankan setelah callback auth selesai agar tidak mengunci proses auth.
  Promise.resolve().then(async () => {
    await muatIzin();
    aturTampilan();

    if (currentUser) {
      await muatData();
    } else if (!guestMode) {
      kosongkanData();
      status("Silakan login atau masuk sebagai Guest.");
    }
  }).catch(error => {
    console.error("Gagal memperbarui sesi:", error);
  });
});

// Sembunyikan dashboard sampai pilihan akses dibuat.
aturTampilan();
sinkronkanSesi();
