import sqlite3

conn = sqlite3.connect('finance.db')
c = conn.cursor()

def merge_category(old_name, new_name, c_type):
    # Find new_name id
    c.execute("SELECT id FROM categories WHERE name = ? AND type = ?", (new_name, c_type))
    target = c.fetchone()
    
    if not target:
        # If new category doesn't exist, just rename the old one
        c.execute("UPDATE categories SET name = ? WHERE name = ? AND type = ?", (new_name, old_name, c_type))
    else:
        target_id = target[0]
        # Find old_name ids
        c.execute("SELECT id FROM categories WHERE name = ? AND type = ?", (old_name, c_type))
        old_rows = c.fetchall()
        for row in old_rows:
            old_id = row[0]
            # Update transactions
            c.execute("UPDATE transactions SET category_id = ? WHERE category_id = ?", (target_id, old_id))
            # Delete old category
            c.execute("DELETE FROM categories WHERE id = ?", (old_id,))

merge_category('Uang Jajan', 'Uang Saku', 'income')
merge_category('Bensin', 'Transportasi', 'expense')

conn.commit()
conn.close()
print("Merged categories successfully")
