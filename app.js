
"use strict";

const SUPABASE_URL = "https://radxvffcqhjceyhedgfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_W9haCcO2DfYrZGeLyO5CHw_0sUpWDyG";
const AKUN_JSON_URL = "./dbradenroawr.json";

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

const KATEGORI_RUTIN = ["seragam", "jadwal", "piket"];

let currentUser = null;
let guestMode = false;
let isManager = false;
let semuaData = [];
let dataRutin = [];
let dataKhusus = [];
let sedangMemuat = false;
let authVersion = 0;

function status(message) {
  if ($("status-message")) {
    $("status-message").textContent = message || "";
  }
}

function tanggalLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, "0");
  const hari = String(date.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

// Senin = 1, Selasa = 2, ... Minggu = 7
function hariLokal(date = new Date()) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

function namaHari(hari) {
  return [
    "", "Senin", "Selasa", "Rabu", "Kamis",
    "Jumat", "Sabtu", "Minggu"
  ][hari] || "Hari tidak diketahui";
}

function formatTanggal(value) {
  if (!value) return "Tanggal belum ditentukan";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
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
  const allowed = Boolean(currentUser || guestMode);

  if ($("auth-screen")) $("auth-screen").hidden = allowed;
  if ($("app-container")) $("app-container").hidden = !allowed;
  if ($("account-info")) $("account-info").hidden = !allowed;

  if ($("account-email")) {
    $("account-email").textContent = currentUser
      ? `Login sebagai pengurus: ${currentUser.username}`
      : guestMode
        ? "Mode Guest — hanya dapat melihat informasi."
        : "";
  }

  if ($("logout-button")) {
    $("logout-button").textContent =
      guestMode && !currentUser ? "Keluar dari Guest" : "Logout";
  }

  if ($("management-panel")) {
    $("management-panel").hidden = !isManager;
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
  if ($("info-form")) $("info-form").reset();
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
    behavior: "smooth",
    block: "start"
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

  // Jadwal rutin dan khusus hanya ditampilkan, tidak diedit lewat
  // formulir kelas_info yang memiliki struktur tabel berbeda.
  if (
    !item.sumberJadwal &&
    bolehEdit(item.kategori)
  ) {
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
  dataRutin = [];
  dataKhusus = [];
  renderDashboard();
  KATEGORI.forEach(renderKategori);
}

function dataJadwalHariIni() {
  const hari = hariLokal();
  const tanggal = tanggalLokal();

  const hasil = [];

  for (const kategori of KATEGORI_RUTIN) {
    const khususHariIni = dataKhusus.filter(item =>
      item.kategori === kategori && item.tanggal === tanggal
    );

    if (khususHariIni.length) {
      khususHariIni.forEach(item => {
        hasil.push({
          id: `khusus-${item.id}`,
          kategori,
          judul: item.judul,
          tanggal: item.tanggal,
          isi: item.isi,
          sumberJadwal: true,
          labelJadwal: "Jadwal khusus"
        });
      });
    } else {
      dataRutin
        .filter(item => item.kategori === kategori && Number(item.hari) === hari)
        .forEach(item => {
          hasil.push({
            id: `rutin-${item.id}`,
            kategori,
            judul: item.judul,
            tanggal,
            isi: item.isi,
            sumberJadwal: true,
            labelJadwal: "Jadwal rutin"
          });
        });
    }
  }

  return hasil;
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
    const [hasilKelas, hasilRutin, hasilKhusus] = await Promise.all([
      db.from("kelas_info")
        .select("id,kategori,judul,tanggal,isi,created_at")
        .order("created_at", { ascending: false }),

      db.from("jadwal_default")
        .select("id,kategori,hari,judul,isi,updated_at"),

      db.from("jadwal_khusus")
        .select("id,kategori,tanggal,judul,isi,updated_at")
        .eq("tanggal", tanggalLokal())
    ]);

    if (hasilKelas.error) throw hasilKelas.error;
    if (hasilRutin.error) throw hasilRutin.error;
    if (hasilKhusus.error) throw hasilKhusus.error;

    if (version !== authVersion || (!currentUser && !guestMode)) return;

    semuaData = (hasilKelas.data || []).filter(
      item => KATEGORI.includes(item.kategori)
    );

    dataRutin = hasilRutin.data || [];
    dataKhusus = hasilKhusus.data || [];

    // Jadwal rutin dan khusus hari ini menggantikan tampilan rutin
    // untuk kategori yang sama, tetapi tidak mengubah data tersimpan.
    semuaData = semuaData.filter(item =>
      !KATEGORI_RUTIN.includes(item.kategori) ||
      !item.tanggal ||
      item.tanggal !== tanggalLokal()
    );

    semuaData = [...dataJadwalHariIni(), ...semuaData]
      .sort((a, b) => {
        if (a.sumberJadwal && !b.sumberJadwal) return -1;
        if (!a.sumberJadwal && b.sumberJadwal) return 1;

        return String(b.created_at || b.tanggal || "")
          .localeCompare(String(a.created_at || a.tanggal || ""));
      });

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

function mulaiSesiPengurus(username) {
  authVersion++;
  currentUser = { username };
  guestMode = false;
  isManager = true;
  isiPilihanKategori();
  aturTampilan();
  resetForm();
}

// LOGIN JSON
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

    status("Memeriksa akun pengurus...");

    try {
      const response = await fetch(AKUN_JSON_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`File akun tidak ditemukan (HTTP ${response.status}).`);
      }

      const daftarAkun = await response.json();

      if (!Array.isArray(daftarAkun.pengurus)) {
        throw new Error("Format JSON harus memiliki array 'pengurus'.");
      }

      const akun = daftarAkun.pengurus.find(item =>
        typeof item.username === "string" &&
        typeof item.password === "string" &&
        item.username.trim().toLowerCase() === username &&
        item.password === password
      );

      if (!akun) {
        status("Login gagal. Periksa username dan password.");
        return;
      }

      $("login-password").value = "";
      mulaiSesiPengurus(akun.username.trim());
      await muatData();
      status("Login berhasil. Mode pengurus aktif.");
    } catch (error) {
      console.error("Login JSON gagal:", error);
      status(error.message.includes("File akun") ||
        error.message.includes("Format JSON")
        ? error.message
        : "Login gagal memeriksa file akun. Periksa file JSON dan koneksi.");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// MODE GUEST
if ($("guest-button")) {
  $("guest-button").addEventListener("click", async () => {
    if (currentUser) return;

    authVersion++;
    currentUser = null;
    guestMode = true;
    isManager = false;

    isiPilihanKategori();
    aturTampilan();
    resetForm();
    status("Memuat informasi Guest...");

    await muatData();
    status("Mode Guest aktif. Kamu hanya bisa melihat informasi.");
  });
}

// LOGOUT
if ($("logout-button")) {
  $("logout-button").addEventListener("click", () => {
    authVersion++;
    currentUser = null;
    guestMode = false;
    isManager = false;

    isiPilihanKategori();
    aturTampilan();
    resetForm();
    kosongkanData();
    status("Kamu sudah keluar.");
  });
}

// SIMPAN INFORMASI LAMA DI kelas_info
if ($("info-form")) {
  $("info-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !isManager) {
      status("Hanya pengurus yang login yang bisa mengelola informasi.");
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

    try {
      const result = id
        ? await db.from("kelas_info")
            .update(record).eq("id", id).eq("kategori", category).select("id")
        : await db.from("kelas_info")
            .insert(record).select("id");

      if (result.error) {
        console.error(result.error);
        status("Gagal menyimpan. Periksa policy Supabase.");
        return;
      }

      if (!result.data?.length) {
        status("Tidak ada data berubah. Periksa izin database dan ID data.");
        return;
      }

      resetForm();
      await muatData();
      status("Informasi berhasil disimpan.");
    } catch (error) {
      console.error(error);
      status("Terjadi kesalahan saat menyimpan informasi.");
    }
  });
}

if ($("cancel-edit")) {
  $("cancel-edit").addEventListener("click", resetForm);
}

if ($("refresh-button")) {
  $("refresh-button").addEventListener("click", muatData);
}

async function hapusItem(item) {
  if (!bolehEdit(item.kategori) || item.sumberJadwal) {
    status("Item ini tidak bisa dihapus melalui formulir informasi umum.");
    return;
  }

  if (!confirm(`Hapus informasi "${item.judul}"?`)) return;

  try {
    const { data, error } = await db.from("kelas_info")
      .delete()
      .eq("id", item.id)
      .eq("kategori", item.kategori)
      .select("id");

    if (error) {
      console.error(error);
      status("Gagal menghapus. Periksa policy Supabase.");
      return;
    }

    if (!data?.length) {
      status("Data tidak terhapus. Periksa izin database.");
      return;
    }

    await muatData();
    status("Informasi berhasil dihapus.");
  } catch (error) {
    console.error(error);
    status("Terjadi kesalahan saat menghapus informasi.");
  }
}

// NAVIGASI
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

    if ($("menu-toggle")) {
      $("menu-toggle").setAttribute("aria-expanded", "false");
    }
  });
});

window.tesSupabase = muatData;
window.tanggalLokal = tanggalLokal;

// MULAI LOGOUT
aturTampilan();
kosongkanData();
status("Silakan login atau masuk sebagai Guest.");
