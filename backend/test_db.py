
from sqlalchemy import text

from app.core.database import engine
from app import models  # noqa: F401


def main():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), version()")
        )
        database_name, version = result.one()

    print(f"Connected database: {database_name}")
    print(f"PostgreSQL version: {version.split(',')[0]}")


if __name__ == "__main__":
    main()
