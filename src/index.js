const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// add these if necessary
// app.use(express.urlencoded({extended: false}));

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/offbeatDB");

const Chart = require("./database/models/Chart");

/* handling command line arguments (we can use them to manipulate
   the database, at least for now) */
const args = process.argv;
if (args.length === 3) { // if there's one additional argument
    const arg = args[2];
    if (arg === "clear-db") {
        (async () => {
            await Chart.deleteMany({});
            console.log("Database has been cleared");
        })();
    } else if (arg === "insert-sample-data") {
        // the sample data is stored in JSON files
        const chartSampleData = require("./database/sample_data/sample_charts.json");
        (async () => {
            await Chart.insertMany(chartSampleData);
            console.log("Sample data has been added");
        })();
    }
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"))
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