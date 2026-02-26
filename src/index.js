const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// add these if necessary
// app.use(express.urlencoded({extended: false}));

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

const hbs = require("hbs");
hbs.registerHelper(require("./hbs_helpers"));
app.set("view engine", "hbs");

app.get("/", async (req, res) => {
    const charts = await Chart.find({});
    res.render("index", {charts});
});

// add better method later
const pages = [
    "edit_profile",
    "signup",
    "view_profile",
    "emperror_exp",
    "emperror_mas",
    "sample_exp",
    "sample_mas",
    "sample_remas",
];

pages.forEach(page => {
    app.get("/" + page, (req, res) => {
        res.sendFile(path.join(__dirname, "pages", page + ".html"));
    });
});

app.listen(3000, () => {
    console.log("Server running at port 3000");
})