//jshint esversion:6

//1-IMPORTS & BOILERPLATE
//2-DATABASE OPERATIONS
//3-IMAGE UPLOADS
//4-Sign up
//5- Calculate price & state
//6-GETS & POSTS

//-----------------------------------------------------1-IMPORTS & BOILERPLATE-------------------------------------------------------------------------------------------------------

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const fs = require('fs');
const path = require('path');
const multer = require("multer");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static("public"));

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



//------------------------------------------------------2-DATABASE OPERATIONS--------------------------------------------------------------------------------------------------------


const mongoose = require("mongoose");

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/bilboDB", { useNewUrlParser: true, useUnifiedTopology: true });

var imageSchema = new mongoose.Schema({
  img:
  {
    data: Buffer,
    contentType: String
  },
  frequency: String,
  secondsDisplayed: String,
  time1: Boolean,
  time2: Boolean,
  time3: Boolean,
  time4: Boolean,
  time5: Boolean,
  time6: Boolean
});
var Image = new mongoose.model('Image', imageSchema);

//Billboard Collection CREATION
const billboardSchema = new mongoose.Schema({
  _id: Number,
  longitude: Number,
  latitude: Number,
  price: Number,
  length: Number,
  width: Number,
  state: String,
  images: [imageSchema],
  address: String,
  isFull: 0
});
const Billboard = mongoose.model("billboard", billboardSchema);


//CAMPAIGN COLLECTION CREATION
const campaignSchema = new mongoose.Schema({
  productName: String,
  startDate: String,
  endDate: String,
  state: Number, //0 --> Old Campaign, 1 --> Running Campaign, 2 --> Upcoming Campaign
  price: Number,
  billboards: [billboardSchema],
  frequency: String,
  secondsDisplayed: String,
  hoursDisplayed: Number,
  img: imageSchema,
  campaignCreated: Number, //0 --> still in hand, 1 --> campaign created
  approved: Boolean
});
const Campaign = mongoose.model("campaign", campaignSchema);

mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

//USER COLLECTION CREATION
const userSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  username: String,
  password: String,
  passwordUnhashed: String,
  campaigns: [campaignSchema],
  phone: String,
  company: String,
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("user", userSchema);


//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------




//-------------------------------------------------------------------3-IMAGE UPLOADS-------------------------------------------------------------------------------------------------

var storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads')
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + '-' + Date.now())
	}
});

var upload = multer({ storage: storage });

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------




//--------------------------------------------------------------------4-Sign up--------------------------------------------------------------------------------------------------------


// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/sign-up", function (req, res) {
  res.render(__dirname + "/views/sign-up.ejs", { auth: req.isAuthenticated() });
})

app.post("/sign-up", function (req, res) {

  var newUser = new User({
    fName: req.body.firstName,
    lName: req.body.lastName,
    username: req.body.username,
    passwordUnhashed: req.body.password,
    phone: req.body.phoneNumber,
    company: req.body.companyName,
    campaigns: []
  });

  User.register(newUser, req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      res.render(__dirname + "/views/login.ejs", { errormessage: "User Already Registered!" , auth: req.isAuthenticated()});
    } else {
      passport.authenticate("local")(req, res, function() {
        //home();
        res.redirect("/home");
      })
    }
  })
});

app.get("/login", function (req, res) {
  res.render(__dirname + "/views/login.ejs", {errormessage: "", auth: req.isAuthenticated()});
});

app.post('/login', function(req, res, next) {

  const user = new User({
         username: req.body.username,
         password: req.body.password
  });

  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.render(__dirname + "/views/login.ejs",
      {
        errormessage: "Incorrect Username or Password!",
        auth: req.isAuthenticated()
      })
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect("/home");
    });
  })(req, res, next);
});


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------





//-------------------------------------------------------------5- Calculate Price & State---------------------------------------------------------------------------------------------------

function calculatePrice(prices, hours, seconds, days, frequency) {

    var total = 0;
    hours /= 4;

    for(var i = 0; i < prices.length; i++) {
      var price = prices[i];

      if(hours != 0) {
        price *= hours;
      }

      if(seconds) {
        if(seconds === "10") {
          price += 1000;
        }
        if(seconds === "15") {
          price += 1500;
        }
        if(seconds === "20") {
          price += 2000;
        }
        if(seconds === "25") {
          price += 2500;
        }
        if(seconds === "30") {
          price += 3000;
        }
      }


      if(frequency) {
        if(frequency === "20") {
          price += 250;
        }
        if(frequency === "30") {
          price += 500;
        }
        if(frequency === "40") {
          price += 750;
        }
        if(frequency === "50") {
          price += 1000;
        }
        if(frequency === "60") {
          price += 1250;
        }
        if(frequency === "70") {
          price += 1500;
        }
        if(frequency === "80") {
          price += 1750;
        }
        if(frequency === "90") {
          price += 2000;
        }
        if(frequency === "100") {
          price += 2250;
        }
      }


      total += price;
    }

    total *= days;

    return total;
}

function state(startDate, endDate) {

  var dateStart = new Date(startDate);
  var dateEnd = new Date(endDate);
  var today = new Date();
  today.setHours(0,0,0,0);
  dateStart.setHours(0,0,0,0);
  dateEnd.setHours(0,0,0,0);
  var state;

  if(dateStart.getTime() > today.getTime()) {
    state = 2;
  } else {
    if(dateEnd.getTime() >= today.getTime()) {
      state = 1;
    } else {
      state = 0;
    }
  }

  return state;
}

function campaigns(campaigns) {

  var value = [0, 0 ,0];

  for(var i = 0; i < campaigns.length; i++) {
    if(campaigns[i].state === 0) {
      value[0]++;
    }
    else if(campaigns[i].state === 1) {
      value[1]++;
    }
    else {
      value[2]++;
    }
  }

  return value;
}


//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------







//-------------------------------------------------------------------6-GETS & POSTS------------------------------------------------------------------------------------------------------
var disapprovedCampaigns = [];
var approvedCampaigns = [];

app.get("/home", function (req, res) {
  Billboard.find({}, function(err, billboards) {
    if(err) {
      console.log(err);
    } else {
      if(req.user) {
        User.find({ username: req.user.username }, function(err, foundUser) {

          res.render(__dirname + "/views/home.ejs",
          {
            auth: req.isAuthenticated(),
            billboards: billboards,
            campaigns: foundUser[0].campaigns,
            name: foundUser[0].firstName
          });
        });
      }
      else {
        res.render(__dirname + "/views/home.ejs",
        {
          auth: req.isAuthenticated(),
          billboards: billboards,
          campaigns: [],
          name: ""
        });
      }
    }
  });
});

app.get("/", function (req, res) {
  Billboard.find({}, function(err, billboards) {
    if(err) {
      console.log(err);
    } else {
      if(req.user) {
        User.find({ username: req.user.username }, function(err, foundUser) {



          res.render(__dirname + "/views/home.ejs",
          {
            auth: req.isAuthenticated(),
            billboards: billboards,
            campaigns: foundUser[0].campaigns,
            name: foundUser[0].firstName
          });
        });
      }
      else {
        res.render(__dirname + "/views/home.ejs",
        {
          auth: req.isAuthenticated(),
          billboards: billboards,
          campaigns: [],
          name: ""
        });
      }
    }
  });
});

app.get("/admin/add-billboard", function (req, res) {
  res.render(__dirname + "/views/add-billboard.ejs",
  {
    auth: req.isAuthenticated()
  });
});

app.post("/admin/add-billboard", function (req, res) {
  var newBillboard = new Billboard({
    _id: req.body.id,
    longitude: req.body.longitude,
    latitude: req.body.latitude,
    length: req.body.length,
    width: req.body.width,
    price: req.body.price,
    state: req.body.state,
    address: req.body.address
  });

  newBillboard.save();

  res.redirect("/admin/add-billboard");
});

app.get("/billboard/:number", function (req, res) {
  var images1 = [];
  var images2 = [];
  var images3 = [];
  var images4 = [];
  var images5 = [];
  var images6 = [];
  var images = [];
  var totalFrequency1 = 0;
  var totalFrequency2 = 0;
  var totalFrequency3 = 0;
  var totalFrequency4 = 0;
  var totalFrequency5 = 0;
  var totalFrequency6 = 0;
  var totalFrequency = 0;
  var frequency1 = [];
  var frequency2 = [];
  var frequency3 = [];
  var frequency4 = [];
  var frequency5 = [];
  var frequency6 = [];
  var frequency = [];
  var totalSeconds1 = 0;
  var totalSeconds2 = 0;
  var totalSeconds3 = 0;
  var totalSeconds4 = 0;
  var totalSeconds5 = 0;
  var totalSeconds6 = 0;
  var totalSeconds = 0;

  Billboard.find({ _id: req.params.number}, function(err, billboard) {
    if(err) {
      res.render(__dirname + "/views/billboard.ejs",
      {
        images1: [],
        disapprovedCampaigns: disapprovedCampaigns
      });
    }
    else {
      for(var i = 0; i < billboard[0].images.length; i++) {
        var x = billboard[0].images[i];
        if(x != null) {
          if(x.time1) {
            images1.push(x);
            frequency1.push(parseInt(x.frequency));
            totalFrequency1 += parseInt(x.frequency);
            totalSeconds1 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
          if(x.time2) {
            images2.push(x);
            frequency2.push(parseInt(x.frequency));
            totalFrequency2 += parseInt(x.frequency);
            totalSeconds2 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
          if(x.time3) {
            images3.push(x);
            frequency3.push(parseInt(x.frequency));
            totalFrequency3 += parseInt(x.frequency);
            totalSeconds3 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
          if(x.time4) {
            images4.push(x);
            frequency4.push(parseInt(x.frequency));
            totalFrequency4 += parseInt(x.frequency);
            totalSeconds4 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
          if(x.time5) {
            images5.push(x);
            frequency5.push(parseInt(x.frequency));
            totalFrequency5 += parseInt(x.frequency);
            totalSeconds5 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
          if(x.time6) {
            images6.push(x);
            frequency6.push(parseInt(x.frequency));
            totalFrequency6 += parseInt(x.frequency);
            totalSeconds6 += (parseInt(x.secondsDisplayed) * parseInt(x.frequency));
          }
        }
      }

      const start1 = 0 * 60;
      const end1 =  4 * 60;

      const start2 = 4 * 60;
      const end2 =  8 * 60;

      const start3 = 8 * 60;
      const end3 =  12 * 60;

      const start4 = 12 * 60;
      const end4 =  16 * 60;

      const start5 = 16 * 60;
      const end5 =  20 * 60;

      const start6 = 20 * 60;
      const end6 =  24 * 60;

      const date = new Date();
      const now = date.getHours() * 60 + date.getMinutes();

      if(start1 <= now && now <= end1) {
        images = images1;
        frequency = frequency1;
        totalFrequency = totalFrequency1;
        totalSeconds = totalSeconds1;
      }
      else if(start2 <= now && now <= end2) {
        images = images2;
        frequency = frequency2;
        totalFrequency = totalFrequency2;
        totalSeconds = totalSeconds2;
      }
      else if(start3 <= now && now <= end3) {
        images = images3;
        frequency = frequency3;
        totalFrequency = totalFrequency3;
        totalSeconds = totalSeconds3;
      }
      else if(start4 <= now && now <= end4) {
        images = images4;
        frequency = frequency4;
        totalFrequency = totalFrequency4;
        totalSeconds = totalSeconds4;
      }
      else if(start5 <= now && now <= end5) {
        images = images5;
        frequency = frequency5;
        totalFrequency = totalFrequency5;
        totalSeconds = totalSeconds5;
      }
      else if(start6 <= now && now <= end6) {
        images = images6;
        frequency = frequency6;
        totalFrequency = totalFrequency6;
        totalSeconds = totalSeconds6;
      }

      if(totalSeconds > 11400) {
        Billboard.updateOne({_id: req.params.number}, {isFull: 1}, function(err) {
          if(err){
            console.log(err);
          }
        });
      }

      var secondsAd = (((4*60*60) - totalSeconds)/50)*1000;

      res.render(__dirname + "/views/billboard.ejs",
      {
        images1: images,
        totalFrequency: totalFrequency,
        frequency: frequency,
        disapprovedCampaigns: disapprovedCampaigns,
        secondsAd: secondsAd
      });
    }
  });
});

app.get("/billboard", function (req, res) {
  res.render(__dirname + "/views/billboard-demo.ejs",
  {

  });
});

app.get("/admin", function (req, res) {
  Campaign.find({}, function(err, campaigns) {
    res.render(__dirname + "/views/admin.ejs",
    {
      auth: req.isAuthenticated(),
      campaigns: campaigns
    });
  });
});

app.post("/admin", function(req, res) {

  Campaign.find({_id: req.body.approve}, function(err, campaign) {
    if(err) { console.log(err); }
    else {
      if(campaign[0].approved) {
        Campaign.findOneAndUpdate(
          { _id: req.body.approve },
          { approved: false }, function(err, doc) {
          if (err) { console.log(err); }
        });
        disapprovedCampaigns.push(campaign[0].img.id);
        approvedCampaigns.splice(approvedCampaigns.indexOf(campaign[0].id), 1);
      }
      else {
        Campaign.findOneAndUpdate(
          { _id: req.body.approve },
          { approved: true }, function(err, doc) {
          if (err) { console.log(err); }
        });
        Image.findById(campaign[0].img.id, function (err, image) {
            if (err){ console.log(err); }
            else {
              for(var i = 0; i < campaign[0].billboards.length; i++) {
                Billboard.findOneAndUpdate(
                  { _id: campaign[0].billboards[i]._id },
                  { $push: { images: image } }, function(err, doc) {
                  if (err) { console.log(err); }
                });
              }
            }
        });
        disapprovedCampaigns.splice(disapprovedCampaigns.indexOf(campaign[0].img.id), 1);
        approvedCampaigns.push(campaign[0].id);
      }
    }
  });

  res.redirect("/admin");
});

app.get("/about", function (req, res) {
  res.render(__dirname + "/views/about.ejs", { auth: req.isAuthenticated()});
});

app.get("/locations", function (req, res) {
  Billboard.find({}, function(err, billboards) {
    if(err) { console.log(err); }
    else {
      res.render(__dirname + "/views/locations.ejs",
      {
        auth: req.isAuthenticated(),
        billboards: billboards
      });
    }
  });
});

var dataArr = [];
var billboardsID = [];
var campaignID = "";
var showProduct = true;
var showImage = false;
var showMaps = false;
var showSchedule = false;
var imageID = "";
var price = 0;
var prices = [];
var checkboxValues = [0,0,0,0,0,0];

app.get("/process", function (req, res) {

  Billboard.find({}, function(err, billboards) {
    if(err) { console.log(err); }
    else {
      Campaign.find({ _id: campaignID }, function(err, campaign) {
        if(err) {
          res.render(__dirname + "/views/process.ejs",
          {
              billboards: billboards,
              dataArr: dataArr,
              image: null,
              campaign: {},
              auth: req.isAuthenticated(),
              price: price,
              showProduct: showProduct,
              showImage: showImage,
              showMaps: showMaps,
              showSchedule: showSchedule,
              checkboxValues: checkboxValues,
              billboardsID: billboardsID
          });
        }
        else {
          Image.find({_id: imageID}, (err, item) => {
            if (err) {
              res.render(__dirname + "/views/process.ejs",
              {
                billboards: billboards,
                dataArr: dataArr,
                image: null,
                price: price,
                campaign: campaign[0],
                auth: req.isAuthenticated(),
                showProduct: showProduct,
                showImage: showImage,
                showMaps: showMaps,
                showSchedule: showSchedule,
                checkboxValues: checkboxValues,
                billboardsID: billboardsID
              });
            }
            else {
              res.render(__dirname + "/views/process.ejs",
              {
                billboards: billboards,
                dataArr: dataArr,
                image: item,
                price: price,
                campaign: campaign[0],
                auth: req.isAuthenticated(),
                showProduct: showProduct,
                showImage: showImage,
                showMaps: showMaps,
                showSchedule: showSchedule,
                checkboxValues: checkboxValues,
                billboardsID: billboardsID
              });
            }
          });
        }
      });
    }
  });
});

app.post("/process/:number", upload.single('image'), function(req, res) {

  var num = req.params.number;
  var productName = "";
  var startDate = "";
  var endDate = "";

  if(num === "1") {

    showProduct = false;
    showImage = true;

    productName = req.body.productName;
    startDate = req.body.startDate;
    endDate = req.body.endDate;

    var dateStart = new Date(startDate);
    var dateEnd = new Date(endDate);
    var today = new Date();
    today.setHours(0,0,0,0);
    dateStart.setHours(0,0,0,0);
    dateEnd.setHours(0,0,0,0);
    var state;

    if(dateStart.getTime() > today.getTime()) {
      state = 2;
    } else {
      if(dateEnd.getTime() >= today.getTime()) {
        state = 1;
      } else {
        state = 0;
      }
    }

    var newCampaign = new Campaign({
      productName: productName,
      startDate: startDate,
      endDate: endDate,
      state: state,
      campaignCreated: 0,
      approved: false
    });
    newCampaign.save();
    campaignID = newCampaign.id;

  }
  else if(num === "2") {

    showImage = false;
    showMaps = true;

    if(req.file.filename != null) {
      var obj = {
    		img: {
    			data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
    			contentType: 'image/png'
    		}
    	}

      Campaign.find({ _id: campaignID }, function(err, campaign) {
          if(err) { console.log(err); }
          else {
            if(campaign.img) {
              Image.updateOne({ _id: imageID }, obj, function(err) {
                if(err) { console.log(err); }
              });

              Campaign.findOneAndUpdate({ _id: campaignID }, { img: obj }, function(err, doc) {
                if (err) { console.log(err); }
              });
            }
            else {
              Image.create(obj, (err, item) => {
            		if (err) { console.log(err); }
            		else {
                  Campaign.findOneAndUpdate({ _id: campaignID }, { img: item }, function(err, doc) {
                    if (err) { console.log(err); }
                  });

                  imageID = item._id;
            		}
            	});
            }
          }
      });
    }
  }
  else if(num === "3") {
    var arr = req.body.myField.split(",");

    for(var i = 0; i < arr.length; i++) {
      Billboard.find({_id: arr[i]}, function(err, billboard) {
        if(err) {
          console.log(err);
        } else {
          Campaign.updateOne({ _id: campaignID }, { $push: { billboards: billboard } }, function(err) {
            if(err) { console.log(err); }
          });
          dataArr.push([billboard[0].id, billboard[0].state, billboard[0].price, billboard[0].latitude, billboard[0].longitude, billboard[0].address]);
          prices.push(billboard[0].price);
          billboardsID.push(billboard[0].id)
        }
      });
    }

    Campaign.find({ _id: campaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {
        //Days
        var diffTime = Math.abs(new Date(campaign[0].endDate) - new Date(campaign[0].startDate));
        var days = Math.ceil((diffTime / (1000 * 60 * 60 * 24) ) + 1);

        price = calculatePrice(prices, 0, 0, days, 0);
      }
    });
  }
  else if(num === "4") {

      var hours = 0;
      checkboxValues = [0, 0, 0, 0, 0, 0];

      if(req.body.time1) {
        hours += 4;
        checkboxValues[0] = 1;
        Image.updateOne({ _id: imageID }, {time1: true}, function(err) {
          if(err) { console.log(err); }
        });
      }
      if(req.body.time2) {
        hours += 4;
        checkboxValues[1] = 1;
        Image.updateOne({ _id: imageID }, {time2: true}, function(err) {
          if(err) { console.log(err); }
        });
      }
      if(req.body.time3) {
        hours += 4;
        checkboxValues[2] = 1;
        Image.updateOne({ _id: imageID }, {time3: true}, function(err) {
          if(err) { console.log(err); }
        });
      }
      if(req.body.time4) {
        hours += 4;
        checkboxValues[3] = 1;
        Image.updateOne({ _id: imageID }, {time4: true}, function(err) {
          if(err) { console.log(err); }
        });
      }
      if(req.body.time5) {
        hours += 4;
        checkboxValues[4] = 1;
        Image.updateOne({ _id: imageID }, {time5: true}, function(err) {
          if(err) { console.log(err); }
        });
      }
      if(req.body.time6) {
        hours += 4;
        checkboxValues[5] = 1;
        Image.updateOne({ _id: imageID }, {time6: true}, function(err) {
          if(err) { console.log(err); }
        });
      }

      Campaign.find({ _id: campaignID }, function(err, campaign) {
        if(err) { console.log(err); }
        else {
          //Days
          var diffTime = Math.abs(new Date(campaign[0].endDate) - new Date(campaign[0].startDate));
          var days = Math.ceil((diffTime / (1000 * 60 * 60 * 24) ) + 1);

          var seconds = 0;

          if(campaign[0].secondsDisplayed != null) {
            seconds = campaign[0].secondsDisplayed;
          }

          var frequency = 0;

          if(campaign[0].frequency != null) {
            frequency = campaign[0].frequency;
          }

          price = calculatePrice(prices, hours, seconds, days, frequency);
        }
      });

      Campaign.updateOne({ _id: campaignID }, { hoursDisplayed: hours }, function(err) {
        if(err) { console.log(err); }
      });
  }
  else if(num === "6") {
    dataArr.splice(req.body.delete, 1);
    billboardsID.splice(req.body.delete, 1);

    prices = [];
    for(var i = 0; i < dataArr.length; i++) {
      prices.push(dataArr[i][2]);
    }

    Campaign.find({ _id: campaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {
        //Days
        var diffTime = Math.abs(new Date(campaign[0].endDate) - new Date(campaign[0].startDate));
        var days = Math.ceil((diffTime / (1000 * 60 * 60 * 24) ) + 1);

        price = calculatePrice(prices, 0, 0, days, 0);
      }
    });
  }
  else if (num === "7") {

    Campaign.find({ _id: campaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {
        //Days
        var diffTime = Math.abs(new Date(campaign[0].endDate) - new Date(campaign[0].startDate));
        var days = Math.ceil((diffTime / (1000 * 60 * 60 * 24) ) + 1);

        var seconds = 0;

        if(campaign[0].secondsDisplayed != null) {
          seconds = campaign[0].secondsDisplayed;
        }

        var hours = 0;

        if(campaign[0].hoursDisplayed != null) {
          hours = campaign[0].hoursDisplayed;
        }

        price = calculatePrice(prices, hours, seconds, days, req.body.frequency);
      }
    });

    Campaign.updateOne({ _id: campaignID }, { frequency: req.body.frequency }, function(err) {
      if(err) { console.log(err); }
    });

    Image.updateOne({ _id: imageID }, {frequency: req.body.frequency}, function(err) {
      if(err) { console.log(err); }
    });
  }
  else if (num === "8") {
    showMaps = false;
    showSchedule = true;
  }
  else {

    Campaign.updateOne({ _id: campaignID }, { secondsDisplayed: req.body.seconds }, function(err) {
      if(err) { console.log(err); }
    });

    Image.updateOne({ _id: imageID }, {secondsDisplayed: req.body.seconds}, function(err) {
      if(err) { console.log(err); }
    });

    Campaign.find({ _id: campaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {
        //Days
        var diffTime = Math.abs(new Date(campaign[0].endDate) - new Date(campaign[0].startDate));
        var days = Math.ceil((diffTime / (1000 * 60 * 60 * 24) ) + 1);

        var finalPrices = [];
        for(var i = 0; i < dataArr.length; i++) {
          finalPrices.push(dataArr[i][2]);
        }

        var frequency = 0;

        if(campaign[0].frequency != null) {
          seconds = campaign[0].frequency;
        }

        var hours = 0;

        if(campaign[0].hoursDisplayed != null) {
          hours = campaign[0].hoursDisplayed;
        }

        price = calculatePrice(prices, hours, req.body.seconds, days, frequency);
      }
    });
  }

  res.redirect("/process");
});

app.get("/payment", function (req, res) {

  Campaign.updateOne({ _id: campaignID }, { price: price }, function(err) {
    if(err) { console.log(err); }
  });
  Campaign.updateOne({ _id: campaignID }, { campaignCreated: 1 }, function(err) {
    if(err) { console.log(err); }
  });

  Campaign.find({ _id: campaignID }, function(err, campaign) {
    res.render(__dirname + "/views/payment.ejs", {
      auth: req.isAuthenticated(),
      campaignID: campaignID,
      campaign: campaign,
      dataArr: dataArr,
      price: price
    });
  });
});

app.get("/profile/campaigns/:number", function(req, res) {

  if(req.user) {
    Campaign.find({ _id: req.params.number }, function(err, newCampaign) {
      User.updateOne({ username: req.user.username }, { $push: { campaigns: newCampaign } }, function(err) {
        if(err) { console.log(err); }
      });
    });

    Campaign.find({ _id: req.params.number }, function(err, newCampaign) {
      res.render(__dirname + "/views/campaigns.ejs", {auth: req.isAuthenticated(), newCampaign: newCampaign});
    });
  }
});

var costArr = [];
var costBillboardsID = [];
var costCampaignID = "";
var costShowMaps = true;
var costShowSchedule = false;
var costPrice = 0;
var costPrices = [];
var costCheckboxValues = [0,0,0,0,0,0];

app.get("/cost-estimator", function (req, res) {

  Billboard.find({}, function(err, billboards) {
    if(err) { console.log(err); }
    else {
      Campaign.find({ _id: costCampaignID }, function(err, campaign) {
        if(err) {
          res.render(__dirname + "/views/cost-estimator.ejs",
          {
              billboards: billboards,
              costArr: costArr,
              campaign: {},
              auth: req.isAuthenticated(),
              costPrice: costPrice,
              showMaps: costShowMaps,
              showSchedule: costShowSchedule,
              costCheckboxValues: costCheckboxValues,
              costBillboardsID: costBillboardsID
          });
        }
        else {
          res.render(__dirname + "/views/cost-estimator.ejs",
          {
            billboards: billboards,
            costArr: costArr,
            campaign: campaign[0],
            auth: req.isAuthenticated(),
            costPrice: costPrice,
            showMaps: costShowMaps,
            showSchedule: costShowSchedule,
            costCheckboxValues: costCheckboxValues,
            costBillboardsID: costBillboardsID
          });
        }
      });
    }
  });
});

app.post("/cost-estimator/:number", function(req, res) {

  var num = req.params.number;

  if(num === "3") {

    var newCampaign = new Campaign({
      productName: "",
      startDate: "",
      endDate: "",
      state: 2,
      campaignCreated: 0
    });
    newCampaign.save();
    costCampaignID = newCampaign.id;

    var arr = req.body.myField.split(",");

    for(var i = 0; i < arr.length; i++) {
      Billboard.find({_id: arr[i]}, function(err, billboard) {
        if(err) {
          console.log(err);
        } else {
          Campaign.updateOne({ _id: costCampaignID }, { $push: { billboards: billboard } }, function(err) {
            if(err) { console.log(err); }
          });
          costArr.push([billboard[0].id, billboard[0].state, billboard[0].price, billboard[0].latitude, billboard[0].longitude, billboard[0].address]);
          costPrices.push(billboard[0].price);
          costBillboardsID.push(billboard[0].id)
        }
      });
    }

    Campaign.find({ _id: costCampaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {

        costPrice = calculatePrice(costPrices, 0, 0, 1, 0);
      }
    });
  }
  else if(num === "4") {

      hours = 0;
      costCheckboxValues = [0, 0, 0, 0, 0, 0];

      if(req.body.time1) {
        hours += 4;
        costCheckboxValues[0] = 1;
      }
      if(req.body.time2) {
        hours += 4;
        costCheckboxValues[1] = 1;
      }
      if(req.body.time3) {
        hours += 4;
        costCheckboxValues[2] = 1;
      }
      if(req.body.time4) {
        hours += 4;
        costCheckboxValues[3] = 1;
      }
      if(req.body.time5) {
        hours += 4;
        costCheckboxValues[4] = 1;
      }
      if(req.body.time6) {
        hours += 4;
        costCheckboxValues[5] = 1;
      }

      Campaign.find({ _id: costCampaignID }, function(err, campaign) {
        if(err) { console.log(err); }
        else {

          var seconds = 0;

          if(campaign[0].secondsDisplayed != null) {
            seconds = campaign[0].secondsDisplayed;
          }

          var frequency = 0;

          if(campaign[0].frequency != null) {
            frequency = campaign[0].frequency;
          }

          costPrice = calculatePrice(costPrices, hours, seconds, 1, frequency);
        }
      });

      Campaign.updateOne({ _id: costCampaignID }, { hoursDisplayed: hours }, function(err) {
        if(err) { console.log(err); }
      });
  }
  else if(num === "6") {
    costArr.splice(req.body.delete, 1);
    costBillboardsID.splice(req.body.delete, 1);

    costPrices = [];
    for(var i = 0; i < costArr.length; i++) {
      costPrices.push(costArr[i][2]);
    }

    Campaign.find({ _id: costCampaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {

        costPrice = calculatePrice(costPrices, 0, 0, 1, 0);
      }
    });
  }
  else if (num === "7") {

    Campaign.find({ _id: costCampaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {

        var seconds = 0;

        if(campaign[0].secondsDisplayed != null) {
          seconds = campaign[0].secondsDisplayed;
        }

        var hours = 0;

        if(campaign[0].hoursDisplayed != null) {
          hours = campaign[0].hoursDisplayed;
        }

        costPrice = calculatePrice(costPrices, hours, seconds, 1, req.body.frequency);
      }
    });

    Campaign.updateOne({ _id: costCampaignID }, { frequency: req.body.frequency }, function(err) {
      if(err) { console.log(err); }
    });
  }
  else if (num === "8") {
    costShowMaps = false;
    costShowSchedule = true;
  }
  else {

    Campaign.updateOne({ _id: costCampaignID }, { secondsDisplayed: req.body.seconds }, function(err) {
      if(err) { console.log(err); }
    });

    Campaign.find({ _id: costCampaignID }, function(err, campaign) {
      if(err) { console.log(err); }
      else {

        var finalPrices = [];
        for(var i = 0; i < costArr.length; i++) {
          finalPrices.push(costArr[i][2]);
        }

        var frequency = 0;

        if(campaign[0].frequency != null) {
          seconds = campaign[0].frequency;
        }

        var hours = 0;

        if(campaign[0].hoursDisplayed != null) {
          hours = campaign[0].hoursDisplayed;
        }

        costPrice = calculatePrice(costPrices, hours, req.body.seconds, 1, frequency);
      }
    });
  }

  res.redirect("/cost-estimator");
});

app.get("/cost", function (req, res) {
  costArr = [];
  costBillboardsID = [];
  costCampaignID = "";
  costShowMaps = true;
  costShowSchedule = false;
  costPrice = 0;
  costPrices = [];
  costCheckboxValues = [0,0,0,0,0,0];
  res.render(__dirname + "/views/cost.ejs", { auth: req.isAuthenticated()});
});

app.get("/edit-profile/:number", function (req, res) {

  var value = "";

  switch (req.params.number) {
    case "1": value = "First Name"; break;
    case "2": value = "Last Name"; break;
    case "3": value = "Company Name"; break;
    case "4": value = "Phone Number"; break;
    case "5": value = "Email"; break;
    case "6": value = "Password"; break;
    default: value = ""; break;
  }

  res.render(__dirname + "/views/edit-profile.ejs", {value: value, auth: req.isAuthenticated()});
});

app.post("/edit-profile/:number", function(req, res) {

  switch (req.params.number) {
    case "1": User.findOneAndUpdate({ fName: req.body.oldAtt }, { fName: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
    }); break;
    case "2": User.findOneAndUpdate({ lName: req.body.oldAtt }, { lName: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
    }); break;
    case "3": User.findOneAndUpdate({ company: req.body.oldAtt }, { company: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
    }); break;
    case "4": User.findOneAndUpdate({ phone: req.body.oldAtt }, { phone: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
    }); break;
    case "5": User.findOneAndUpdate({ username: req.body.oldAtt }, { username: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
    }); break;
    case "6": User.findOneAndUpdate({ passwordUnhashed: req.body.oldAtt }, { passwordUnhashed: req.body.newAtt }, function(err, doc) {
      if (err) { console.log(err); }
      doc.changePassword(req.body.oldAtt, req.body.newAtt);
    }); break;
    default: value = ""; break;
  }

  if( req.params.number != 5 ) {
    res.redirect("/home");
  } else {
    res.redirect("/login");
  }
});

app.get("/profile", function (req, res) {
  if(req.user) {
    User.find({username: req.user.username}, function(err, foundUser) {
      if(err) { console.log(err); }
      else {
        dataArr = [];
        billboardsID = [];
        campaignID = "";
        showProduct = true;
        showImage = false;
        showMaps = false;
        showSchedule = false;
        imageID = "";
        price = 0;
        prices = [];
        checkboxValues = [0,0,0,0,0,0];
        res.render(__dirname + "/views/profile.ejs",
        {
          foundUser: foundUser,
          auth: req.isAuthenticated(),
          campaigns: foundUser[0].campaigns,
          campaignNumber: campaigns(foundUser[0].campaigns),
          approvedCampaigns: approvedCampaigns
        });
      }
    });
  }
  else {
    res.redirect("/login");
  }
});

app.get("/services", function (req, res) {
  res.render(__dirname + "/views/services.ejs", { auth: req.isAuthenticated()});
})

app.listen(80, function() {
  console.log("Server started on port 80");
});
