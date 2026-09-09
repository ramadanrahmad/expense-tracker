import sqlite3

conn = sqlite3.connect('finance.db')
c = conn.cursor()

# Find the ID of "Makanan & Minuman"
c.execute("SELECT id FROM categories WHERE name = 'Makanan & Minuman' AND type = 'expense'")
target = c.fetchone()
if not target:
    # If it doesn't exist, just rename Makanan to Makanan & Minuman
    c.execute("UPDATE categories SET name = 'Makanan & Minuman' WHERE name = 'Makanan' AND type = 'expense'")
else:
    target_id = target[0]
    
    # Find the ID of "Makanan"
    c.execute("SELECT id FROM categories WHERE name = 'Makanan' AND type = 'expense'")
    source_rows = c.fetchall()
    
    for row in source_rows:
        source_id = row[0]
        # Move transactions
        c.execute("UPDATE transactions SET category_id = ? WHERE category_id = ?", (target_id, source_id))
        # Delete old category
        c.execute("DELETE FROM categories WHERE id = ?", (source_id,))

conn.commit()
conn.close()
print("Merged successfully")
