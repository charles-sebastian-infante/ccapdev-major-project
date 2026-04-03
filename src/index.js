const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const { body, matchedData, validationResult } = require("express-validator");
const argon2id = require("@node-rs/argon2");
const crypto = require("crypto");
const fs = require('node:fs/promises');

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
const customHbsHelpers = require("./hbs_helpers");
hbs.registerHelper(customHbsHelpers);
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

// deletes a file with a path in the form "/uploads/(file name)"
async function deleteUpload(filePath) {
    const fullPath = path.join(__dirname, "public", filePath);
    try {
        await fs.unlink(fullPath);
    } catch (error) {
        console.log(error);
    }
}

const COOKIE_MAX_AGE = 1000 * 24 * 60 * 60 * 21; // 3 weeks

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

// ********************************************************************
// ********************** Routes for Home Page ************************
// ********************************************************************

// main route for the home page
app.get("/", async (req, res) => {
    const currentUser = await User.findById(req.session.userId).lean();

    let charts;
    if (currentUser?.userType === "charter") {
        charts = await Chart.find({ charterId: currentUser._id }).populate("charterId", "username");
    } else {
        charts = await Chart.find({}).populate("charterId", "username");
    }

    res.render("index", {charts, currentUser});
});

// returns the HTML for the list of charts through fetch()
app.get("/search_charts", async (req, res) => {
    const { search, difficulty, sort } = req.query;
    const currentUser = await User.findById(req.session.userId).lean();

    // aggregation pipeline
    const pipeline = [
        {
            $lookup: {
                from: "users",
                localField: "charterId",
                foreignField: "_id",
                as: "charterId"
            }
        },
        {
            $unwind: { path: "$charterId" }
        }
    ];

    if (currentUser?.userType === "charter") {
        pipeline.unshift({ // adds to start of array
            $match: {
                charterId: currentUser._id
            }
        })
    }

    if (search) {
        pipeline.push({
            $match: {
                songName: {
                    $regex: RegExp.escape(search), // search can match middle of title
                    $options: "i" // case-insensitive
                }
            }
        });
    }

    if (difficulty) {
        pipeline.push({
            $match: {
                difficultyLevel: difficulty
            }
        });
    }

    let sortObject;
    if (!sort || sort === "songtitle") {  // defaults to sorting by song title
        sortObject = { lowercaseSongName: 1 }  // 1 means ascending
    } else if (sort === "charter") {
        sortObject = { "charterId.lowercaseUsername": 1 }
    } else if (sort === "rating") {
        sortObject = { numericRating: 1 };
    }
    pipeline.push({ $sort: sortObject });

    const charts = await Chart.aggregate(pipeline);

    res.render("partials/chart_list", {charts}); 
});

// ********************************************************************
// ********************* Routes for Chart Page ************************
// ********************************************************************

// main route for each chart page
app.get("/charts/:chartId", async (req, res) => {
    const chartId = req.params.chartId;
    const userId = req.session.userId;
    const currentUser = await User.findById(userId).lean();

    if (!mongoose.isValidObjectId(chartId)) {
        res.status(404).send("<h1>404 Not Found - Invalid URL</h1>");
        return;
    }

    const chart = await Chart.findById(chartId).populate("charterId", "username imagePath").lean();

    if (!chart) {
        res.status(404).send("<h1>404 Not Found - Chart Not Found</h1>");
        return;
    }

    // aggregation pipeline, used for sorting by most likes by default
    const pipeline = [
        {
            $match: {
                chartId: new mongoose.Types.ObjectId(chartId)
            }
        },
        {
            $addFields: {
                likes: { $size: "$likedBy" }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        {
            $unwind: { path: "$userId" }
        },
        {
            $sort: { likes: -1 }
        }
    ];

    if (userId) {
        pipeline.push({
            $addFields: {
                likedByUser:  {
                    $in: [new mongoose.Types.ObjectId(userId), "$likedBy"]
                }
            }
        });
    }

    const reviews = await Review.aggregate(pipeline);
    chart.reviews = reviews;

    // null if the user is not signed in or the user doesn't have a comment
    const userReview = await Review.findOne({ chartId: chartId, userId: userId }).lean();

    res.render("chart", {chart, currentUser, userReview});
});

// returns the HTML for the list of reviews of a specific chart through fetch()
app.get("/search_reviews/:chartId", async (req, res) => {
    const chartId = req.params.chartId;
    const userId = req.session.userId;
    const currentUser = await User.findById(userId).lean();
    const { search, accuracy, sort } = req.query;

    // aggregation pipeline
    const pipeline = [
        {
            $match: {  // only getting reviews for the current chart
                chartId: new mongoose.Types.ObjectId(chartId)
            }
        },
        {
            $addFields: {  // calculating number of likes
                likes: { $size: "$likedBy" }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        {
            $unwind: { path: "$userId" }
        }
    ];

    if (userId) {
        pipeline.push({
            $addFields: {
                likedByUser:  {
                    $in: [new mongoose.Types.ObjectId(userId), "$likedBy"]
                }
            }
        });
    }

    if (search) {
        pipeline.push({
            $match: {
                body: {
                    $regex: RegExp.escape(search), // search can match middle of comment
                    $options: "i" // case-insensitive
                }
            }
        });
    }

    if (accuracy) {
        pipeline.push({
            $match: {
                ratedAccurately: (accuracy === "accurate")
            }
        });
    }

    let sortObject;
    if (!sort || sort === "most_likes") {  // defaults to sorting by most likes
        sortObject = { likes: -1 }  // -1 means descending
    } else if (sort === "newest") {
        sortObject = { createdAt: -1 }
    }
    pipeline.push({ $sort: sortObject });

    const reviews = await Review.aggregate(pipeline);
    const chart = await Chart.findById(chartId).populate("charterId", "username imagePath").lean();

    res.render("partials/review_list", {reviews, chart, currentUser}); 
});

// returns chart info through fetch()
app.get("/get_chart_info/:chartId", async (req, res) => {
    const chartId = req.params.chartId;

    if (!mongoose.isValidObjectId(chartId)) {
        res.status(404).send("<h1>404 Not Found - Invalid URL</h1>");
        return;
    }

    const chart = await Chart.findById(chartId).lean();

    if (!chart) {
        res.status(404).send("<h1>404 Not Found - Chart Not Found</h1>");
        return;
    }

    res.json(chart);
});

// returns review info througb fetch()
app.get("/get_review_info/:reviewId", async (req, res) => {
    const reviewId = req.params.reviewId;

    if (!mongoose.isValidObjectId(reviewId)) {
        res.status(404).send("<h1>404 Not Found - Invalid URL</h1>");
        return;
    }

    const review = await Review.findById(reviewId).populate("userId", "username imagePath rating").lean({ virtuals: true });

    if (!review) {
        res.status(404).send("<h1>404 Not Found - Chart Not Found</h1>");
        return;
    }

    review.formattedRating = customHbsHelpers.round(review.rating, 1);
    review.formattedLikes = customHbsHelpers.displayLikeCount(review.likes);
    res.json(review);
});

// lets the user submit or edit a review
app.post("/charts/:chartId/submit_review", [
    body("accuracy").notEmpty(),
    body("rating").notEmpty(),
    body("body").notEmpty(),
    body("file").optional()
], checkIfRequestIsValid, async (req, res) => {
    const userId = req.session.userId;
    const chartId = req.params.chartId;
    const reqData = matchedData(req);
    const file = req.files?.file;

    if (!userId) {
        res.status(401).send("Error: You are not signed in.");
        return;
    }

    const body = reqData.body;
    const ratedAccurately = (reqData.accuracy === "accurate");

    let rating;
    const chartObj = await Chart.findById(chartId).lean();

    if (ratedAccurately) {
        rating = chartObj.numericRating;
    } else {
        if (chartObj.numericRating == reqData.rating) {
            res.status(422).send("Error: If it's not rated accurately, you must provide a rating that is different from the chart's.");
            return;
        }
        rating = reqData.rating;
    }

    const comment = await Review.findOne({ chartId: chartId, userId: userId });

    let fileType, filePath;
    if (file) {
        let fileExtension;
        let isValid = true;
        
        try {
            fileType = file.mimetype.split("/")[0];
            fileExtension = file.name.split(".").at(-1);

            if (fileType !== "image" && fileType !== "video") {
                isValid = false;
            }
        } catch (error) {
            console.log(error);
            isValid = false;
        }

        if (!isValid) {
            res.status(400).send("Error: Invalid file type. Please upload an image or video.");
            return;
        }

        const newFileName = crypto.randomUUID() + "." + fileExtension;
        filePath = path.join("/uploads", newFileName);

        file.mv(path.join(__dirname, "public", filePath), (error) => {
            if (error) {
                console.log(error);
                res.status(500).send("There was an error uploading your file to the server.");
                return;
            }
        });
    }

    if (!comment) { // submitting a review
        const reviewObj = {
            userId: userId,
            chartId: chartId,
            body: body,
            rating: rating,
            ratedAccurately: ratedAccurately,
            isEdited: false,
            likes: 0
        }

        if (file) {
            reviewObj.filePath = filePath;
            reviewObj.fileType = fileType;
        }

        await Review.create(reviewObj);

        res.json({ action: "submit", success: true });
    } else { // editing the review
        let isChange = false;

        if (comment.body !== body) {
            comment.body = body;
            isChange = true;
        }
        if (comment.rating !== rating) {
            comment.rating = rating;
            isChange = true;
        }
        if (comment.ratedAccurately !== ratedAccurately) {
            comment.ratedAccurately = ratedAccurately;
            isChange = true;
        }

        if (file) {
            if (comment.filePath) { // deleting the old file if there was one
                deleteUpload(comment.filePath);
            }
            comment.filePath = filePath;
            comment.fileType = fileType;
            isChange = true;
        }

        if (!isChange) {
            res.status(400).send("Error: You cannot edit your review without making any changes.");
            return;
        }

        comment.isEdited = true;
        comment.editedAt = new Date();

        await comment.save();

        res.json({ action: "edit", success: true });
    }
});

// lets the user delete a review
app.delete("/charts/:chartId/delete_review", async (req, res) => {
    const userId = req.session.userId;
    const chartId = req.params.chartId;

    if (!userId) {
        res.status(401).send("Error: You are not signed in.");
        return;
    }

    const comment = await Review.findOne({ chartId: chartId, userId: userId });

    if (!comment) {
        res.status(422).send("Error: You do not have a review to delete.");
        return;
    }

    if (comment.filePath) { // deleting the file if there was one
        deleteUpload(comment.filePath);
    }

    await comment.deleteOne();

    res.json({ action: "delete", success: true });
});

// liking or unliking a review
app.post("/like_review/:reviewId", async (req, res) => {
    const userId = req.session.userId;
    const reviewId = req.params.reviewId;

    if (!userId) {
        res.status(401).send("Please log in or sign up to like reviews.");
        return;
    }

    const review = await Review.findById(reviewId);

    if (!review) {
        res.status(404).send("Error: Review does not exist.");
        return;
    }
    
    const index = review.likedBy.indexOf(userId);

    let action;
    if (index === -1) { // not liked yet
        review.likedBy.push(userId);
        action = "liked"
    } else {
        review.likedBy.splice(index, 1);
        action = "unliked";
    }

    review.save();
    res.json({ action: action, success: "true" });
});

// for charter to reply to a review
app.post("/submit_reply/:reviewId", [
    body("body").notEmpty()
], checkIfRequestIsValid, async (req, res) => {
    const userId = req.session.userId;
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);
    const body = matchedData(req).body;
    
    if (!review) {
        res.status(404).send("Error: Review does not exist.");
        return;
    }

    const chart = await Chart.findById(review.chartId);

    // for if the user sends a request manually (not by pressing a button on the site)
    if (userId !== chart.charterId.toString()) {
        res.status(401).send("Error: You are not the charter of this chart.");
        return;
    }
    
    let action;
    if (!review.charterResponse) {
        action = "submit";
        review.responseCreatedAt = new Date();
    } else {
        let isChange = false;

        if (review.charterResponse !== body) {
            isChange = true;
        }

        if (!isChange) {
            res.status(400).send("Error: You cannot edit your reply without making any changes.");
            return;
        }

        action = "edit";
        review.responseEditedAt = new Date();
    }

    review.charterResponse = body;
    await review.save();

    res.json({ action: action, success: "true" });
});

// for charter to delete a reply
app.delete("/delete_reply/:reviewId", async (req, res) => {
    const userId = req.session.userId;
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) {
        res.status(404).send("Error: Review does not exist.");
        return;
    }

    if (!review.charterResponse) {
        res.status(422).send("Error: You do not have a reply to delete.");
        return;
    }

    const chart = await Chart.findById(review.chartId);

    if (userId !== chart.charterId.toString()) {
        res.status(401).send("Error: You are not the charter of this chart.");
        return;
    }

    review.charterResponse = undefined;
    review.responseCreatedAt = undefined;
    review.responseEditedAt = undefined;
    await review.save();

    res.json({ action: "delete", success: true });
});

/* just returns the associated charter response for a certain review
   or "" if there is no response */ 
app.get("/get_charter_response/:reviewId", async (req, res) => {
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId).lean();

    if (!review) {
        res.status(404).send("Error: Review does not exist.");
        return;
    }

    const charterResponse = review.charterResponse;
    if (charterResponse) {
        res.send(charterResponse);
    } else {
        res.send(""); // no response
    }
});

// ********************************************************************
// ****************** Routes for Login/Signup Page ********************
// ********************************************************************

app.get("/login", (req, res) => {
    if (req.session.userId) { // if user is already signed in
        res.redirect("/edit_profile");
    } else {
        res.sendFile(path.join(__dirname, "pages", "login.html"));
    }
});

app.get("/signup", (req, res) => {
    if (req.session.userId) { // if user is already signed in
        res.redirect("/edit_profile");
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
    /* making the errors more generic because you don't want to be specific about
       whether the username or the password is wrong */
    
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

// ********************************************************************
// ****************** Routes for Edit Profile Page ********************
// ********************************************************************

app.get("/edit_profile", isAuthenticated, async (req, res) => {
    const currentUser = await User.findById(req.session.userId).lean();

    res.render("edit_profile", {currentUser});
});

// modifies user data
app.post("/edit_profile", [
    body("image").optional(),
    body("username").notEmpty(),
    body("email").notEmpty(),
    body("rating").optional(),
    body("description").optional()
], checkIfRequestIsValid, async (req, res) => {
    const userId = req.session.userId;
    const reqData = matchedData(req);
    const file = req.files?.image;

    if (!userId) {
        res.status(401).send("Error: You are not signed in.");
        return;
    }

    let fileType, filePath;
    if (file) {
        let fileExtension;
        let isValid = true;
        
        try {
            fileType = file.mimetype.split("/")[0];
            fileExtension = file.name.split(".").at(-1);

            if (fileType !== "image") {
                isValid = false;
            }
        } catch (error) {
            console.log(error);
            isValid = false;
        }

        if (!isValid) {
            res.status(400).send("Error: Invalid file type. Please upload an image.");
            return;
        }

        const newFileName = crypto.randomUUID() + "." + fileExtension;
        filePath = path.join("/uploads", newFileName);

        file.mv(path.join(__dirname, "public", filePath), (error) => {
            if (error) {
                console.log(error);
                res.status(500).send("There was an error uploading your file to the server.");
                return;
            }
        });
    }

    const user = await User.findById(userId);
    let { username, email, rating, description } = reqData;
    rating = Number(rating);
    let isChange = false;

    if (user.username !== username) {
        const existingUser = await User.findOne({ username: username });

        if (existingUser) {
            res.status(422).send("Error: That username is taken. Please choose another username.");
            return;
        }

        user.username = username;
        isChange = true;
    }
    if (user.email !== email) {
        user.email = email;
        isChange = true;
    }
    if (user.rating !== rating) {
        user.rating = rating;
        isChange = true;
    }
    if (user.description !== description) {
        user.description = description;
        isChange = true;
    }
    if (filePath) {
        if (user.hasCustomImage) { // deleting the old profile pic (unless it's the default one)
            deleteUpload(user.imagePath);
        }
        user.imagePath = filePath;
        user.hasCustomImage = true;
        isChange = true;
    }

    if (!isChange) {
        res.status(400).send("Error: You tried to edit your profile without changing any part of your profile.");
        return;
    }

    await user.save();

    res.json({ success: true });
});

app.post("/change_password", [
    body("currentPw").notEmpty(),
    body("newPw").notEmpty()
], checkIfRequestIsValid, async (req, res) => {
    const userId = req.session.userId;
    const { currentPw, newPw } = matchedData(req);

    if (!userId) {
        res.status(401).send("Error: You are not signed in.");
        return;
    }

    const user = await User.findById(userId);

    let validPassword;
    try {
        validPassword = await argon2id.verify(user.password, currentPw);
    } catch (error) {
        console.log(error);
        res.status(500).send("Server-side password error. Please notify the devs!");
        return;
    }
    if (!validPassword) {
        res.status(422).send("Error: Current password is incorrect.");
        return;
    }

    if (currentPw === newPw) {
        res.status(400).send("Error: Your new password is the same as your old one.");
        return;
    }

    let hashedPassword;
    try {
        hashedPassword = await argon2id.hash(newPw);
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Server-side password error. Please notify the devs!");
        return;
    }

    user.password = hashedPassword;
    await user.save();

    res.json({ success: true });
});

// ********************************************************************
// ************************** Other Routes ****************************
// ********************************************************************

app.get("/view_profile/:userId", async (req, res) => {
    const currentUser = await User.findById(req.session.userId).lean();

    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    const reviews = await Review.find({ userId: userId }).lean({ virtuals: true });
    user.reviews = reviews;

    if (req.session.userId === userId) {
        user.isCurrentUser = true;
    }

    res.render("view_profile", {user, currentUser});
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/");
    })
});

app.listen(3000, () => {
    console.log("Server running at port 3000");
});