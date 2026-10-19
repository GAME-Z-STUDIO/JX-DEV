// JX-IDLE Consumables Database (Thuốc, Phù & Tiêu Hao)
window.JX = window.JX || {};
window.JX.consumables = {
  hp_small: { id: "hp_small", n: "Tiểu Hoàn Đan", cat: "hp", val: 200, dur: 5, ic: "img/ep/hp_s.png", d: "Hồi phục 200 sinh lực trong 5 giây." },
  hp_medium: { id: "hp_medium", n: "Trung Hoàn Đan", cat: "hp", val: 500, dur: 5, ic: "img/ep/hp_m.png", d: "Hồi phục 500 sinh lực trong 5 giây." },
  hp_large: { id: "hp_large", n: "Đại Hoàn Đan", cat: "hp", val: 1200, dur: 5, ic: "img/ep/hp_l.png", d: "Hồi phục 1200 sinh lực trong 5 giây." },
  mp_small: { id: "mp_small", n: "Ngũ Hoa Ngọc Lộ Hoàn (Tiểu)", cat: "mp", val: 150, dur: 5, ic: "img/ep/mp_s.png", d: "Hồi phục 150 nội lực trong 5 giây." },
  mp_medium: { id: "mp_medium", n: "Ngũ Hoa Ngọc Lộ Hoàn (Trung)", cat: "mp", val: 400, dur: 5, ic: "img/ep/mp_m.png", d: "Hồi phục 400 nội lực trong 5 giây." },
  mp_large: { id: "mp_large", n: "Ngũ Hoa Ngọc Lộ Hoàn (Đại)", cat: "mp", val: 1000, dur: 5, ic: "img/ep/mp_l.png", d: "Hồi phục 1000 nội lực trong 5 giây." },
  tp: { id: "tp", n: "Thổ Địa Phù", cat: "teleport", cd: 15, ic: "img/ep/tp.png", d: "Truyền tống tức thời về khu vực an toàn gần nhất." },
  tt: { id: "tt", n: "Tiên Thảo Lộ", cat: "buff_exp", rate: 0.5, dur: 60, knb: 2, ic: "img/ep/tt.png", d: "+50% kinh nghiệm trong 60 phút (cộng dồn thời gian)." },
  ttsp: { id: "ttsp", n: "Tiên Thảo Lộ Đặc Biệt", cat: "buff_exp", rate: 1.0, dur: 480, knb: 0, ic: "img/ep/ttsp.png", d: "+100% kinh nghiệm trong 8 giờ (cộng dồn với Tiên Thảo Lộ = +150%)." },
  tsbl: { id: "tsbl", n: "Thiên Sơn Bảo Lộ", cat: "buff_luck", val: 10, dur: 60, knb: 1, ic: "img/ep/tsbl.png", d: "+10 may mắn trong 60 phút." },
  qht: { id: "qht", n: "Quế Hoa Tửu", cat: "buff_luck", val: 20, dur: 60, knb: 2, ic: "img/ep/qht.png", d: "+20 may mắn trong 60 phút, +10% tỉ lệ rơi đồ." },
  bch: { id: "bch", n: "Bạch Câu Hoàn", cat: "offline", hrs: 8, knb: 3, ic: "img/ep/bch.png", d: "Ủy thác rời mạng: 8 giờ kế tiếp nhận 100% tốc độ treo máy." },
  hb: { id: "hb", n: "Hồng Bao", cat: "gift", ic: "img/ep/hb.png", d: "Mở nhận ngẫu nhiên 1 – 1000 vạn lượng." },
  dhb: { id: "dhb", n: "Đại Hồng Bao", cat: "gift", ic: "img/ep/dhb.png", d: "Mở nhận ngẫu nhiên 100 – 1000 Kim Nguyên Bảo." },
  fireworks: { id: "fireworks", n: "Pháo Hoa", cat: "fx", ic: "img/ep/fw.png", d: "Bắn pháo hoa rực rỡ chúc mừng hào kiệt giang hồ." }
};
