const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// add these if necessary
// app.use(express.urlencoded({extended: false}));

app.listen(3000, () => {
    console.log("Server running at port 3000");
})