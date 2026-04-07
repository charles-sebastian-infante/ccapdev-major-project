# Restaurant / Store / Service Review Web Application

## Team Members

- **GENDRANO, Christian**
- **HIZON, Allen**
- **INFANTE, Charles**
- **LEE, Hannah**

## How to Setup and Run the Application Locally
- Make sure you have Node.js and MongoDB installed
- Open Command Prompt and go to the "src" folder of this project
- Run the command `npm install`
- Run the command `node index.js`
- On a browser, go to localhost:3000

## How to Manually Manipulate the Data in the Database
- Currently, this can be done using command line arguments.
- `node index.js clear-db` - Empties the database
- `node index.js insert-sample-data` - Populates the database with sample data
- `node index.js reset` - Empties the database, then inserts sample data

## Features
```
- View charts
  - An unregistered visitor may see a list of charts featured in the web application.
  - The actual difficulty rating and average user rating can be seen from the list.

- View chart reviews
  - On selecting a chart, users can see top reviews - the rest of the reviews are on the succeeding pages.
  - Long reviews are truncated.
  - The number of people who have liked each review is also shown.

- Register
  - Users must register an account in order to post reviews.
  - Users must have a username, a password, an avatar (can be a default avatar), and an optional description.

- Login
  - Users can login once registered.
  - Users have the option to be remembered upon login, where they do not need to log in each time they visit
  - Each subsequent login and visit extends the "remember" period by three (3) weeks.

- Logout
  - Logs the user out of the website.
  - All session data is removed and the "remember" period is cut short.

- View a user profile
  - Each user has a public page which shows their profile.
  - Visitors can see a user's username, profile picture, short description, and a list of their reviews.
  - Visitors may opt to see the rest of the posts and comments by said user.

- Edit profile
  - Logged-in users can edit their user profile.
  - Users can modify their username, password, rating, description, and profile picture.

- Create review
  - Logged-in users can create a review on a chart.
  - A review must have title, rating, and post body.
  - A user can attach an image or video to their review.

- Like Review
  - Logged-in users can like reviews.

- Edit / Delete review
  - A user can edit / delete a review they posted at any time.
  - Edits leave an indication that the review was edited.

- Search charts
  - Visitors and users can search for charts.
  - When entering a search phrase/word, all chart containing the search phrase appear.
  - Users can filter by difficulty, or sort by rating or charter name.

- Search reviews
  - Visitors and users can also search for reviews.

- Charter response
  - A charter can respond to reviews on any of their charts.
  - Note that charters must be manually added by a database administrator.
```
