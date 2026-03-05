const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// add more if necessary
app.use(express.urlencoded({extended: false}));
const fileUpload = require("express-fileupload");
app.use(fileUpload());

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/offbeatDB");

const Chart = require("./database/models/Chart");
const Review = require("./database/models/Review");
const User = require("./database/models/User");

const { body, matchedData, validationResult } = require("express-validator");

/* handling command line arguments (we can use them to manipulate
   the database, at least for now) */
const { clearDb, insertSampleData, resetDatabase } = require("./sample_data_handler");
const args = process.argv;
if (args.length === 3) { // if there's one additional argument
    const arg = args[2];
    if (arg === "clear-db") {
        clearDb();
    } else if (arg === "insert-sample-data") {
        insertSampleData();
    } else if (arg === "reset") {
        resetDatabase(); // clears database and inserts sample data
    }
}

const hbs = require("hbs");
hbs.registerHelper(require("./hbs_helpers"));
app.set("view engine", "hbs");

app.get("/", async (req, res) => {
    const charts = await Chart.find({}).populate("charterId", "username");
    res.render("index", {charts});
});

app.get("/charts/:chartId", async (req, res) => {
    const chartId = req.params.chartId;

    if (!mongoose.isValidObjectId(chartId)) {
        res.status(404).send("<h1>404 Not Found - Invalid URL</h1>");
        return;
    }

    const chart = await Chart.findById(chartId).populate("charterId", "username").lean();

    if (!chart) {
        res.status(404).send("<h1>404 Not Found - Chart Not Found</h1>");
        return;
    }

    const reviews = await Review.find({ chartId: chartId }).populate("userId", "username imagePath rating").lean();
    chart.reviews = reviews;

    res.render("chart", chart);
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "signup.html"));
});

app.post("/login", [
    body("username").notEmpty(),
    body("password").notEmpty(),
    body("rememberMe").optional()
], async (req, res) => {
    const result = validationResult(req);
	if (!result.isEmpty()) {
		res.status(400).send("Invalid request");
        return;
	}
    const loginInfo = matchedData(req);
    console.log(loginInfo);
    
    const user = await User.findOne({ username: loginInfo.username });

    if (!user) {
        res.status(422).send("User does not exist");
        return;
    }

    // use hashing functions later
    if (loginInfo.password !== user.password) {
        res.status(422).send("Incorrect password");
        return;
    }

    // this is where the user data would be put into the session

    // when sessions are implemented, this should maybe redirect to whatever the previous page was
    res.redirect("/edit_profile");
});

app.post("/signup", [
    body("username").notEmpty(),
    body("email").notEmpty(),
    body("password").notEmpty(),
    body("rating").notEmpty(),
    body("description"),
    body("rememberMe").optional()
], async (req, res) => {
    const result = validationResult(req);
	if (!result.isEmpty()) {
		res.status(400).send("Invalid request");
        return;
	}
    const loginInfo = matchedData(req);
    console.log(loginInfo);

    const existingUser = await User.findOne({ username: loginInfo.username });

    if (existingUser) {
        res.status(422).send("Username is taken");
        return;
    }

    const newUser = new User({
        userType: "regular",
        username: loginInfo.username,
        password: loginInfo.password,
        email: loginInfo.email,
        rating: loginInfo.rating,
        description: loginInfo.description
    });

    await newUser.save();

    // this is where the user data would be put into the session

    // when sessions are implemented, this should maybe redirect to whatever the previous page was
    res.redirect("/edit_profile");
});

// add better method later
const pages = [
    "edit_profile",
    "view_profile"
];

pages.forEach(page => {
    app.get("/" + page, (req, res) => {
        res.sendFile(path.join(__dirname, "pages", page + ".html"));
    });
});

app.listen(3000, () => {
    console.log("Server running at port 3000");
})