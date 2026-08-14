from .app import create_server
from .repository import FixtureNoteRepository


def main() -> None:
    create_server(FixtureNoteRepository()).run("stdio")


if __name__ == "__main__":
    main()
