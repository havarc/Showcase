var createError = require('http-errors');
const fs = require('fs')
const express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


const http = require('http')
const https = require('https')

// var key  = fs.readFileSync(`${__dirname}/sslcert/localhost.decrypted.key`, 'utf8');
// var cert = fs.readFileSync(`${__dirname}/sslcert/localhost.crt`, 'utf8');
var key  = fs.readFileSync(`/home/eisfuerst/Workspace/demo-site/myServer/sslcert/localhost.decrypted.key`, 'utf8');
var cert = fs.readFileSync(`/home/eisfuerst/Workspace/demo-site/myServer/sslcert/localhost.crt`, 'utf8');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

console.log(__dirname)

var app = express();
// app.get('/', (req, res, next) => {
//   res.status(200).send('Hello world!');
// });

// const server = https.createServer({ key, cert }, app);

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static('/Workspace/WebGL/website'));
// app.use(express.static(__dirname+'/../website'));
app.use(express.static('/home/eisfuerst/Workspace/demo-site/website'));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
const server = https.createServer({ key, cert }, app).listen(8000,  ()=>{console.log('server is runing at port 8000')});

module.exports = app;
