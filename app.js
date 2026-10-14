
"use strict";

/*
 * KELAS KITA — X TKJ 2
 * Versi lokal: data tersimpan di browser menggunakan localStorage.
 * Belum terhubung ke Supabase atau sistem login sungguhan.
 */

const STORAGE_KEY = "kelasKitaXTKJ2_v1";

const DAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

const DEFAULT_DATA = {
  tugas: [],
  seragam: {
    judul: "Informasi Seragam",
    hari: "",
    pakaian: "",
    atribut: "",
    catatan: ""
  },
  jadwal: [],
  piket: [],
  taruna: []
};

let data = loadData();
let editing = null;
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(DEFAULT_DATA);
    }

    const parsed = JSON.parse(saved);

    return {
      tugas: Array.isArray(parsed.tugas) ? parsed.tugas : [],
      seragam: {
        ...DEFAULT_DATA.seragam,
        ...(parsed.seragam || {})
      },
      jadwal: Array.isArray(parsed.jadwal) ? parsed.jadwal : [],
      piket: Array.isArray(parsed.piket) ? parsed.piket : [],
      taruna: Array.isArray(parsed.taruna) ? parsed.taruna : []
    };
  } catch (error) {
    console.error("Gagal membaca data:", error);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showToast("Data gagal disimpan. Periksa penyimpanan browser.");
    return false;
  }
}

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* =========================
   NAVIGASI
========================= */

function openPage(pageName) {
  const target = $(`#page-${pageName}`);

  if (!target) return;

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach((button) => {
    const active = button.dataset.page === pageName;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const activeButton = $(`.nav-link[data-page="${pageName}"]`);

  $("#currentPage").textContent =
    activeButton?.textContent.trim() || "Dashboard";

  $("#sidebar").classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================
   RENDER DASHBOARD
========================= */

function renderDashboard() {
  $("#countTugas").textContent = data.tugas.length;
  $("#countJadwal").textContent = data.jadwal.length;
  $("#countPiket").textContent = data.piket.length;
  $("#countTaruna").textContent = data.taruna.length;

  const recent = [];

  data.tugas.slice().reverse().slice(0, 3).forEach((item) => {
    recent.push({
      judul: item.mapel || "Tugas",
      detail: item.judul || "Tanpa judul",
      tanggal: item.tanggal || ""
    });
  });

  if (data.seragam.pakaian || data.seragam.atribut) {
    recent.push({
      judul: "Informasi seragam",
      detail: data.seragam.pakaian || "Informasi atribut tersedia",
      tanggal: data.seragam.hari || ""
    });
  }

  const container = $("#recentInfo");

  if (!recent.length) {
    container.className = "empty-state";
    container.innerHTML = `
      <div class="empty-icon">📭</div>
      <strong>Belum ada informasi</strong>
      <p>Informasi yang ditambahkan akan muncul di sini.</p>
    `;
    return;
  }

  container.className = "item-list";

  container.innerHTML = recent.slice(0, 4).map((item) => `
    <article class="data-item">
      <div class="data-item-main">
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(item.detail)}</p>
        ${item.tanggal
          ? `<small>${escapeHTML(item.tanggal)}</small>`
          : ""}
      </div>
    </article>
  `).join("");
}

/* =========================
   RENDER TUGAS
========================= */

function renderTugas() {
  const search = ($("#searchTugas").value || "").toLowerCase().trim();
  const filter = $("#filterTugas").value;

  const items = data.tugas.filter((item) => {
    const searchable = [
      item.mapel,
      item.judul,
      item.detail,
      item.tanggal
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(search);

    const matchesFilter =
      filter === "semua" ||
      (filter === "ada" && !item.selesai) ||
      (filter === "selesai" && item.selesai);

    return matchesSearch && matchesFilter;
  });

  const container = $("#listTugas");

  if (!items.length) {
    container.innerHTML = emptyMessage(
      "📚",
      "Belum ada tugas",
      "Tugas yang dicatat akan muncul di sini."
    );
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="data-item">
      <div class="data-item-main">
        <span class="status-badge ${item.selesai ? "done" : "warning"}">
          ${item.selesai ? "Selesai" : "Ada tugas"}
        </span>
        <h3 style="margin-top:9px">${escapeHTML(item.mapel)}</h3>
        <p><strong>${escapeHTML(item.judul)}</strong></p>
        ${item.detail
          ? `<p>${escapeHTML(item.detail)}</p>`
          : ""}
        <small>
          Pengumpulan: ${escapeHTML(item.tanggal || "Belum ditentukan")}
        </small>
      </div>
      ${adminActions("tugas", item.id, item.selesai ? "Buka lagi" : "Tandai selesai")}
    </article>
  `).join("");
}

/* =========================
   RENDER SERAGAM
========================= */

function renderSeragam() {
  const item = data.seragam;

  $("#seragamContent").innerHTML = `
    <article class="uniform-card">
      <span class="eyebrow">PENGUMUMAN SERAGAM</span>
      <h2>${escapeHTML(item.judul || "Informasi Seragam")}</h2>
      <p>${escapeHTML(item.catatan || "Belum ada catatan tambahan.")}</p>

      <div class="uniform-details">
        <div class="uniform-detail">
          <span>Hari berlaku</span>
          <strong>${escapeHTML(item.hari || "Belum ditentukan")}</strong>
        </div>
        <div class="uniform-detail">
          <span>Seragam</span>
          <strong>${escapeHTML(item.pakaian || "Belum ditentukan")}</strong>
        </div>
        <div class="uniform-detail">
          <span>Atribut</span>
          <strong>${escapeHTML(item.atribut || "Belum ditentukan")}</strong>
        </div>
        <div class="uniform-detail">
          <span>Pengingat</span>
          <strong>Periksa kembali kelengkapan sebelum berangkat.</strong>
        </div>
      </div>
    </article>
  `;
}

/* =========================
   RENDER JADWAL
========================= */

function renderJadwal() {
  const filter = $("#filterHari").value;

  const items = data.jadwal
    .filter((item) => filter === "semua" || item.hari === filter)
    .slice()
    .sort((a, b) => {
      const dayDifference = DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari);

      if (dayDifference !== 0) return dayDifference;

      return (a.mulai || "").localeCompare(b.mulai || "");
    });

  const container = $("#listJadwal");

  if (!items.length) {
    container.innerHTML = emptyMessage(
      "🗓️",
      "Jadwal belum tersedia",
      "Tambahkan mata pelajaran dan hari melalui menu pengurus."
    );
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="data-item">
      <div class="data-item-main">
        <span class="status-badge">${escapeHTML(item.hari)}</span>
        <h3 style="margin-top:9px">${escapeHTML(item.mapel)}</h3>
        <p>
          ${escapeHTML(item.mulai || "--:--")}
          – ${escapeHTML(item.selesai || "--:--")}
        </p>
        ${item.guru
          ? `<small>Guru: ${escapeHTML(item.guru)}</small>`
          : ""}
      </div>
      ${adminActions("jadwal", item.id)}
    </article>
  `).join("");
}

/* =========================
   RENDER PIKET
========================= */

function renderPiket() {
  const items = data.piket
    .slice()
    .sort((a, b) => DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari));

  const container = $("#listPiket");

  if (!items.length) {
    container.innerHTML = emptyMessage(
      "🧹",
      "Jadwal piket belum tersedia",
      "Tambahkan hari piket dan nama anggota kelompok."
    );
    return;
  }

  container.innerHTML = items.map((item) => {
    const names = (item.anggota || "")
      .split(/[,;\n]/)
      .map((name) => name.trim())
      .filter(Boolean);

    return `
      <article class="data-item">
        <div class="data-item-main">
          <span class="status-badge">${escapeHTML(item.hari)}</span>
          <h3 style="margin-top:9px">
            ${escapeHTML(item.kelompok || "Kelompok piket")}
          </h3>
          <p>Anggota: ${escapeHTML(names.join(", ") || "Belum ada anggota")}</p>
          ${item.catatan
            ? `<small>${escapeHTML(item.catatan)}</small>`
            : ""}
        </div>
        ${adminActions("piket", item.id)}
      </article>
    `;
  }).join("");
}

/* =========================
   RENDER TARUNA
========================= */

function renderTaruna() {
  const search = ($("#searchTaruna").value || "").toLowerCase().trim();

  const items = data.taruna
    .filter((item) => item.nama.toLowerCase().includes(search))
    .slice()
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const container = $("#listTaruna");

  if (!items.length) {
    container.innerHTML = emptyMessage(
      "♙",
      "Nama taruna belum tersedia",
      "Nama yang ditambahkan akan muncul di sini."
    );
    return;
  }

  container.innerHTML = items.map((item, index) => `
    <article class="data-item">
      <div class="data-item-main">
        <h3>${index + 1}. ${escapeHTML(item.nama)}</h3>
        ${item.catatan
          ? `<p>${escapeHTML(item.catatan)}</p>`
          : ""}
      </div>
      ${adminActions("taruna", item.id)}
    </article>
  `).join("");
}

function emptyMessage(icon, title, description) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
    </div>
  `;
}

function adminActions(type, id, toggleLabel = "") {
  if (!document.body.classList.contains("demo-admin")) {
    return "";
  }

  return `
    <div class="item-actions">
      ${toggleLabel
        ? `<button data-action="toggle-tugas" data-id="${escapeHTML(id)}">${escapeHTML(toggleLabel)}</button>`
        : ""}
      <button data-action="edit-${type}" data-id="${escapeHTML(id)}">Edit</button>
      <button class="delete-button" data-action="delete-${type}" data-id="${escapeHTML(id)}">Hapus</button>
    </div>
  `;
}

function renderAll() {
  renderDashboard();
  renderTugas();
  renderSeragam();
  renderJadwal();
  renderPiket();
  renderTaruna();
}

/* =========================
   FORMULIR
========================= */

function field(name, label, value = "", options = {}) {
  const id = `field-${name}`;
  const required = options.required ? "required" : "";
  const placeholder = escapeHTML(options.placeholder || "");
  const safeValue = escapeHTML(value);
  const type = options.type || "text";

  if (options.select) {
    const choices = options.select.map((choice) => `
      <option value="${escapeHTML(choice)}"
        ${choice === value ? "selected" : ""}>
        ${escapeHTML(choice)}
      </option>
    `).join("");

    return `
      <div class="form-group">
        <label for="${id}">${escapeHTML(label)}</label>
        <select id="${id}" name="${name}" ${required}>
          ${choices}
        </select>
      </div>
    `;
  }

  if (options.textarea) {
    return `
      <div class="form-group">
        <label for="${id}">${escapeHTML(label)}</label>
        <textarea id="${id}" name="${name}"
          placeholder="${placeholder}" ${required}>${safeValue}</textarea>
      </div>
    `;
  }

  return `
    <div class="form-group">
      <label for="${id}">${escapeHTML(label)}</label>
      <input id="${id}" name="${name}" type="${type}"
        value="${safeValue}" placeholder="${placeholder}" ${required}>
    </div>
  `;
}

function formDefinition(type, item = {}) {
  const definitions = {
    tugas: {
      title: item.id ? "Edit tugas" : "Tambah tugas",
      fields: [
        field("mapel", "Mata pelajaran", item.mapel, {
          required: true,
          placeholder: "Contoh: Dasar-Dasar TJKT"
        }),
        field("judul", "Nama tugas", item.judul, {
          required: true,
          placeholder: "Contoh: Rangkuman materi"
        }),
        field("detail", "Detail tugas", item.detail, {
          textarea: true,
          placeholder: "Tuliskan instruksi tugas..."
        }),
        field("tanggal", "Batas pengumpulan", item.tanggal, {
          type: "date"
        })
      ]
    },

    seragam: {
      title: "Atur seragam & atribut",
      fields: [
        field("judul", "Judul informasi", item.judul),
        field("hari", "Hari berlaku", item.hari, {
          select: ["", ...DAYS]
        }),
        field("pakaian", "Jenis seragam", item.pakaian, {
          required: true,
          placeholder: "Contoh: Putih abu-abu"
        }),
        field("atribut", "Atribut yang dibawa", item.atribut, {
          textarea: true,
          placeholder: "Contoh: Dasi, ikat pinggang..."
        }),
        field("catatan", "Catatan tambahan", item.catatan, {
          textarea: true
        })
      ]
    },

    jadwal: {
      title: item.id ? "Edit jadwal" : "Tambah jadwal",
      fields: [
        field("hari", "Hari", item.hari, {
          required: true,
          select: DAYS
        }),
        field("mapel", "Mata pelajaran", item.mapel, {
          required: true
        }),
        field("mulai", "Jam mulai", item.mulai, {
          type: "time"
        }),
        field("selesai", "Jam selesai", item.selesai, {
          type: "time"
        }),
        field("guru", "Nama guru (opsional)", item.guru)
      ]
    },

    piket: {
      title: item.id ? "Edit jadwal piket" : "Tambah jadwal piket",
      fields: [
        field("hari", "Hari piket", item.hari, {
          required: true,
          select: DAYS
        }),
        field("kelompok", "Nama kelompok", item.kelompok, {
          required: true,
          placeholder: "Contoh: Kelompok 1"
        }),
        field("anggota", "Nama anggota", item.anggota, {
          required: true,
          textarea: true,
          placeholder: "Pisahkan nama dengan koma atau baris baru."
        }),
        field("catatan", "Catatan tambahan", item.catatan, {
          textarea: true
        })
      ]
    },

    taruna: {
      title: item.id ? "Edit nama taruna" : "Tambah nama taruna",
      fields: [
        field("nama", "Nama taruna", item.nama, {
          required: true,
          placeholder: "Masukkan nama lengkap"
        }),
        field("catatan", "Catatan (opsional)", item.catatan, {
          textarea: true
        })
      ]
    }
  };

  return definitions[type];
}

function openForm(type, id = null) {
  if (!document.body.classList.contains("demo-admin")) {
    showToast("Mode pengurus belum diaktifkan.");
    return;
  }

  let item = {};

  if (type === "seragam") {
    item = { ...data.seragam };
  } else if (id) {
    const found = data[type]?.find((entry) => entry.id === id);

    if (!found) {
      showToast("Data tidak ditemukan.");
      return;
    }

    item = { ...found };
  }

  editing = {
    type,
    id: id || null
  };

  const definition = formDefinition(type, item);

  if (!definition) {
    showToast("Formulir tidak ditemukan.");
    return;
  }

  $("#modalTitle").textContent = definition.title;
  $("#formFields").innerHTML = definition.fields.join("");

  $("#modal").classList.add("open");
  $("#modal").setAttribute("aria-hidden", "false");

  const firstInput = $("#formFields input, #formFields select, #formFields textarea");
  firstInput?.focus();
}

function closeModal() {
  $("#modal").classList.remove("open");
  $("#modal").setAttribute("aria-hidden", "true");
  $("#dataForm").reset();
  $("#formFields").innerHTML = "";
  editing = null;
}

function saveForm(event) {
  event.preventDefault();

  if (!editing) return;

  if (!document.body.classList.contains("demo-admin")) {
    showToast("Mode pengurus belum aktif.");
    closeModal();
    return;
  }

  const formData = new FormData(event.currentTarget);
  const values = Object.fromEntries(formData.entries());

  const { type, id } = editing;

  if (type === "seragam") {
    data.seragam = {
      ...data.seragam,
      ...values
    };
  } else {
    const collection = data[type];

    if (!Array.isArray(collection)) {
      showToast("Jenis data tidak valid.");
      return;
    }

    if (id) {
      const index = collection.findIndex((item) => item.id === id);

      if (index === -1) {
        showToast("Data tidak ditemukan.");
        return;
      }

      collection[index] = {
        ...collection[index],
        ...values
      };
    } else {
      collection.push({
        id: createId(),
        ...values,
        ...(type === "tugas" ? { selesai: false } : {})
      });
    }
  }

  if (!saveData()) return;

  closeModal();
  renderAll();
  showToast("Informasi berhasil disimpan.");
}

/* =========================
   HAPUS DAN UBAH STATUS
========================= */

function deleteItem(type, id) {
  if (!document.body.classList.contains("demo-admin")) {
    showToast("Mode pengurus belum aktif.");
    return;
  }

  if (type === "seragam") {
    showToast("Informasi seragam tidak bisa dihapus. Edit saja.");
    return;
  }

  const collection = data[type];

  if (!Array.isArray(collection)) return;

  const item = collection.find((entry) => entry.id === id);

  if (!item) {
    showToast("Data tidak ditemukan.");
    return;
  }

  const label =
    item.judul ||
    item.mapel ||
    item.nama ||
    item.kelompok ||
    "informasi ini";

  if (!confirm(`Yakin ingin menghapus "${label}"?`)) {
    return;
  }

  data[type] = collection.filter((entry) => entry.id !== id);

  if (!saveData()) return;

  renderAll();
  showToast("Data berhasil dihapus.");
}

function toggleTugas(id) {
  if (!document.body.classList.contains("demo-admin")) {
    showToast("Mode pengurus belum aktif.");
    return;
  }

  const item = data.tugas.find((entry) => entry.id === id);

  if (!item) return;

  item.selesai = !item.selesai;

  if (!saveData()) return;

  renderAll();

  showToast(
    item.selesai
      ? "Tugas ditandai selesai."
      : "Status tugas dikembalikan."
  );
}

/* =========================
   EVENT LISTENERS
========================= */

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.open);
  });
});

$("#menuToggle").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$("#searchTugas").addEventListener("input", renderTugas);
$("#filterTugas").addEventListener("change", renderTugas);
$("#filterHari").addEventListener("change", renderJadwal);
$("#searchTaruna").addEventListener("input", renderTaruna);

$("#dataForm").addEventListener("submit", saveForm);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "close-modal") {
    closeModal();
    return;
  }

  if (action.startsWith("add-")) {
    openForm(action.slice(4));
    return;
  }

  if (action.startsWith("edit-")) {
    openForm(action.slice(5), id || null);
    return;
  }

  if (action.startsWith("delete-")) {
    deleteItem(action.slice(7), id);
    return;
  }

  if (action === "toggle-tugas") {
    toggleTugas(id);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    $("#sidebar").classList.remove("open");
  }
});

/* =========================
   MODE DEMO PENGURUS
========================= */

/*
 * Untuk menguji formulir pada versi lokal:
 * buka DevTools Console, lalu jalankan:
 *
 * document.body.classList.add("demo-admin")
 *
 * Ini BUKAN login sungguhan dan tidak aman untuk website publik.
 */

renderAll();
openPage("dashboard");
