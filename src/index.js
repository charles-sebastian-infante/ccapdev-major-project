const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// add these if necessary
// app.use(express.urlencoded({extended: false}));

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