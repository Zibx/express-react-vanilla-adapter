var express = require("express");
var { ExpressAdapter } = require('../../express-adapter.js');

var path = require("path");

const app = express();

// Create `ExpressAdapter` and pass `app` for setting `GET` routes for built scripts
new ExpressAdapter({
  app: app,

  // default properties can be passed here
  html: 'html/index.html'
});

app.set("views", path.resolve(__dirname, "./views"));


app.get("/", (req, res) => {
  res.render("main", {
    message: "Hello World"
    // can use other `html` if needed
  });
});

app.use(express.static("public/"));

app.listen(3030, () => {
  console.log("express-react-vanilla example server listening on: 3030");
});