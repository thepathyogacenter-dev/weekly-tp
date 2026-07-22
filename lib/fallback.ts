/**
 * Salinan tab "Fix Schedule" per 23 Juli 2026.
 * Dipakai kalau SCHEDULE_CSV_URL kosong atau Sheet-nya nggak bisa diambil.
 * Struktur harus sama persis dengan Sheet: baris 1 hari, baris 2 ruang.
 */
export const FALLBACK_ROWS: string[][] = [
  ["MONDAY","","","TUESDAY","","","WEDNESDAY","","","THURSDAY","","","FRIDAY","","","SATURDAY","","","SUNDAY","",""],
  ["OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3","OUTDOOR","INDOOR","SHALA 3"],
  ["Sunrise Flow. Meli (7.15 - 8.15)","","","Sunrise Flow. Kemie (7.15 - 8.15)","","","Sunrise flow. Theresa (7.15 - 8.15)","","","Sunrise flow. Meli (7.15 - 8.15)","","","Sunrise flow. Theresa (7.15 - 8.15)","","","Sunrise flow. Val (7.15 - 8.15)","","","Sunrise flow. Meli (7.15 - 8.15)","",""],
  ["Power flow. Val (8.30 - 9.45)","","","Power Hatha. Max (8.30 - 9.45)","","Ashtanga Mysore Style. Rohil (8 - 9.30)","Power Flow. Doris (8.30 - 9.45)","","Yogilates. Ivana (8 - 9.15)","Power flow. Doris (8.30 - 9.45)","","Ashtanga Mysore Style. Rohil (8 - 9.30)","Power Flow. Michelle (8.30 - 9.45)","","Yogilates. Ivana (8 - 9.15)","Hatha with Hands On Adjustment. Max (8.30 - 9.45)","","","Sunrise Hatha. Diana (8.30 - 9.45)","",""],
  ["Vinyasa. Phil (10.15 - 11.45)","","Primal Moves. Vaughan (10 - 11)","Vinyasa. Helena (10.15 - 11.45)","","Body Repair. Meli (10 - 12)","Vinyasa. Phil (10.15 - 11.45)","","Primal Moves. Vaughan (10-11)","MIA - Vinyasa. Theresa (10.15 - 11.45)","","","Vinyasa. Rohil (10.15 - 11.45)","","Primal Moves. Vaughan (10 - 11)","Vinyasa. Rohil (10.15 - 11.45)","","","Vinyasa. Helena (10.15 - 11.45)","",""],
  ["","","Breathwork & Meditation. AMK (12 - 1)","","","Restoration Breathwork. Fawn (12 - 1)","","","Breathwork & Meditation. Doris (12 - 1)","","","Restoration Breathwork. Nuna (12 - 1)","","","Breathwork & Meditation. Katie (12 - 1)","Beginner Flow. Tao (12 - 1)","","","","",""],
  ["","","Restorative. Tao (1.30 - 2.45)","","","Somatic Activation. Chelsi (1.30 - 3)","","","Restorative. Val (1.30 - 2.45)","","","Inner Child Healing. Chelsi (1.30 - 3)","","","","","","","","",""],
  ["Jivamukti. Helena (4 - 5.15)","","Rewire. Nora (4 - 5)","Vinyasa. Sasya (4 - 5.15)","","Chakra Yoga. Mariia (4 - 5.15)","Jiva Mukti. Helena (4 - 5.15)","","NS Regulation. Tao (4 - 5.15)","Vinyasa. Andrei (4 - 5.15)","","Body Repair. Meli (4 - 6)","Vinyasa. Andrei (4 - 5.15)","","Restorative. Sasya (4 - 5.15)","Soft flow & Yin. Val (4 - 5.15)","","","Yin Yoga. Sasya (4 - 5.30)","",""],
  ["Yin Yoga. Max (5.30 - 6.45)","","Mindfullness Meditation. Mariia (5.30 - 6.30)","MyoYin. Marlen (5.30 - 6.45)","","Trataka Meditation to Yoga Nidra. Val (5.30 - 6.30)","Yin Yoga. Tao (5.30 - 6.45)","Rest, Reset, Reconnect. Chelsi (6-7)","Mindfullness Meditation. Mariia (5.30 - 6.30)","Yin Yoga. Theresa (5.30 - 6.45)","","","MyoYin. Meli (5.30 - 6.45)","","","","","","","Blissful Kirtan. Diana, Theresa, Helena (every 2nd week of the month)",""],
  ["","","","","","","","","","","Men's Circle / Women's Circle (7 - 8.30)","Tibetan Sound Healing. Val / Crystal Bowl Sound Healing. Komal (7 - 8)","","","","","","","","",""],
];

/**
 * Foto guru. Key harus sama persis dengan nama di Sheet.
 * Kosongkan untuk pakai lingkaran inisial.
 * Kalau TEACHERS_CSV_URL diisi, data dari sana menimpa yang di sini.
 */
export const TEACHER_PHOTOS: Record<string, string> = {
  // Meli: "https://cdn.prod.website-files.com/.../meli.jpg",
  // Theresa: "https://cdn.prod.website-files.com/.../theresa.jpg",
};
