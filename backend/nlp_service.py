import os
import re
from datetime import datetime, timedelta
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
    res = _parse_with_regex(text)
    return [res] if res else []

def _parse_with_llm(text: str, api_key: str, existing_categories: List[str] = None) -> List[dict]:
    client = genai.Client(api_key=api_key)
    today_date = datetime.now()
    today_str = today_date.strftime("%Y-%m-%dT%H:%M:%S")
    
    cat_str = ", ".join(existing_categories) if existing_categories else "Makanan & Minuman, Transportasi, Belanja, Tagihan & Utilitas, Kesehatan, Hiburan, Gaji, Uang Saku"
    
    prompt = f"""
    Kamu adalah asisten pencatat keuangan yang sangat cerdas.
    Tugasmu mengekstrak SEMUA kejadian transaksi dari teks user menjadi daftar transaksi terstruktur.
    
    Hari ini adalah tanggal: {today_str}.
    Jika user menyebutkan waktu seperti "kemarin", "hari ini", atau "2 hari yang lalu", hitung tanggal pastinya berdasarkan tanggal hari ini.
    
    DAFTAR KATEGORI YANG SUDAH ADA: {cat_str}.
    PENTING: Selalu PRIORITASKAN memasukkan transaksi ke dalam salah satu KATEGORI YANG SUDAH ADA di atas. 
    Contoh: Jika user menyebut "Pertalite" atau "Bensin", gunakan "Transportasi". Jika user menyebut "Uang dari orang tua" atau "Uang Jajan", gunakan "Uang Saku".
    JANGAN membuat kategori baru yang bersinonim dengan daftar di atas. Hanya buat kategori baru jika benar-benar tidak cocok.
    
    Teks input: "{text}"
    """
    
    response = client.models.generate_content(
        model='gemini-3.6-flash',
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
            dt_obj = datetime.strptime(tx["date"], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            dt_obj = today_date
            
        result.append({
            "date": dt_obj,
            "amount": tx["amount"],
            "category": tx["category"],
            "type": tx["type"],
            "description": tx["description"]
        })
    return result

def _parse_with_regex(text: str) -> dict:
    text = text.lower()
    
    # Extract Date
    date = datetime.now()
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
            amount = int(val * 1000)
            break
        elif multiplier == 'juta':
            amount = int(val * 1000000)
            break
        elif val >= 1000:
            amount = int(val)
            break
        elif val > 0 and amount == 0:
            amount = int(val)
            
    if amount == 0:
        return None
        
    category = "Lainnya"
    tx_type = "expense"
    
    categories_map = {
        "Makanan & Minuman": ["makan", "minum", "kopi", "teh", "bakso", "roti", "warteg", "gofood", "grabfood", "jajan", "cemilan", "beras", "sayur", "buah", "indomie", "nasi"],
        "Transportasi": ["bensin", "parkir", "tol", "gojek", "grab", "maxim", "indrive", "kereta", "krl", "mrt", "bus", "angkot", "tiket", "ojol", "ojek"],
        "Belanja": ["beli", "belanja", "shopee", "tokopedia", "tokped", "lazada", "baju", "celana", "sepatu", "skincare", "sabun", "shampo", "deterjen"],
        "Tagihan & Utilitas": ["listrik", "token", "pdam", "air", "wifi", "indihome", "internet", "pulsa", "kuota", "netflix", "spotify", "bpjs", "kos", "kontrakan"],
        "Kesehatan": ["obat", "dokter", "sakit", "klinik", "apotek", "vitamin", "rumah sakit"],
        "Hiburan": ["nonton", "bioskop", "main", "game", "liburan", "jalan-jalan", "rekreasi"],
        "Gaji": ["gaji", "bonus", "dikasih", "dapat", "jualan", "transferan", "profit", "laba", "thr"]
    }
    
    found = False
    for cat_name, keywords in categories_map.items():
        for kw in keywords:
            if kw in text:
                category = cat_name
                found = True
                break
        if found:
            break
            
    if category == "Gaji" or any(word in text for word in ["gaji", "dapat", "terima"]):
        tx_type = "income"

    return {
        "date": date,
        "amount": amount,
        "category": category,
        "type": tx_type,
        "description": text.capitalize()
    }
