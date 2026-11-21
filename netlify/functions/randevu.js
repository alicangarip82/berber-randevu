// Netlify Function: randevuyu Twilio ile berberin WhatsApp'ına gönderir.
// Gizli anahtarlar Netlify > Site settings > Environment variables içinde durur.
exports.handler = async (event) => {
  const json = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });
  if (event.httpMethod !== "POST") return json(405, { ok: false });
  let d;
  try { d = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { ok: false }); }
  if (d.website) return json(200, { ok: true }); // bot tuzağı
  const clean = (s, n) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const isim = clean(d.isim, 60), tel = clean(d.telefon, 20), hizmet = clean(d.hizmet, 60),
        tarih = clean(d.tarih, 60), saat = clean(d.saat, 5);
  if (isim.length < 2 || !hizmet || !tarih || !/^\d{2}:\d{2}$/.test(saat)) return json(400, { ok: false });

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from, BERBER_WHATSAPP: to } = process.env;
  if (!sid || !token || !from || !to) return json(500, { ok: false });

  const body = "Yeni randevu talebi\n\nAd: " + isim + "\nHizmet: " + hizmet + "\nTarih: " + tarih + "\nSaat: " + saat + (tel ? "\nTelefon: " + tel : "");
  const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(sid + ":" + token).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString()
  });
  if (!res.ok) { console.error("Twilio hata", res.status, await res.text()); return json(502, { ok: false }); }
  return json(200, { ok: true });
};
