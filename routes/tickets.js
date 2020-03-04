let config = require("../config/config");
const express = require("express");
const router = express.Router();
const sgMail = require("@sendgrid/mail");
const Attendee = require("../models/Attendee");
const { avalibleUtils } = require("../helpers/constants");
const QRCode = require("qrcode");
const fs = require("fs");

router.post("/check/:util", async (req, res, next) => {
  const reqUtil = req.params.util;

  if (avalibleUtils.indexOf(reqUtil) === -1)
    return res
      .status(404)
      .json({ success: false, error: `${reqUtil} is not correct utility!` });

  if (!req.body.id) {
    return res
      .status(422)
      .json({ success: false, error: "No user id provided!" });
  }

  try {
    const id = req.body.id;
    const dbAttendee = await Attendee.findById(id);
    if (!dbAttendee)
      return res.status(404).json({ success: false, error: "user not found!" });

    const utils = dbAttendee.utils || [];
    if (utils.indexOf(reqUtil) !== -1)
      return res.status(400).json({
        success: false,
        error: `user already consumed ${reqUtil}!`
      });

    utils.push(reqUtil);
    dbAttendee.update({ utils: utils });
    await dbAttendee.save();
    return res.json({
      success: true,
      msg: `${dbAttendee.fullname} consumed ${reqUtil} successfully.`
    });
  } catch (e) {
    next(e);
  }
});
// TODO: Will Open before open
 router.post("/sendQRCodeEmails", async (req, res, next) => {
   try {
     // const dbAttendees = await Attendee.find();

     const dbAttendees = await Attendee.find({ category: "test" });
     // console.log(result);
     dbAttendees.forEach(a => {
       if (a.email) {
         sendEmail(a);
       }
     });
     return res.json({
       success: true,
       msg: `${dbAttendees.length} mails sent.`
     });
   } catch (e) {
     next(e);
   }
 });

 router.post("/generateQRCodes", async (req, res, next) => {
   try {
     const dbAttendees = await Attendee.find();
     // console.log(dbAttendees.length);
     dbAttendees.forEach(attendee => {
       generateQRCode(attendee);
     });
     return res.json({
       success: true,
       msg: `${dbAttendees.length} QR codes generated.`
     });
   } catch (e) {
     next(e);
   }
 });
 router.post("/generateQRCode/:id", async (req, res, next) => {
   try {
     if (!req.params.id)
       return res
         .status(400)
         .json({ success: false, error: "User ID is not provided." });
     const dbAttendee = await Attendee.findById(req.params.id);
     if (!dbAttendee)
       return res.status(404).json({ success: false, error: "No user found." });
     // console.log(dbAttendees.length);
     generateQRCode(dbAttendee);
     return res.json({
       success: true,
       msg: ` QR code generated for ${dbAttendee.fullname}.`
     });
   } catch (e) {
     next(e);
   }
 });

 router.post("/sendDemoEmail", async (req, res, next) => {
   try {
     // const demoAttendee = await Attendee.findOne({
     //   fullname: "test attendee"
     // });
     // const demoAttendee = new Attendee({
     //   _id: "from QR code",
     //   fullname: "some test guy",
     //   email: "some test guy's email",
     //   category: "test"
     // });
     const result = await Attendee.find({ category: "test" });
     // console.log(result);
     result.forEach(a => {
       if (a.email) {
         sendEmail(a);
       }
     });

     res.json(true);
   } catch (e) {
     next(e);
   }
 });

 function sendEmail(attendee) {
   generateQRCode(attendee, false, imageData => {
     // console.log(imageData);
     var transporter = nodemailer.createTransport({
       host: "smtp.gmail.com",
       port: 587,
       secure: false,
       requireTLS: true,
       auth: {
         user: "authorization email id",
         pass: "above mentioned email id's password"
       }
     });

     var mailOptions = {
       from: "email id of person/organisation sending mail",
       to: "attendee email",
       subject: "Your QRCode to attend <some event>.",
       text: `Hello ${attendee.fullname} <br/>Here is your QRCode to attend <some event>.`,
       attachments: [
         {
           filename: attendee.category + "-" + attendee.fullname + ".png",
           type: "image/png",
           content: imageData,
           content_id: "QRCode",
           disposition: "attachment",
           encoding: "base64"
         }
       ],
       html: `Hello ${attendee.fullname},<br/><br/>Thank you so much for registering for <b><some event>.</b><br/><br/>Here is your <b>QRCode</b> to attend <some event>.We hope to see you at the event.<br/><br/>`
     };
     // console.log(mailOptions);

     transporter.sendMail(mailOptions, function(error, info) {
       if (error) {
         console.log(error);
       } else {
         console.log("Email sent: " + info.response);
       }
     });
   });
 }
 function generateQRCode(attendee, save = true, callback) {
   QRCode.toDataURL(`${attendee._id}`, { version: 2 }, function(err, url) {
     if (err) {
       console.log(err);
       throw err;
     }
     const base64Data = url.replace(/^data:image\/png;base64,/, "");
     if (save) {
       fs.writeFile(
         "qrcodes/" + attendee.category + "-" + attendee.fullname + ".png",
         base64Data,
         "base64",
         function(err) {
           if (err) {
             console.log(err);
             throw err;
           }
         }
       );
     }

     if (callback) callback(base64Data);
   });
 }

module.exports = router;
