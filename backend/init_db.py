"""
Database initialization and sample data insertion script.

Run this after setting up your database to create tables.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import Base, engine, SessionLocal 
from app.database.models import User
from app.core.auth import get_password_hash


def init_database():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully!")


def create_sample_user():
    """Create a sample user for testing."""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == "demo").first()
        if existing_user:
            print("✓ Sample user 'demo' already exists")
            return
        
        # Create sample user
        sample_user = User(
            username="demo",
            email="demo@gmail.com",
            hashed_password=get_password_hash("demo123")
        )
        db.add(sample_user)
        db.commit()
        print("✓ Sample user created:")
        print("  Username: demo")
        print("  Password: demo123")
    except Exception as e:
        print(f"✗ Error creating sample user: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    """Main initialization function."""
    print("\n" + "="*50)
    print("Agentic AI Database Initialization")
    print("="*50 + "\n")
    
    try:
        # Initialize database
        init_database()
        
        # Create sample user
        print("\nCreating sample user...")
        create_sample_user()
        
        print("\n" + "="*50)
        print("Initialization complete!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n✗ Initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
