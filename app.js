
"use strict";

// Isi URL dan publishable key dari Supabase project milikmu.
const SUPABASE_URL = "https://radxvffcqhjceyhedgfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_W9haCcO2DfYrZGeLyO5CHw_0sUpWDyG";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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

const $ = id => document.getElementById(id);

let currentUser = null;
let izinKategori = [];
let semuaData = [];
let guestMode = false;
let sedangMemuat = false;

function status(pesan) {
  $("status-message").textContent = pesan || "";
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

function isiPilihanKategori() {
  const select = $("info-category");
  select.replaceChildren();

  KATEGORI.filter(k => izinKategori.includes(k)).forEach(kategori => {
    const option = document.createElement("option");
    option.value = kategori;
    option.textContent = NAMA[kategori];
    select.appendChild(option);
  });
}

function resetForm() {
  $("info-form").reset();
  $("info-id").value = "";
  $("save-button").textContent = "Simpan informasi";
  $("cancel-edit").hidden = true;
}

function mulaiEdit(item) {
  if (!currentUser || !izinKategori.includes(item.kategori)) {
    status("Kamu tidak memiliki izin mengedit kategori ini.");
    return;
  }

  $("info-id").value = item.id;
  $("info-category").value = item.kategori;
  $("info-title").value = item.judul || "";
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
  if (!currentUser || !izinKategori.includes(item.kategori)) {
    status("Kamu tidak memiliki izin menghapus kategori ini.");
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

  status("Informasi berhasil dihapus.");
  await muatData();
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

  if (currentUser && izinKategori.includes(item.kategori)) {
    const actions = document.createElement("div");
    actions.className = "data-actions";

    const edit = document.createElement("button");
    edit.className = "button secondary";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => mulaiEdit(item));

    const remove = document.createElement("button");
    remove.className = "button danger";
    remove.type = "button";
    remove.textContent = "Hapus";
    remove.addEventListener("click", () => hapusItem(item));

    actions.append(edit, remove);
    card.appendChild(actions);
  }

  return card;
}

function renderKategori(kategori) {
  const container = $(LIST_ID[kategori]);
  container.replaceChildren();

  const items = semuaData.filter(item => item.kategori === kategori);

  if (!items.length) {
    container.appendChild(kosong());
    return;
  }

  items.forEach(item => container.appendChild(kartuInformasi(item)));
}

function renderDashboard() {
  $("dashboard-list").replaceChildren();

  $("count-tugas").textContent =
    semuaData.filter(x => x.kategori === "tugas").length;
  $("count-seragam").textContent =
    semuaData.filter(x => x.kategori === "seragam").length;
  $("count-jadwal").textContent =
    semuaData.filter(x => x.kategori === "jadwal").length;
  $("count-piket").textContent =
    semuaData.filter(x => x.kategori === "piket").length;

  if (!semuaData.length) {
    $("dashboard-list").appendChild(kosong());
    return;
  }

  semuaData.slice(0, 8).forEach(item => {
    $("dashboard-list").appendChild(kartuInformasi(item));
  });
}

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
    status("Gagal memuat informasi. Periksa koneksi, key, dan kebijakan RLS.");
  } finally {
    sedangMemuat = false;
  }
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
      status("Izin akun gagal dibaca.");
    } else {
      izinKategori = [...new Set(
        (data || [])
          .map(row => row.kategori)
          .filter(kategori => KATEGORI.includes(kategori))
      )];
    }
  }

  $("login-form").hidden = Boolean(currentUser) || guestMode;
  $("guest-button").hidden = Boolean(currentUser) || guestMode;
  $("account-info").hidden = !currentUser && !guestMode;
  $("management-panel").hidden =
    !currentUser || izinKategori.length === 0;

  if (currentUser) {
    $("account-email").textContent =
      `Login sebagai pengurus: ${currentUser.user_metadata?.username || currentUser.email}`;
    $("logout-button").textContent = "Logout";
  } else if (guestMode) {
    $("account-email").textContent =
      "Kamu masuk sebagai Guest — akses hanya baca.";
    $("logout-button").textContent = "Keluar dari Guest";
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
  guestMode = false;

  await muatIzin();
  await muatData();
}

$("login-form").addEventListener("submit", async event => {
  event.preventDefault();

  const username = $("login-email").value.trim().toLowerCase();
  const password = $("login-password").value;

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    status("Username harus 3–30 karakter: huruf, angka, titik, _ atau -.");
    return;
  }

  // Pemetaan ini membutuhkan akun Auth yang benar-benar sudah dibuat.
  const email = `${username}@kelas-kita.local`;

  status("Memeriksa akun pengurus...");

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
      ? "Login pengurus berhasil."
      : "Login berhasil, tetapi akun belum diberi izin kategori."
  );
});

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

$("info-form").addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    status("Login sebagai pengurus untuk mengelola informasi.");
    return;
  }

  const id = $("info-id").value;
  const kategori = $("info-category").value;

  if (!izinKategori.includes(kategori)) {
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

  let result;

  if (id) {
    result = await supabaseClient
      .from("kelas_info")
      .update(record)
      .eq("id", id)
      .eq("kategori", kategori)
      .select("id");
  } else {
    result = await supabaseClient
      .from("kelas_info")
      .insert(record)
      .select("id");
  }

  if (result.error) {
    console.error(result.error);
    status("Gagal menyimpan. Periksa izin RLS di Supabase.");
    return;
  }

  if (!result.data?.length) {
    status("Tidak ada data berubah. Periksa izin atau ID data.");
    return;
  }

  resetForm();
  status("Informasi berhasil disimpan.");
  await muatData();
});

$("cancel-edit").addEventListener("click", resetForm);

$("refresh-button").addEventListener("click", muatData);

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
    $("page-title").textContent = title;
    $("page-subtitle").textContent = subtitle;
  });
});

window.tesSupabase = muatData;

supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  guestMode = false;

  // Hindari menjalankan operasi Supabase secara langsung di callback auth.
  setTimeout(async () => {
    await muatIzin();
    await muatData();
  }, 0);
});

perbaruiSesi();
