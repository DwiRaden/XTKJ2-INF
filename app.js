
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

const NAMA_KATEGORI = {
  tugas: "Tugas",
  seragam: "Seragam",
  jadwal: "Jadwal & Kegiatan",
  piket: "Piket",
  report_taruna: "Laporan Taruna"
};

const DAFTAR_LIST = {
  tugas: "tugas-list",
  seragam: "seragam-list",
  jadwal: "jadwal-list",
  piket: "piket-list",
  report_taruna: "report_taruna-list"
};

const $ = (id) => document.getElementById(id);

function formatTanggal(tanggal) {
  if (!tanggal) return "Tanggal belum ditentukan";

  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tanggalLokal = new Date(tahun, bulan - 1, hari);

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(tanggalLokal);
}

function buatElemen(tag, className, teks) {
  const elemen = document.createElement(tag);

  if (className) elemen.className = className;
  if (teks !== undefined) elemen.textContent = teks;

  return elemen;
}

function bacaDetailJadwal(isi = "") {
  const hasil = {
    tiba: "",
    mulai: "",
    catatan: ""
  };

  for (const baris of isi.split("\n")) {
    const cocok = baris.match(
      /^\s*(tiba|wajib tiba|jam wajib tiba|mulai|jam mulai|jam kegiatan|catatan)\s*:\s*(.*)$/i
    );

    if (!cocok) continue;

    const kunci = cocok[1].toLowerCase();
    const nilai = cocok[2].trim();

    if (["tiba", "wajib tiba", "jam wajib tiba"].includes(kunci)) {
      hasil.tiba = nilai;
    } else if (["mulai", "jam mulai", "jam kegiatan"].includes(kunci)) {
      hasil.mulai = nilai;
    } else if (kunci === "catatan") {
      hasil.catatan = nilai;
    }
  }

  if (!hasil.tiba && !hasil.mulai && !hasil.catatan) {
    hasil.catatan = isi.trim();
  }

  return hasil;
}

function tampilkanKosong(container, pesan) {
  container.replaceChildren(
    buatElemen("p", "empty-state", pesan)
  );
}

function tampilkanInformasi(container, item) {
  const kartu = buatElemen("article", "data-item");
  kartu.append(
    buatElemen("h3", "", item.judul || "Tanpa judul")
  );

  if (item.kategori === "jadwal") {
    const detail = bacaDetailJadwal(item.isi || "");

    kartu.append(
      buatElemen("p", "data-date", formatTanggal(item.tanggal))
    );

    if (detail.tiba) {
      kartu.append(
        buatElemen("p", "data-detail", `Wajib tiba: ${detail.tiba}`)
      );
    }

    if (detail.mulai) {
      kartu.append(
        buatElemen("p", "data-detail", `Kegiatan mulai: ${detail.mulai}`)
      );
    }

    if (detail.catatan) {
      kartu.append(
        buatElemen("p", "data-description", detail.catatan)
      );
    }

    if (!detail.tiba && !detail.mulai && !detail.catatan) {
      kartu.append(
        buatElemen("p", "data-description", "Detail kegiatan belum diisi.")
      );
    }
  } else {
    if (item.tanggal) {
      kartu.append(
        buatElemen("p", "data-date", formatTanggal(item.tanggal))
      );
    }

    if (item.isi) {
      kartu.append(
        buatElemen("p", "data-description", item.isi)
      );
    }
  }

  container.append(kartu);
}

async function ambilInformasi(kategori = null) {
  let query = supabaseClient
    .from("kelas_info")
    .select("*");

  if (kategori) {
    query = query.eq("kategori", kategori);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

function urutkanInformasi(data, kategori) {
  return [...data].sort((a, b) => {
    if (kategori === "jadwal") {
      const tanggalA = a.tanggal || "9999-12-31";
      const tanggalB = b.tanggal || "9999-12-31";

      if (tanggalA !== tanggalB) {
        return tanggalA.localeCompare(tanggalB);
      }
    }

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function tampilkanKategori(data, kategori) {
  const container = $(DAFTAR_LIST[kategori]);
  if (!container) return;

  container.replaceChildren();

  const daftar = urutkanInformasi(data, kategori);

  if (daftar.length === 0) {
    tampilkanKosong(
      container,
      kategori === "jadwal"
        ? "Belum ada jadwal atau kegiatan."
        : `Belum ada informasi ${NAMA_KATEGORI[kategori].toLowerCase()}.`
    );
    return;
  }

  daftar.forEach((item) => tampilkanInformasi(container, item));
}

function tampilkanDashboard(data) {
  for (const kategori of KATEGORI) {
    const jumlah = data.filter(
      (item) => item.kategori === kategori
    ).length;

    const idJumlah = `count-${kategori.replace("_taruna", "")}`;
    const elemen = $(idJumlah);

    if (elemen) elemen.textContent = jumlah;
  }

  const container = $("dashboard-list");
  if (!container) return;

  container.replaceChildren();

  const terbaru = [...data]
    .sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 5);

  if (terbaru.length === 0) {
    tampilkanKosong(container, "Belum ada informasi dari kelas.");
    return;
  }

  terbaru.forEach((item) => {
    const kartu = buatElemen("article", "data-item");

    kartu.append(
      buatElemen("p", "data-date", NAMA_KATEGORI[item.kategori] || item.kategori),
      buatElemen("h3", "", item.judul || "Tanpa judul")
    );

    if (item.kategori === "jadwal" && item.tanggal) {
      kartu.append(
        buatElemen("p", "data-description", formatTanggal(item.tanggal))
      );
    } else if (item.isi) {
      kartu.append(
        buatElemen("p", "data-description", item.isi)
      );
    }

    container.append(kartu);
  });
}

async function muatWebsite() {
  const status = $("status-message");

  if (status) status.textContent = "Memuat informasi kelas...";

  try {
    const data = await ambilInformasi();

    tampilkanDashboard(data);

    for (const kategori of KATEGORI) {
      tampilkanKategori(
        data.filter((item) => item.kategori === kategori),
        kategori
      );
    }

    if (status) {
      status.textContent = "Informasi kelas berhasil dimuat.";
    }
  } catch (error) {
    console.error("Gagal memuat informasi:", error);

    if (status) {
      status.textContent =
        "Gagal memuat informasi. Periksa koneksi dan pengaturan Supabase.";
    }
  }
}

window.tesSupabase = muatWebsite;

muatWebsite();
