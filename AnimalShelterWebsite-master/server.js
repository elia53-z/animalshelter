require("dotenv").config(); // Завантажує змінні з файлу .env

const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer"); // Для завантаження файлів

const app = express();
const port = process.env.PORT || 3000; // Використовуємо значення з .env або 3000 за замовчуванням

// Підключення до бази даних MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Перевірка підключення до бази даних
db.connect((err) => {
  if (err) throw err;
  console.log("Підключено до бази даних!");
});

// Для обробки JSON даних і статичних файлів
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Налаштування Multer для завантаження файлів (якщо потрібно)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Папка для збереження фото
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Маршрут для головної сторінки
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Маршрут для збереження відгуків
app.post("/api/feedback", (req, res) => {
  const { name, feedback } = req.body;

  // Перевірка на порожні поля
  if (!name || !feedback) {
    return res.status(400).json({ message: "Будь ласка, заповніть всі поля." });
  }

  // SQL запит на додавання нового запису в таблицю відгуків
  const query = `
    INSERT INTO feedbacks (name, feedback)
    VALUES (?, ?)
  `;

  db.query(query, [name, feedback], (err, result) => {
    if (err) {
      console.error("Помилка збереження відгуку:", err.message);
      return res
        .status(500)
        .json({ message: "Помилка сервера. Спробуйте ще раз." });
    }
    res.status(200).json({ message: "Ваш відгук успішно надіслано!" });
  });
});


// Маршрут для повідомлення про знайдену тварину
app.post("/api/found-pet", upload.single("pet-photo"), (req, res) => {
  const { petType, location, description } = req.body;
  const photoPath = req.file ? req.file.path : null;

  // Перевірка на наявність всіх обов'язкових даних
  if (!petType || !location || !description || !photoPath) {
    return res.status(400).json({ message: "Всі поля повинні бути заповнені" });
  }

  // SQL запит на додавання нового запису до таблиці
  const query = `
    INSERT INTO found_pets (pet_type, location, description, photo_path)
    VALUES (?, ?, ?, ?)
  `;
  db.query(
    query,
    [petType, location, description, photoPath],
    (err, result) => {
      if (err) {
        console.error("Помилка збереження даних про знайдену тварину:", err);
        return res.status(500).json({ message: "Помилка сервера" });
      }
      res
        .status(200)
        .json({ message: "Дані про знайдену тварину успішно додано!" });
    }
  );
});



// Маршрут для обробки пожертвувань
// app.post("/api/donate", (req, res) => {
//   const { first_name, last_name, email, card_info, amount } = req.body;

//   if (!first_name || !last_name || !email || !card_info || !amount) {
//     return res.status(400).json({ message: "Будь ласка, заповніть всі поля." });
//   }

//   const query = `
//     INSERT INTO donations (first_name, last_name, email, card_info, amount)
//     VALUES (?, ?, ?, ?, ?)
//   `;

//   db.query(query, [first_name, last_name, email, card_info, amount], (err, result) => {
//     if (err) {
//       console.error("Помилка збереження пожертви:", err.message);
//       return res.status(500).json({ message: "Помилка сервера. Спробуйте ще раз." });
//     }
//     res.status(200).json({ message: "Дякуємо за вашу пожертву!" });
//   });
// });





app.post("/api/donate", (req, res) => {
  const { first_name, last_name, email, card_info, amount } = req.body;

  // Перевірка на порожні поля
  if (!first_name || !last_name || !email || !card_info || !amount) {
    return res.status(400).json({ message: "Будь ласка, заповніть всі поля." });
  }

  console.log("Received donation:", { first_name, last_name, email, amount });

  // SQL запит на додавання нового запису в таблицю donations
  const query = `
    INSERT INTO donations (first_name, last_name, email, card_info, amount)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    query,
    [first_name, last_name, email, card_info, amount],
    (err, result) => {
      if (err) {
        console.error("Помилка збереження пожертви:", err);
        return res
          .status(500)
          .json({ message: "Помилка сервера. Спробуйте ще раз." });
      }

      console.log("Donation saved successfully", result);
      res.status(200).json({ message: "Дякуємо за вашу пожертву!" });
    }
  );
});


document
  .getElementById("donation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault(); // Зупиняє перезавантаження сторінки

    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const email = document.getElementById("email").value;
    const cardInfo = document.getElementById("card-info").value;
    const amount = document.getElementById("amount").value;

    // Перевірка на порожні поля
    if (!firstName || !lastName || !email || !cardInfo || !amount) {
      showToast("Будь ласка, заповніть всі поля.", "error");
      return;
    }

    // Відправка даних на сервер
    const response = await fetch("/api/donate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        card_info: cardInfo,
        amount,
      }),
    });

    if (response.ok) {
      const data = await response.json(); // Отримуємо відповідь від сервера
      showToast(data.message || "Дякуємо за вашу пожертву!"); // Виводимо повідомлення від сервера
      document.getElementById("donation-form").reset(); // Очищаємо форму після відправки
    } else {
      const data = await response.json();
      showToast(
        data.message || "Щось пішло не так. Спробуйте ще раз.",
        "error"
      );
    }
  });





// Маршрут для обробки реєстрації волонтерів
// Маршрут для обробки реєстрації волонтерів









// Обробка POST запиту для збереження волонтера
app.post('/api/volunteer', (req, res) => {
  const { first_name, last_name, phone_number, availability_time, days_per_week, hours_per_day } = req.body;

  // Логування отриманих даних для дебагу
  console.log('Отримані дані: ', req.body);

  // Перевірка на порожні значення
  if (
    !first_name.trim() ||
    !last_name.trim() ||
    !phone_number.trim() ||
    !availability_time ||
    !days_per_week ||
    !hours_per_day
  ) {
    return res.status(400).json({ message: 'Будь ласка, заповніть всі поля.' });
  }

  // SQL-запит для вставки даних
  const query = `INSERT INTO volunteers (first_name, last_name, phone_number, availability_time, days_per_week, hours_per_day)
                 VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    query,
    [
      first_name,
      last_name,
      phone_number,
      availability_time,
      days_per_week,
      hours_per_day,
    ],
    (err, result) => {
      if (err) {
        console.error('Помилка збереження даних: ', err);
        return res.status(500).json({ message: 'Помилка сервера. Спробуйте ще раз.' });
      }
      res.status(200).json({ message: 'Дякуємо за реєстрацію!' });
    }
  );
});

// Запуск сервера
const port = 5000;
app.listen(port, () => {
  console.log(`Сервер працює на порту ${port}`);
});




app.get("/api/filter-pets", (req, res) => {
  const { type, age } = req.query;
  let query = "SELECT * FROM pets WHERE 1";
  const params = [];

  if (type) {
    query += " AND type = ?";
    params.push(type.charAt(0).toUpperCase() + type.slice(1)); // Перша літера велика
  }

  if (age) {
    switch (age) {
      case "puppy":
        query += " AND age < ?";
        params.push(1);
        break;
      case "adult":
        query += " AND age BETWEEN ? AND ?";
        params.push(1, 5);
        break;
      case "senior":
        query += " AND age > ?";
        params.push(5);
        break;
      default:
        break;
    }
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Помилка фільтрації тварин:", err);
      return res.status(500).json({ message: "Помилка сервера" });
    }
    res.json(results);
  });
});


app.delete("/api/adopt-pet/:id", (req, res) => {
  const petId = req.params.id; // Отримуємо ID тварини з параметрів запиту
  const query = "DELETE FROM pets WHERE id = ?"; // SQL-запит для видалення тварини

  // Перевірка значення ID
  console.log("ID тварини для видалення:", petId);

  db.query(query, [petId], (err, results) => {
    if (err) {
      console.error("Помилка при видаленні тварини:", err);
      return res
        .status(500)
        .json({ success: false, message: "Помилка сервера" });
    }

    if (results.affectedRows > 0) {
      res.json({ success: true }); // Тварину успішно видалено
    } else {
      res.status(404).json({ success: false, message: "Тварина не знайдена" }); // Якщо тварина не знайдена
    }
  });
});



// app.get("/api/filter-pets", (req, res) => {
//   const { type, age } = req.query;
//   let query = "SELECT * FROM pets WHERE 1"; // Вибираємо всі тварини за умовчанням

//   // Додаємо фільтрацію за типом, якщо вказано
//   if (type) {
//     query += ` AND type = '${type}'`; // Якщо тип вказано, додаємо умову
//   }

//   // Додаємо фільтрацію за віком, якщо вказано
//   if (age) {
//     switch (age) {
//       case "puppy":
//         query += " AND age < 1"; // Фільтруємо по віку
//         break;
//       case "adult":
//         query += " AND age BETWEEN 1 AND 5";
//         break;
//       case "senior":
//         query += " AND age > 5";
//         break;
//       default:
//         break;
//     }
//   }

//   // Виконуємо запит до бази даних
//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Помилка фільтрації тварин:", err);
//       return res.status(500).json({ message: "Помилка сервера" });
//     }
//     res.json(results); // Повертаємо результат запиту у вигляді JSON
//   });
// });







app.post("/api/adopt", (req, res) => {
  const { first_name, last_name, phone, email, pet_id } = req.body;

  if (!first_name || !last_name || !phone || !email || !pet_id) {
    return res.status(400).json({ message: "Будь ласка, заповніть всі поля." });
  }

  const query = `
    INSERT INTO adoptions (adopter_name, contact_info, pet_id)
    VALUES (?, ?, ?)
  `;

  db.query(
    query,
    [first_name + " " + last_name, phone + ", " + email, pet_id],
    (err, result) => {
      if (err) {
        console.error("Помилка усиновлення тварини:", err);
        return res.status(500).json({ message: "Помилка сервера" });
      }
      res.status(200).json({ message: "Тварина успішно усиновлена!" });
    }
  );
});





    









// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер працює на порту ${port}`);
});
