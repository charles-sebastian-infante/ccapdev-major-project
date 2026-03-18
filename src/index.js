const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const { body, matchedData, validationResult } = require("express-validator");
const argon2id = require("@node-rs/argon2");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// middleware for parsing requests
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(fileUpload());

mongoose.connect("mongodb://localhost/offbeatDB");

const Chart = require("./database/models/Chart");
const Review = require("./database/models/Review");
const User = require("./database/models/User");

const hbs = require("hbs");
app.set("view engine", "hbs");
hbs.registerHelper(require("./hbs_helpers"));
hbs.registerPartials(path.join(__dirname, "views", "partials"));

app.use(
    session({
        secret: "secret-key",
        resave: false,
        saveUninitialized: false,
    })
);

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

const COOKIE_MAX_AGE = 1000 * 24 * 60 * 60 * 30; // 30 days

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect("/login");
    }
}

/* checks if the request is valid based on previous validator
   middleware made using express-validator, and sends a message
   to the user otherwise */
const checkIfRequestIsValid = (req, res, next) => {
    const result = validationResult(req);
	if (result.isEmpty()) { // if there are no errors
        next();
	} else {
        res.status(400).send("Invalid request");
    }
};

app.get("/", async (req, res) => {
    const charts = await Chart.find({}).populate("charterId", "username");
    const currentUser = await User.findById(req.session.userId).lean();

    res.render("index", {charts, currentUser});
});

// this is where search, filter, and sort by are handled
app.post("/", async (req, res) => {
    const charts = await Chart.find({}).populate("charterId", "username");

    // for now, just displays all the charts
    // in the future, use req.body to handle search, filter, and sort by

    res.render("partials/chart_list", {charts}); 
});

app.get("/charts/:chartId", async (req, res) => {
    const chartId = req.params.chartId;
    const currentUser = await User.findById(req.session.userId).lean();

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

    res.render("chart", {chart, currentUser});
});

app.get("/login", (req, res) => {
    if (req.session.userId) {
        res.redirect("/edit_profile")
    } else {
        res.sendFile(path.join(__dirname, "pages", "signup.html"));
    }
});

app.post("/login", [
    body("username").notEmpty(),
    body("password").notEmpty(),
    body("rememberMe").optional()
], checkIfRequestIsValid, async (req, res) => {
    const loginInfo = matchedData(req);
    console.log(loginInfo);
    

    const user = await User.findOne({ username: loginInfo.username });

    if (!user) {
        res.status(422).send("Incorrect username/password");
        return;
    }
    // Making the errors more generic cause you don't want to be specific about
    // whether the username or the password is wrong
     
    let validPassword = false;

    try {
        validPassword = await argon2id.verify(user.password, loginInfo.password);
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Server-side password error. Please notify the devs!");
        return;
    }
    
    if (!validPassword) {
        res.status(422).send("Incorrect username/password");
        return;
    }

    req.session.userId = user.id;

    if (loginInfo.rememberMe) {
        req.session.cookie.maxAge = COOKIE_MAX_AGE;
    } else {
        // cookie is deleted when browser is closed
        req.session.cookie.expires = false;
    }

    /* when sessions are implemented, this should maybe redirect to whatever the previous page was
       (whichever page had the button which the user pressed to get to the login page) */
    res.redirect("/edit_profile");

});

app.post("/signup", [
    body("username").notEmpty(),
    body("email").notEmpty(),
    body("password").notEmpty(),
    body("rating").notEmpty(),
    body("description"),
    body("rememberMe").optional()
], checkIfRequestIsValid, async (req, res) => {
    const loginInfo = matchedData(req);
    console.log(loginInfo);

    const existingUser = await User.findOne({ username: loginInfo.username });

    if (existingUser) {
        res.status(422).send("Username is taken");
        return;
    }

    let hashedPassword; 

    try {
        hashedPassword = await argon2id.hash(loginInfo.password);
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Server-side password error. Please notify the devs!");
        return;
    }

    const newUser = new User({
        userType: "regular",
        username: loginInfo.username,
        password: hashedPassword,
        email: loginInfo.email,
        rating: loginInfo.rating,
        description: loginInfo.description
    });

    await newUser.save();

    req.session.userId = newUser.id;

    if (loginInfo.rememberMe) {
        req.session.cookie.maxAge = COOKIE_MAX_AGE;
    } else {
        // cookie is deleted when browser is closed
        req.session.cookie.expires = false;
    }

    /* when sessions are implemented, this should maybe redirect to whatever the previous page was
       (whichever page had the button which the user pressed to get to the signup page) */
    res.redirect("/edit_profile");
});

app.get("/edit_profile", isAuthenticated, async (req, res) => {
    const currentUser = await User.findById(req.session.userId).lean();

    res.render("edit_profile", {currentUser});
});

app.get("/view_profile/:userId", async (req, res) => {
    const currentUser = await User.findById(req.session.userId).lean();

    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    const reviews = await Review.find({ userId: userId }).lean();
    user.reviews = reviews;

    if (req.session.userId === userId) {
        user.isCurrentUser = true;
    }

    res.render("view_profile", {user, currentUser});
});

app.listen(3000, () => {
    console.log("Server running at port 3000");
})