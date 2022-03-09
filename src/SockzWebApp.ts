import fs from 'fs';
import path from 'path';
import express, { Express } from 'express';
// import session from 'express-session';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { ISockzWebApp } from './contracts';
import { SockzBase } from './SockzBase';
import { SockzController } from './SockzController';

const COOKIE_SESSION_SECRET = 'super secret';

// Better logger?
// From: https://github.com/expressjs/express/blob/master/examples/cookies/index.js
//-----------------------------------
// var logger = require('morgan');

//-----------------------------------
// Custom session interface typing
//-----------------------------------
// declare module 'express-session' {
//   export interface SessionData {
//     user: { [key: string]: any };
//   }
// }

export class SockzWebApp extends SockzBase implements ISockzWebApp {
  public server: Express;

  constructor(public ctl: SockzController) {
    super();

    this.server = express();

    this.routes();
  }

  public get publicDir(): string {
    return path.join(__dirname, '..', 'public');
  }

  public get buildDir(): string {
    return path.join(this.publicDir, 'build');
  }

  public get hasBuild(): boolean {
    return fs.existsSync(path.join(this.buildDir, 'index.html'));
  }

  private count(req, res, next) {
    req.session.count = (req.session.count || 0) + 1;
    this.log.debug('session viewed ' + req.session.count + ' times\n', req.session);
    next();
  }

  private health(req, res) {
    res.send('true');
  }

  private routes(): void {
    this.server.use(cookieSession({ secret: COOKIE_SESSION_SECRET }));
    this.server.use(cookieParser('my secret here'));

    // do something with the session
    this.server.use(this.count.bind(this));

    // parses x-www-form-urlencoded
    this.server.use(express.urlencoded({ extended: false }));

    // parses json data
    // this.server.use(express.json());

    this.server.get('/health', this.health.bind(this));

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

    const staticDir = this.hasBuild ? this.buildDir : this.publicDir;

    this.server.use(express.static(staticDir));

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

  //-----------------------------------
  // Auth example (not functional)
  // From: https://github.com/expressjs/express/blob/master/examples/auth/index.js
  //-----------------------------------
  // private auth() {
  //   this.server.set('view engine', 'ejs');
  //   this.server.set('views', path.join(__dirname, 'views'));

  //   // middleware

  //   this.server.use(express.urlencoded({ extended: false }));
  //   this.server.use(
  //     session({
  //       resave: false, // don't save session if unmodified
  //       saveUninitialized: false, // don't create session until something stored
  //       secret: 'shhhh, very secret'
  //     })
  //   );

  //   // Session-persisted message middleware

  //   this.server.use(function (req, res, next) {
  //     const err = req.session.error;
  //     const msg = req.session.success;
  //     delete req.session.error;
  //     delete req.session.success;
  //     res.locals.message = '';
  //     if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  //     if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  //     next();
  //   });

  //   // dummy database

  //   const users = {
  //     tj: { name: 'tj' }
  //   };

  //   // when you create a user, generate a salt
  //   // and hash the password ('foobar' is the pass here)

  //   hash({ password: 'foobar' }, function (err, pass, salt, hash) {
  //     if (err) throw err;
  //     // store the salt & hash in the "db"
  //     users.tj.salt = salt;
  //     users.tj.hash = hash;
  //   });

  //   // Authenticate using our plain-object database of doom!

  //   function authenticate(name, pass, fn) {
  //     if (!module.parent) console.log('authenticating %s:%s', name, pass);
  //     const user = users[name];
  //     // query the db for the given username
  //     if (!user) return fn(null, null);
  //     // apply the same algorithm to the POSTed password, applying
  //     // the hash against the pass / salt, if there is a match we
  //     // found the user
  //     hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
  //       if (err) return fn(err);
  //       if (hash === user.hash) return fn(null, user);
  //       fn(null, null);
  //     });
  //   }

  //   function restrict(req, res, next) {
  //     if (req.session.user) {
  //       next();
  //     } else {
  //       req.session.error = 'Access denied!';
  //       res.redirect('/login');
  //     }
  //   }

  //   this.server.get('/', function (req, res) {
  //     res.redirect('/login');
  //   });

  //   this.server.get('/restricted', restrict, function (req, res) {
  //     res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
  //   });

  //   this.server.get('/logout', function (req, res) {
  //     // destroy the user's session to log them out
  //     // will be re-created next request
  //     req.session.destroy(function () {
  //       res.redirect('/');
  //     });
  //   });

  //   this.server.get('/login', function (req, res) {
  //     res.render('login');
  //   });

  //   this.server.post('/login', function (req, res, next) {
  //     authenticate(req.body.username, req.body.password, function (err, user) {
  //       if (err) return next(err);
  //       if (user) {
  //         // Regenerate session when signing in
  //         // to prevent fixation
  //         req.session.regenerate(function () {
  //           // Store the user's primary key
  //           // in the session store to be retrieved,
  //           // or in this case the entire user object
  //           req.session.user = user;
  //           req.session.success =
  //             'Authenticated as ' +
  //             user.name +
  //             ' click to <a href="/logout">logout</a>. ' +
  //             ' You may now access <a href="/restricted">/restricted</a>.';
  //           res.redirect('back');
  //         });
  //       } else {
  //         req.session.error =
  //           'Authentication failed, please check your ' + ' username and password.' + ' (use "tj" and "foobar")';
  //         res.redirect('/login');
  //       }
  //     });
  //   });
  // }
}
