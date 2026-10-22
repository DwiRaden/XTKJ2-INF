
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
const KATEGORI_RUTIN = ["seragam", "jadwal", "piket"];

const NAMA = {
  tugas: "Tugas",
  seragam: "Seragam & Atribut",
  jadwal: "Jadwal Pelajaran",
  piket: "Piket Kelas",
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
  seragam: ["Seragam & Atribut", "Informasi seragam kelas."],
  jadwal: ["Jadwal Pelajaran", "Jadwal pelajaran dan kegiatan."],
  piket: ["Piket Kelas", "Informasi jadwal piket kelas."],
  report: ["Laporan Taruna", "Informasi laporan taruna."]
};

let currentUser = null;
let guestMode = false;
let isManager = false;
let supabaseSession = null;
let semuaData = [];
let dataRutin = [];
let dataKhusus = [];
let sedangMemuat = false;
let authVersion = 0;
let modeJadwal = "rutin";
let idJadwalEdit = null;

function status(message) {
  if ($("status-message")) $("status-message").textContent = message || "";
}

function tanggalLokal(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function hariLokal(date = new Date()) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

function namaHari(hari) {
  return ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][hari] || "";
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
  if ($("menu-toggle")) $("menu-toggle").hidden = !allowed;
  if ($("guest-button")) $("guest-button").hidden = allowed;
  if ($("login-form")) $("login-form").hidden = allowed;
  if ($("management-panel")) $("management-panel").hidden = !isManager;

  if ($("account-email")) {
    $("account-email").textContent = currentUser
      ? `Login sebagai pengurus: ${currentUser.username}`
      : guestMode
        ? "Mode Guest — hanya dapat melihat informasi."
        : "";
  }

  if ($("logout-button")) {
    $("logout-button").textContent = "Logout";
  }
}

function isiPilihanKategori() {
  const select = $("info-category");
  if (!select) return;

  select.replaceChildren();

  KATEGORI.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = NAMA[category];
    select.appendChild(option);
  });
}

function resetForm() {
  $("info-form")?.reset();
  if ($("info-id")) $("info-id").value = "";
  if ($("save-button")) $("save-button").textContent = "Simpan informasi";
  if ($("cancel-edit")) $("cancel-edit").hidden = true;
}

function mulaiEdit(item) {
  if (!bolehEdit(item.kategori) || item.sumberJadwal) return;

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

  if (item.sumberJadwal) {
    const label = document.createElement("span");
    label.className = "jadwal-label";
    label.textContent = item.labelJadwal || "Jadwal";
    card.appendChild(label);
  }

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

  card.append(category, title, date, description);

  if (!item.sumberJadwal && bolehEdit(item.kategori)) {
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
      count.textContent = semuaData.filter(item => item.kategori === category).length;
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
    const khusus = dataKhusus.filter(item =>
      item.kategori === kategori && item.tanggal === tanggal
    );

    if (khusus.length) {
      khusus.forEach(item => hasil.push({
        id: `khusus-${item.id}`,
        kategori,
        judul: item.judul,
        tanggal: item.tanggal,
        isi: item.isi,
        sumberJadwal: true,
        labelJadwal: "Jadwal khusus"
      }));
    } else {
      dataRutin
        .filter(item => item.kategori === kategori && Number(item.hari) === hari)
        .forEach(item => hasil.push({
          id: `rutin-${item.id}`,
          kategori,
          judul: item.judul,
          tanggal,
          isi: item.isi,
          sumberJadwal: true,
          labelJadwal: `Jadwal rutin · ${namaHari(hari)}`
        }));
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

    semuaData = (hasilKelas.data || []).filter(item => KATEGORI.includes(item.kategori));
    dataRutin = hasilRutin.data || [];
    dataKhusus = hasilKhusus.data || [];

    semuaData = semuaData.filter(item =>
      !KATEGORI_RUTIN.includes(item.kategori) ||
      !item.tanggal ||
      item.tanggal !== tanggalLokal()
    );

    semuaData = [...dataJadwalHariIni(), ...semuaData].sort((a, b) => {
      if (a.sumberJadwal && !b.sumberJadwal) return -1;
      if (!a.sumberJadwal && b.sumberJadwal) return 1;
      return String(b.created_at || b.tanggal || "")
        .localeCompare(String(a.created_at || a.tanggal || ""));
    });

    renderDashboard();
    KATEGORI.forEach(renderKategori);
    status(`Informasi berhasil dimuat · ${semuaData.length} data`);
  } catch (error) {
    console.error(error);
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

// LOGIN JSON YANG SUDAH ADA
if ($("login-form")) {
  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const username = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;
    const button = $("login-form").querySelector('[type="submit"]');

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      status("Username harus 3–30 karakter: huruf, angka, titik, _ atau -.");
      return;
    }

    if (button) button.disabled = true;
    status("Memeriksa akun pengurus...");

    try {
      const response = await fetch(AKUN_JSON_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("File akun tidak ditemukan.");

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

      status(
        "Login tampilan berhasil. Untuk menulis ke tabel jadwal, sesi Supabase Auth admin juga diperlukan."
      );
    } catch (error) {
      console.error(error);
      status(error.message || "Gagal memeriksa file akun.");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

if ($("guest-button")) {
  $("guest-button").addEventListener("click", async () => {
    authVersion++;
    currentUser = null;
    guestMode = true;
    isManager = false;
    aturTampilan();
    resetForm();
    await muatData();
    status("Mode Guest aktif. Hanya dapat melihat informasi.");
  });
}

if ($("logout-button")) {
  $("logout-button").addEventListener("click", async () => {
    authVersion++;
    currentUser = null;
    guestMode = false;
    isManager = false;
    supabaseSession = null;
    aturTampilan();
    resetForm();
    kosongkanData();
    status("Kamu sudah keluar.");
  });
}

// FORM INFORMASI LAMA: kelas_info
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
        : await db.from("kelas_info").insert(record).select("id");

      if (result.error) throw result.error;
      if (!result.data?.length) {
        status("Data tidak berubah. Periksa izin database.");
        return;
      }

      resetForm();
      await muatData();
      status("Informasi berhasil disimpan.");
    } catch (error) {
      console.error(error);
      status("Gagal menyimpan informasi. Periksa policy Supabase.");
    }
  });
}

if ($("cancel-edit")) $("cancel-edit").addEventListener("click", resetForm);
if ($("refresh-button")) $("refresh-button").addEventListener("click", muatData);

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

    if (error) throw error;
    if (!data?.length) {
      status("Data tidak terhapus. Periksa izin database.");
      return;
    }

    await muatData();
    status("Informasi berhasil dihapus.");
  } catch (error) {
    console.error(error);
    status("Gagal menghapus informasi. Periksa policy Supabase.");
  }
}

// FORM KHUSUS PENGELOLAAN JADWAL
function buatFormJadwal() {
  if (!$("management-panel") || $("jadwal-management")) return;

  const panel = document.createElement("section");
  panel.id = "jadwal-management";
  panel.className = "panel";
  panel.hidden = true;

  const heading = document.createElement("h2");
  heading.textContent = "Kelola Jadwal Rutin & Khusus";

  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent =
    "Pilih jadwal rutin untuk mengubah jadwal mingguan, atau jadwal khusus untuk mengganti jadwal pada tanggal tertentu.";

  const form = document.createElement("form");
  form.id = "jadwal-form";
  form.className = "form-grid";

  form.innerHTML = `
    <label for="jadwal-mode">Jenis pengaturan</label>
    <select id="jadwal-mode" required>
      <option value="rutin">Jadwal rutin mingguan</option>
      <option value="khusus">Jadwal khusus tanggal tertentu</option>
    </select>

    <label for="jadwal-category">Kategori</label>
    <select id="jadwal-category" required>
      <option value="seragam">Seragam & Atribut</option>
      <option value="jadwal">Jadwal Pelajaran</option>
      <option value="piket">Piket Kelas</option>
    </select>

    <label id="jadwal-day-label" for="jadwal-day">Hari</label>
    <select id="jadwal-day" required>
      <option value="1">Senin</option>
      <option value="2">Selasa</option>
      <option value="3">Rabu</option>
      <option value="4">Kamis</option>
      <option value="5">Jumat</option>
      <option value="6">Sabtu</option>
      <option value="7">Minggu</option>
    </select>

    <label id="jadwal-date-label" for="jadwal-date" hidden>Tanggal khusus</label>
    <input id="jadwal-date" type="date" hidden>

    <label for="jadwal-title">Judul</label>
    <input id="jadwal-title" maxlength="150" required>

    <label for="jadwal-content">Detail</label>
    <textarea id="jadwal-content" rows="4" maxlength="5000"></textarea>

    <div class="form-actions">
      <button class="button primary" type="submit">Simpan jadwal</button>
      <button id="jadwal-reset" class="button secondary" type="button">Reset</button>
    </div>
  `;

  const listTitle = document.createElement("h3");
  listTitle.textContent = "Jadwal yang tersimpan";

  const list = document.createElement("div");
  list.id = "jadwal-management-list";
  list.className = "data-list";

  panel.append(heading, intro, form, listTitle, list);
  $("management-panel").after(panel);

  $("jadwal-mode").addEventListener("change", () => {
    const khusus = $("jadwal-mode").value === "khusus";
    $("jadwal-day").hidden = khusus;
    $("jadwal-day-label").hidden = khusus;
    $("jadwal-date").hidden = !khusus;
    $("jadwal-date-label").hidden = !khusus;
    modeJadwal = khusus ? "khusus" : "rutin";
    idJadwalEdit = null;
    $("jadwal-form").reset();
    $("jadwal-mode").value = modeJadwal;
  });

  $("jadwal-reset").addEventListener("click", () => {
    idJadwalEdit = null;
    $("jadwal-form").reset();
    $("jadwal-mode").value = "rutin";
    $("jadwal-day").hidden = false;
    $("jadwal-day-label").hidden = false;
    $("jadwal-date").hidden = true;
    $("jadwal-date-label").hidden = true;
    modeJadwal = "rutin";
  });

  form.addEventListener("submit", simpanJadwal);
}

async function simpanJadwal(event) {
  event.preventDefault();

  if (!currentUser || !isManager) {
    status("Login sebagai pengurus terlebih dahulu.");
    return;
  }

  // Login JSON tidak sama dengan sesi Supabase Auth.
  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData.session) {
    status("Login JSON tetap aktif, tetapi sesi Supabase Auth diperlukan untuk menyimpan jadwal dengan aman.");
    return;
  }

  const kategori = $("jadwal-category").value;
  const mode = $("jadwal-mode").value;
  const judul = $("jadwal-title").value.trim();
  const isi = $("jadwal-content").value.trim();

  if (!KATEGORI_RUTIN.includes(kategori) || !judul) {
    status("Kategori dan judul jadwal wajib diisi.");
    return;
  }

  const record = { kategori, judul, isi };

  if (mode === "rutin") {
    record.hari = Number($("jadwal-day").value);

    const query = db.from("jadwal_default");

    const result = idJadwalEdit
      ? await query.update(record).eq("id", idJadwalEdit).select("id")
      : await query.upsert(
          { ...record, hari: record.hari },
          { onConflict: "kategori,hari" }
        ).select("id");

    if (result.error) {
      console.error(result.error);
      status("Gagal menyimpan jadwal rutin. Periksa izin admin Supabase.");
      return;
    }
  } else {
    const tanggal = $("jadwal-date").value;

    if (!tanggal) {
      status("Pilih tanggal jadwal khusus.");
      return;
    }

    record.tanggal = tanggal;

    const result = idJadwalEdit
      ? await db.from("jadwal_khusus")
          .update(record).eq("id", idJadwalEdit).select("id")
      : await db.from("jadwal_khusus").insert(record).select("id");

    if (result.error) {
      console.error(result.error);
      status("Gagal menyimpan jadwal khusus. Periksa izin admin Supabase.");
      return;
    }
  }

  idJadwalEdit = null;
  $("jadwal-reset").click();
  await muatData();
  await renderDaftarJadwalPengurus();
  status("Jadwal berhasil disimpan.");
}

async function renderDaftarJadwalPengurus() {
  const list = $("jadwal-management-list");
  if (!list) return;

  list.replaceChildren();

  const [rutin, khusus] = await Promise.all([
    db.from("jadwal_default")
      .select("id,kategori,hari,judul,isi")
      .order("hari"),
    db.from("jadwal_khusus")
      .select("id,kategori,tanggal,judul,isi")
      .order("tanggal", { ascending: false })
      .limit(50)
  ]);

  if (rutin.error || khusus.error) {
    list.appendChild(kosong("Gagal memuat daftar jadwal."));
    return;
  }

  const semua = [
    ...(rutin.data || []).map(item => ({ ...item, mode: "rutin" })),
    ...(khusus.data || []).map(item => ({ ...item, mode: "khusus" }))
  ];

  if (!semua.length) {
    list.appendChild(kosong("Belum ada jadwal tersimpan."));
    return;
  }

  semua.forEach(item => {
    const card = document.createElement("article");
    card.className = "data-item";

    const title = document.createElement("h3");
    title.textContent = item.judul;

    const info = document.createElement("p");
    info.className = "data-description";
    info.textContent = item.mode === "rutin"
      ? `${NAMA[item.kategori]} · ${namaHari(Number(item.hari))}`
      : `${NAMA[item.kategori]} · ${formatTanggal(item.tanggal)}`;

    const detail = document.createElement("p");
    detail.className = "data-detail";
    detail.textContent = item.isi || "";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary";
    edit.textContent = "Muat ke formulir";
    edit.addEventListener("click", () => {
      $("jadwal-mode").value = item.mode;
      $("jadwal-mode").dispatchEvent(new Event("change"));

      $("jadwal-category").value = item.kategori;
      $("jadwal-title").value = item.judul || "";
      $("jadwal-content").value = item.isi || "";
      idJadwalEdit = item.id;

      if (item.mode === "rutin") {
        $("jadwal-day").value = String(item.hari);
      } else {
        $("jadwal-date").value = item.tanggal;
      }

      $("jadwal-form").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    card.append(title, info, detail, edit);
    list.appendChild(card);
  });
}

function aturPanelJadwal() {
  buatFormJadwal();

  const panel = $("jadwal-management");
  if (panel) panel.hidden = !isManager;

  if (isManager) renderDaftarJadwalPengurus();
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
    if ($("menu-toggle")) $("menu-toggle").setAttribute("aria-expanded", "false");
  });
});

const originalAturTampilan = aturTampilan;
aturTampilan = function () {
  originalAturTampilan();
  aturPanelJadwal();
};

window.tesSupabase = muatData;
window.tanggalLokal = tanggalLokal;

aturTampilan();
kosongkanData();
status("Silakan login atau masuk sebagai Guest.");
