exports.handler = async (event) => {
  const json = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from, BERBER_WHATSAPP: to } = process.env;
  const clean = (s, n) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);

  async function gonder(body) {
    const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(sid + ":" + token).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString()
    });
    let d = {};
    try { d = await res.json(); } catch (e) {}
    return { status: res.status, code: d.code, message: d.message };
  }

  // GEÇİCİ TEST: tarayıcıdan ...randevu?test=1 açınca çalışır
  if (event.httpMethod === "GET") {
    if (!event.queryStringParameters || !event.queryStringParameters.test) return json(200, { ok: false });
    const env = { sid: !!sid, token: !!token, from: from || null, to: to || null };
    if (!sid || !token || !from || !to) return json(200, { ok: false, env });
    try {
      const r = await gonder("Test mesaji");
      return json(200, { ok: r.status < 300, env, twilio: r });
    } catch (e) {
      return json(200, { ok: false, env, hata: String(e) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { ok: false });
  let d;
  try { d = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { ok: false }); }
  if (d.website) return json(200, { ok: true });
  const isim = clean(d.isim, 60), tel = clean(d.telefon, 20), hizmet = clean(d.hizmet, 60),
        tarih = clean(d.tarih, 60), saat = clean(d.saat, 5);
  if (isim.length < 2 || !hizmet || !tarih || !/^\d{2}:\d{2}$/.test(saat)) return json(400, { ok: false });
  if (!sid || !token || !from || !to) return json(500, { ok: false });

  const body = "Yeni randevu talebi\n\nAd: " + isim + "\nHizmet: " + hizmet + "\nTarih: " + tarih + "\nSaat: " + saat + (tel ? "\nTelefon: " + tel : "");
  try {
    const r = await gonder(body);
    if (r.status >= 300) { console.error("Twilio hata", r); return json(502, { ok: false }); }
    return json(200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(502, { ok: false });
  }
};
