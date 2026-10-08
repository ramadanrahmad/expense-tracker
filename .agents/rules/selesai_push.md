# Selesai Command Rule

Ketika user mengetikkan kata "selesai" (atau variasi kalimat yang menyatakan selesai), Anda HARUS secara otomatis melakukan hal berikut TANPA perlu diminta:
1. Pastikan semua file pekerjaan sudah tersimpan.
2. Lakukan `git add .` dan `git commit` dengan pesan yang merangkum perubahan terakhir.
3. Lakukan `git push origin main` (atau branch utama yang sedang aktif).
4. SANGAT PENTING: Sebelum commit, pastikan tidak ada data sensitif (seperti API Key, password, atau file `.env`) yang ikut ter-push. Pastikan `.gitignore` sudah mengatur agar file sensitif terabaikan.
5. Setelah berhasil, beri tahu user bahwa semua perubahan telah di-push dengan aman ke GitHub.
