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

/* Checks if an object's keys are the same as the given array
   (order doesn't matter) */
const checkObjKeys = (obj, arrKeys) => {
    const objKeys = Object.keys(obj);
    const len = objKeys.length;

    if (len !== arrKeys.length) {
        return false;
    }

    const sortedObjKeys = objKeys.toSorted();
    const sortedArrKeys = arrKeys.toSorted();

    for (let i = 0; i < len; i++) {
        if (sortedObjKeys[i] !== sortedArrKeys[i]) {
            return false;
        }
    }

    return true;
}

/* Returns a middleware function that checks if the body of the POST request
   has exactly the required keys */
const validateReqBody = (...requiredKeys) => {
    return (req, res, next) => {
        const isValid = checkObjKeys(req.body, requiredKeys);

        if (isValid) {
            next();
        } else {
            res.status(400).send("Invalid request");
        }
    };
};

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

app.post("/submit_login",
        validateReqBody("username", "email", "password", "rating", "description", "rememberMe", "type"),
        async (req, res) => {
    const loginInfo = req.body;
    console.log(loginInfo);
    
    if (loginInfo.type === "login") {
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
    } else if (loginInfo.type === "signup") {
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
    }

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