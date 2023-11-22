import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Aa123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function getUsers() {
  const result = await db.query("SELECT * FROM users");
  let users = [];

  result.rows.forEach((user) => {
    users.push({
      id: user.id,
      name: user.name,
      color: user.color
    });
  });

  return users;
}

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id=$1",[currentUserId]);

  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });

  return countries;
}

async function getColorOfUser() {
  const users = await getUsers();
  const filteredUsers = users.filter((user) => user.id == currentUserId);

  return filteredUsers[0].color;
}

async function getUserProps(countries) {
  return {
    countries: countries,
    total: countries.length,
    users: await getUsers(),
    color: await getColorOfUser(),
  }
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();

  res.render("index.ejs", await getUserProps(countries));
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );

      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  const addNew = req.body["add"];

  if(addNew) {
    res.render('new.ejs');
  } else {
    currentUserId = req.body["user"];
    const countries = await checkVisisted();

    res.render("index.ejs", await getUserProps(countries));
  }
});

app.post("/new", async (req, res) => {
  const name = req.body["name"];
  const color = req.body["color"];

  const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id", [name, color]);
  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
