import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./finance.db"

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            # Check if user_id exists in categories
            print("Checking categories table...")
            conn.execute(text("ALTER TABLE categories ADD COLUMN user_id INTEGER;"))
            conn.execute(text("ALTER TABLE categories ADD CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users(id);"))
            print("Added user_id to categories.")
        except Exception as e:
            print("Categories column might already exist or error:", e)

        try:
            # Check if user_id exists in transactions
            print("Checking transactions table...")
            conn.execute(text("ALTER TABLE transactions ADD COLUMN user_id INTEGER;"))
            conn.execute(text("ALTER TABLE transactions ADD CONSTRAINT fk_trans_user FOREIGN KEY (user_id) REFERENCES users(id);"))
            print("Added user_id to transactions.")
        except Exception as e:
            print("Transactions column might already exist or error:", e)
            
        conn.commit()

if __name__ == "__main__":
    run_migration()
