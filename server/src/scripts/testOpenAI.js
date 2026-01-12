import OpenAI from 'openai';

// ANAHTARINI AŞAĞIDAKİ TIRNAKLARIN İÇİNE YAPIŞTIR
// Örnek: const apiKey = 'sk-proj-12345...';
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: apiKey });

async function main() {
  try {
    console.log("📡 A.L.I.E. ile bağlantı kuruluyor...");
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Are you active System?" }],
      model: "gpt-3.5-turbo",
    });

    console.log("✅ BAŞARILI! Cevap geldi:");
    console.log(completion.choices[0].message.content);
    
  } catch (error) {
    console.error("❌ HATA OLUŞTU:");
    console.error(error.message); // Hatanın ne olduğunu burada göreceğiz
    
    if (error.code === 'insufficient_quota') {
        console.log("⚠️ SONUÇ: Hesabında bakiye (kredi) yok. Simülasyon moduna geçmeliyiz.");
    }
  }
}

main();