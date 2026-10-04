import os
import re
from datetime import datetime, timedelta, timezone
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# Schema untuk LLM Structured Output
class ParsedTransaction(BaseModel):
    date: str = Field(description="Waktu transaksi format YYYY-MM-DDTHH:MM:SS. Jika jam tidak disebut, gunakan waktu saat ini sesuai yang diberikan.")
    amount: int = Field(description="Nominal dalam angka utuh positif tanpa titik koma (misal: 5000000)")
    category: str = Field(description="Kategori transaksi. Buat nama kategori secara dinamis dan spesifik (misal: 'Gaji', 'Uang Jajan', 'Bonus', 'Makanan', 'Transportasi') berdasarkan teks user.")
    type: str = Field(description="Tipe transaksi: 'income' atau 'expense'")
    description: str = Field(description="Deskripsi singkat yang jelas dan rapi dari teks asli")

class TransactionList(BaseModel):
    transactions: list[ParsedTransaction]

def parse_text_to_transaction(text: str, existing_categories: List[str] = None) -> List[dict]:
    """
    NLP parser for extracting transaction info.
    Sekarang bisa mengembalikan lebih dari 1 transaksi jika teks berupa kalimat majemuk.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key and api_key != "YOUR_API_KEY_HERE" and genai is not None:
        try:
            return _parse_with_llm(text, api_key, existing_categories)
        except Exception as e:
            print(f"LLM Parsing failed: {e}. Falling back to regex.")
            pass # Fall through to regex
            
    print("WARNING: Using basic regex fallback.")
    # Split text into clauses based on common separators
    clauses = re.split(r',\s*|\s+dan\s+|\s+sedangkan\s+|\s+sementara\s+|\s+terus\s+|\s+lalu\s+', text.lower())
    results = []
    for clause in clauses:
        clause = clause.strip()
        if not clause: continue
        res = _parse_with_regex(clause)
        if res:
            # We want original casing for description, so we do a quick hack
            # to capitalize the first letter of the clause
            res['description'] = clause.capitalize()
            results.append(res)
            
    return results

def _parse_with_llm(text: str, api_key: str, existing_categories: List[str] = None) -> List[dict]:
    client = genai.Client(api_key=api_key)
    today_date = datetime.now(timezone.utc)
    today_str = today_date.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    cat_str = ", ".join(existing_categories) if existing_categories else "Makanan & Minuman, Transportasi, Belanja, Tagihan & Utilitas, Kesehatan, Hiburan, Gaji, Uang Saku"
    
    prompt = f"""
    Kamu adalah asisten pencatat keuangan yang sangat cerdas.
    Tugasmu mengekstrak SEMUA kejadian transaksi dari teks user menjadi daftar transaksi terstruktur.
    
    Hari ini adalah tanggal: {today_str}.
    Jika user menyebutkan waktu seperti "kemarin", "hari ini", atau "2 hari yang lalu", hitung tanggal pastinya berdasarkan tanggal hari ini.
    
    DAFTAR KATEGORI YANG SUDAH ADA: {cat_str}.
    PENTING: 
    1. Selalu PRIORITASKAN memasukkan transaksi ke dalam salah satu KATEGORI YANG SUDAH ADA di atas. JANGAN membuat kategori baru yang bersinonim dengan daftar di atas.
    2. Perhatikan dengan teliti nominal gabungan. Contoh "8 juta 173 ribu" harus ditulis sebagai 8173000. Jangan potong angkanya!
    3. Jika user menyebutkan BANYAK transaksi terpisah dalam satu kalimat (misalnya "makan siang 50 ribu, isi bensin 30 ribu"), PECAH menjadi item transaksi yang terpisah di dalam array. JANGAN dijumlahkan menjadi satu transaksi gabungan.
    4. KONTEKS PENGHASILAN (INCOME) VS PENGELUARAN (EXPENSE): 
       - Jika teks mengisyaratkan "menambah", "mendapatkan uang", "diberi", "menerima", "gaji", "bonus", "uang jajan" (menerima uang), atau menyatakan kepemilikan uang seperti "uang saya di...", "saldo", "sisa uang", "ada uang", set `type` menjadi "income". 
       - Jika teks mengisyaratkan "mengurangi", "membeli", "membayar", "makan", "jajan" (menghabiskan uang), atau mengeluarkan uang, set `type` menjadi "expense". Jika teks membingungkan, asumsikan sebagai "expense" kecuali ada kata-kata pemasukan.
    5. PENCOCOKAN KATEGORI: Jika `type` adalah "income", Kategori HARUS berupa kategori pemasukan (contoh: "Uang Saku", "Gaji", "Bonus"). JANGAN PERNAH menempatkan "income" ke dalam kategori pengeluaran seperti "Makanan & Minuman" atau "Belanja", meskipun ada kata "jajan".
    6. ANALISIS KONTEKS MENDALAM (PENTING!):
       - Pahami ALIRAN UANG. Jika orang lain membayar ke user ("Andi bayar utang ke saya 50 ribu"), itu Pemasukan (income). Jika user membayar ke orang lain ("Saya bayar utang ke Andi 50 ribu"), itu Pengeluaran (expense).
       - Kehilangan uang ("hilang", "kecopetan", "jatuh") = Pengeluaran (expense).
       - Menemukan uang ("nemu uang", "dapat undian") = Pemasukan (income).
       - Jika ada beberapa konteks berlawanan dalam satu kalimat (misal: "Gaji 5 juta tapi langsung bayar kos 1 juta"), PECAH menjadi 2 transaksi: Gaji (income) 5 juta, dan Bayar Kos (expense) 1 juta.
    
    Teks input: "{text}"
    """
    
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TransactionList,
            temperature=0.1,
        ),
    )
    
    import json
    data = json.loads(response.text)
    
    result = []
    for tx in data.get("transactions", []):
        try:
            clean_date = tx["date"].replace("Z", "")
            dt_obj = datetime.strptime(clean_date, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            dt_obj = today_date
            
        result.append({
            "date": dt_obj.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "amount": tx["amount"],
            "category": tx["category"],
            "type": tx["type"],
            "description": tx["description"]
        })
    return result

def _parse_with_regex(text: str) -> dict:
    text = text.lower()
    
    # Extract Date
    date = datetime.now(timezone.utc)
    if "kemarin" in text or "h-1" in text or "1 hari yang lalu" in text:
        date = date - timedelta(days=1)
        
    days_ago_match = re.search(r'(\d+)\s*hari\s*(?:yang\s*)?lalu', text)
    if days_ago_match:
        days = int(days_ago_match.group(1))
        date = date - timedelta(days=days)
    
    # Extract Amount
    amount = 0
    matches = re.finditer(r'(\d+(?:\.\d+)?)\s*(ribu|juta|rb|k)?', text)
    
    for match in matches:
        val_str = match.group(1).replace('.', '')
        multiplier = match.group(2)
        
        end_idx = match.end()
        next_words = text[end_idx:].strip().split()
        if next_words and next_words[0] in ['hari', 'minggu', 'bulan', 'tahun', 'jam', 'menit', 'kali']:
            continue
            
        val = float(val_str)
        
        if multiplier in ['ribu', 'rb', 'k']:
            amount += int(val * 1000)
        elif multiplier == 'juta':
            amount += int(val * 1000000)
        elif val >= 1000:
            amount += int(val)
        elif val > 0 and amount == 0:
            # Only accept small numbers without multiplier if nothing else is found yet
            # and next word might indicate currency or it's just a raw number
            pass
            
    if amount == 0:
        return None
        
    # 1. Determine tx_type FIRST
    tx_type = "expense"
    if any(word in text for word in ["gaji", "dapat", "terima", "menambah", "masuk", "dikasih", "uang saya", "saldo", "sisa", "ada uang"]):
        tx_type = "income"
    if any(word in text for word in ["mengurangi", "keluar", "bayar", "beli"]):
        tx_type = "expense"
        
    # 2. Determine category
    category = "Lainnya"
    if tx_type == "income":
        income_map = {
            "Gaji": ["gaji", "bonus", "profit", "laba", "thr"],
            "Uang Saku": ["jajan", "saku", "dikasih", "dapat", "transferan"]
        }
        found = False
        for cat_name, keywords in income_map.items():
            for kw in keywords:
                if kw in text:
                    category = cat_name
                    found = True
                    break
            if found:
                break
        if not found:
            category = "Pemasukan"
    else:
        expense_map = {
            "Makanan & Minuman": ["makan", "minum", "kopi", "teh", "bakso", "roti", "warteg", "gofood", "grabfood", "jajan", "cemilan", "beras", "sayur", "buah", "indomie", "nasi"],
            "Transportasi": ["bensin", "parkir", "tol", "gojek", "grab", "maxim", "indrive", "kereta", "krl", "mrt", "bus", "angkot", "tiket", "ojol", "ojek"],
            "Belanja": ["beli", "belanja", "shopee", "tokopedia", "tokped", "lazada", "baju", "celana", "sepatu", "skincare", "sabun", "shampo", "deterjen"],
            "Tagihan & Utilitas": ["listrik", "token", "pdam", "air", "wifi", "indihome", "internet", "pulsa", "kuota", "netflix", "spotify", "bpjs", "kos", "kontrakan"],
            "Kesehatan": ["obat", "dokter", "sakit", "klinik", "apotek", "vitamin", "rumah sakit"],
            "Hiburan": ["nonton", "bioskop", "main", "game", "liburan", "jalan-jalan", "rekreasi"]
        }
        found = False
        for cat_name, keywords in expense_map.items():
            for kw in keywords:
                if kw in text:
                    category = cat_name
                    found = True
                    break
            if found:
                break

    return {
        "date": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "amount": amount,
        "category": category,
        "type": tx_type,
        "description": text.capitalize()
    }
