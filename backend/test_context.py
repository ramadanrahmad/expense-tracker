import nlp_service

sentences = [
    "nemu uang di jalan 50 ribu, tapi malah jatuh 20 ribu pas lari",
    "Budi bayar utang ke saya 100 ribu kemarin",
    "Saya balikin uang jajan adik 50 ribu",
    "Gaji bulan ini 5 juta 500 ribu, langsung dipotong bayar kos 1 juta",
    "Uang tabungan ada 10 juta, beli motor bekas 8 juta"
]

for s in sentences:
    print(f"\n--- Kalimat: '{s}' ---")
    try:
        results = nlp_service.parse_text_to_transaction(s, [])
        for r in results:
            print(f"[{r['type'].upper()}] Rp {r['amount']} - {r['category']} - {r['description']}")
    except Exception as e:
        print(f"Error: {e}")
