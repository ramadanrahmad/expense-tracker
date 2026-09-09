import re
import json
from datetime import datetime, timedelta

def extract_transaction_regex(text: str) -> dict:
    """
    Contoh implementasi dasar menggunakan Regular Expression (Rule-based).
    Cocok untuk input yang polanya mudah ditebak.
    Contoh: "kemarin saya membeli nasi goreng 30 ribu"
    """
    text = text.lower()
    
    # 1. Ekstrak Tanggal (Logika Sederhana)
    date = datetime.now()
    if "kemarin" in text or "h-1" in text:
        date = date - timedelta(days=1)
    elif "hari ini" in text:
        pass # Tetap hari ini
        
    date_str = date.strftime("%Y-%m-%d")
    
    # 2. Ekstrak Nominal
    # Mencari pola angka diikuti dengan kata 'ribu' atau 'juta' (opsional)
    # Contoh menangkap: "30 ribu", "50000", "1.5 juta"
    amount = 0
    amount_match = re.search(r'(\d+(?:\.\d+)?)\s*(ribu|juta)?', text)
    if amount_match:
        val = float(amount_match.group(1).replace('.', ''))
        multiplier = amount_match.group(2)
        
        if multiplier == 'ribu':
            amount = int(val * 1000)
        elif multiplier == 'juta':
            amount = int(val * 1000000)
        else:
            amount = int(val)

    # 3. Ekstrak Kategori (Sangat sederhana menggunakan keyword matching)
    category = "Lainnya"
    makanan_keywords = ["nasi goreng", "makan", "minum", "kopi", "bakso", "roti"]
    transport_keywords = ["gojek", "grab", "bensin", "parkir", "tol"]
    
    for kw in makanan_keywords:
        if kw in text:
            category = "Makanan"
            break
            
    for kw in transport_keywords:
        if kw in text:
            category = "Transportasi"
            break

    # Format akhir yang siap disimpan ke database
    return {
        "original_text": text,
        "date": date_str,
        "amount": amount,
        "category": category,
        "type": "expense", # Asumsi default pengeluaran
        "description": text # Bisa dipertajam lagi untuk mengambil deskripsi spesifik
    }

def extract_transaction_llm(text: str) -> dict:
    """
    Contoh rancangan (stub) jika Anda ingin menggunakan LLM (seperti Gemini/OpenAI).
    Pendekatan ini jauh lebih cerdas dan dapat menangani bahasa yang tidak terstruktur.
    """
    prompt = f"""
    Ekstrak informasi transaksi keuangan dari teks berikut.
    Teks: "{text}"
    
    Kembalikan dalam format JSON dengan kunci:
    - date (YYYY-MM-DD, asumsikan hari ini adalah {datetime.now().strftime('%Y-%m-%d')})
    - amount (angka integer)
    - category (Pilih salah satu: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Lainnya)
    - description (Ringkasan singkat apa yang dibeli)
    - type (income / expense)
    """
    
    # TODO: Panggil API LLM (misal: google.generativeai.generate_content) di sini
    # response = model.generate_content(prompt)
    # return json.loads(response.text)
    
    print("Fungsi LLM belum diimplementasikan. Gunakan model API pilihan Anda.")
    return {}

if __name__ == "__main__":
    # Test Contoh Pertama (Sesuai Prompt User)
    test_text_1 = "kemarin saya membeli nasi goreng 30 ribu"
    result_1 = extract_transaction_regex(test_text_1)
    
    print("--- Hasil Ekstraksi Regex ---")
    print(f"Input: {test_text_1}")
    print(json.dumps(result_1, indent=2))
    
    print("\n--- Test Ekstraksi Lainnya ---")
    test_text_2 = "isi bensin motor 20000 hari ini"
    result_2 = extract_transaction_regex(test_text_2)
    print(json.dumps(result_2, indent=2))
