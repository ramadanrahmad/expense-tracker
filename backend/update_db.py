import sqlite3

conn = sqlite3.connect('finance.db')
c = conn.cursor()
c.execute("UPDATE categories SET name = 'Gaji' WHERE name = 'Pemasukan' AND type = 'income'")
conn.commit()
conn.close()
print("Updated successfully")
