
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

async function ambilInformasi(kategori = null) {
  let query = supabaseClient
    .from("kelas_info")
    .select("*")
    .order("created_at", { ascending: false });

  if (kategori) {
    query = query.eq("kategori", kategori);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Gagal mengambil informasi:", error.message);
    throw error;
  }

  return data;
}

async function tambahInformasi({
  kategori,
  judul,
  isi = "",
  tanggal = null
}) {
  if (!KATEGORI.includes(kategori)) {
    throw new Error("Kategori tidak valid.");
  }

  if (!judul || !judul.trim()) {
    throw new Error("Judul wajib diisi.");
  }

  const { data, error } = await supabaseClient
    .from("kelas_info")
    .insert({
      kategori,
      judul: judul.trim(),
      isi: isi.trim(),
      tanggal: tanggal || null
    })
    .select()
    .single();

  if (error) {
    console.error("Gagal menambahkan informasi:", error.message);
    throw error;
  }

  return data;
}

async function editInformasi(id, perubahan) {
  const dataUpdate = {};

  if (perubahan.kategori !== undefined) {
    if (!KATEGORI.includes(perubahan.kategori)) {
      throw new Error("Kategori tidak valid.");
    }
    dataUpdate.kategori = perubahan.kategori;
  }

  if (perubahan.judul !== undefined) {
    if (!perubahan.judul.trim()) {
      throw new Error("Judul wajib diisi.");
    }
    dataUpdate.judul = perubahan.judul.trim();
  }

  if (perubahan.isi !== undefined) {
    dataUpdate.isi = perubahan.isi.trim();
  }

  if (perubahan.tanggal !== undefined) {
    dataUpdate.tanggal = perubahan.tanggal || null;
  }

  dataUpdate.updated_at = new Date().toISOString();

  const { data, error } = await supabaseClient
    .from("kelas_info")
    .update(dataUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Gagal mengedit informasi:", error.message);
    throw error;
  }

  return data;
}

async function hapusInformasi(id) {
  const { error } = await supabaseClient
    .from("kelas_info")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Gagal menghapus informasi:", error.message);
    throw error;
  }

  return true;
}

async function tesSupabase() {
  try {
    const data = await ambilInformasi();
    console.log("Supabase berhasil terhubung!", data);
  } catch (error) {
    console.error("Tes Supabase gagal:", error.message);
  }
}

tesSupabase();
