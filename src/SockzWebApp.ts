import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { ISockzWebApp } from './contracts';
import { SockzBase } from './SockzBase';
import { SockzController } from './SockzController';

const COOKIE_SESSION_SECRET = 'super secret';

// Better logger?
// From: https://github.com/expressjs/express/blob/master/examples/cookies/index.js
// var logger = require('morgan');

export class SockzWebApp extends SockzBase implements ISockzWebApp {
  public server: Express;

  constructor(public ctl: SockzController) {
    super();

    this.server = express();

    this.routes();
  }

  private count(req, res, next) {
    req.session.count = (req.session.count || 0) + 1;
    this.log.debug('session viewed ' + req.session.count + ' times\n', req.session);
    next();
  }

  private routes(): void {
    this.server.use(cookieSession({ secret: COOKIE_SESSION_SECRET }));
    this.server.use(cookieParser('my secret here'));

    // do something with the session
    this.server.use(this.count.bind(this));

    // parses x-www-form-urlencoded
    this.server.use(express.urlencoded({ extended: false }));

    this.server.get('/test', (req, res) => {
      if (req.cookies.remember) {
        res.send('Remembered :). Click to <a href="/forget">forget</a>!.');
      } else {
        res.send(
          '<form action="/remember" method="post"><p>Check to <label>' +
            '<input type="checkbox" name="remember"/> remember me</label> ' +
            '<input type="submit" value="Submit"/>.</p></form>'
        );
      }
    });

    this.server.get('/forget', (req, res) => {
      res.clearCookie('remember');
      res.redirect('back');
    });

    this.server.post('/remember', (req, res) => {
      const minute = 60000;
      if (req.body.remember) res.cookie('remember', 1, { maxAge: minute });
      res.redirect('back');
    });

    this.server.use(express.static('public/build'));

    // this.server.use('/console', express.static('public/build'));

    // this.server.get('/', (req, res) => {
    //   res.send('Hello World!');
    // });

    // this.server.post('/', (req, res) => {
    //   res.send('Got a POST request');
    // });

    // this.server.put('/user', (req, res) => {
    //   res.send('Got a PUT request at /user');
    // });

    // this.server.delete('/user', (req, res) => {
    //   res.send('Got a DELETE request at /user');
    // });
  }
}
