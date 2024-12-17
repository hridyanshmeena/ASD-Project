const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// MongoDB connection
const uri = "mongodb+srv://hridyansh:asdpj@hridyansh.geuwbqg.mongodb.net/?retryWrites=true&w=majority&appName=hridyansh";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let usersCollection;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(session({
  secret: "secretKey",
  resave: false,
  saveUninitialized: true,
}));

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    const db = client.db("userManagement");
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}
connectDB();

// Routes
app.post("/signup", async (req, res) => {
  const { firstName, lastName, companyName, address, mobileNo, email, password } = req.body;

  if (!firstName || !email || !password) return res.status(400).send("All fields are required");

  const hashedPassword = await bcrypt.hash(password, 10);

  await usersCollection.insertOne({
    firstName, lastName, companyName, address, mobileNo, email, password: hashedPassword
  });
  res.redirect("/login.html");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await usersCollection.findOne({ email });

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user.email;
    res.redirect("/dashboard.html");
  } else {
    res.status(401).send("Invalid credentials");
  }
});

app.post("/change-password", authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userEmail = req.session.user;

  const user = await usersCollection.findOne({ email: userEmail });
  if (user && await bcrypt.compare(oldPassword, user.password)) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne({ email: userEmail }, { $set: { password: hashedPassword } });
    return res.json({ message: "Password changed successfully" });
  } else {
    return res.json({ message: "Old password is incorrect!" });
  }

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
}
});

app.get("/logout", authenticate, (req, res) => {

  req.session.destroy(err => {
    if (err) {
        return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    return res.status(200).json({ message: 'Logged out successfully' });
});
  res.redirect("/login.html");
});

function authenticate(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        return res.status(401).json({ message: 'Unauthorized: Please log in first.' });
    }
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
