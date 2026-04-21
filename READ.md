▶️ Uruchomienie QuizBattle

-----------------------------

🔧 Backend

cd backend
node index.js

-----------------------------

💻 Frontend

cd frontend
npm run dev

-----------------------------




📦 Import kolekcji w MongoDB Compass
1. 🔗 Połącz się z bazą
Otwórz MongoDB Compass
Kliknij “New Connection”

Wpisz connection string (np. lokalnie):

mongodb://localhost:27017
Kliknij Connect
2. 🗂️ Utwórz bazę i kolekcje

Zanim zaimportujesz dane, musisz stworzyć bazę i kolekcje:

Kliknij “Create Database”
Ustaw:
Database Name → np. twoja_baza
Collection Name → np. categories
Następnie utwórz pozostałe kolekcje ręcznie:
games
questions
ranks
suggestions
users

👉 Każda z tych nazw to osobna kolekcja w bazie.

3. 📁 Pliki JSON

Wszystkie pliki .json znajdują się w folderze:

/MongoDB

Każdy plik odpowiada jednej kolekcji, np.:

categories.json → kolekcja categories
games.json → kolekcja games
questions.json → kolekcja questions
ranks.json → kolekcja ranks
suggestions.json → kolekcja suggestions
users.json → kolekcja users
4. 📥 Import danych

Dla każdej kolekcji:

Wejdź w odpowiednią kolekcję (np. users)
Kliknij “ADD DATA”
Wybierz “Import File”
Wskaż plik z folderu /MongoDB (np. users.json)
5. 🚀 Kliknij Import

Po imporcie dane pojawią się w odpowiednich kolekcjach.