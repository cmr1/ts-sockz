import fs from 'fs';
import path from 'path';
import cors from 'cors';
// import * as got from 'got';
import * as jose from 'jose';
import Stripe from 'stripe';
import express, { Express } from 'express';
import session from 'express-session';
// import cookieParser from 'cookie-parser';
// import cookieSession from 'cookie-session';
import { auth, requiresAuth } from 'express-openid-connect';
import { ISockzWebApp } from './contracts';
import { SockzBase } from './SockzBase';
import { SockzController } from './SockzController';

// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
import { Firestore } from '@google-cloud/firestore';

const { SESSION_SECRET = 'super secret session' } = process.env;

interface CreateUserParams {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  nickname?: string;
  email_verified?: boolean;
  stripe_customer_id?: string;
}

class SockzUser extends SockzBase {
  constructor(public app: SockzWebApp, public data: CreateUserParams) {
    super(data.sub);
  }

  get docPath(): string {
    return `users/${this.id}`;
  }

  get doc() {
    return this.app.database.doc(this.docPath);
  }

  async exists(): Promise<boolean> {
    try {
      await this.doc.get();
      return true;
    } catch (err) {
      this.log.warn(err);
      return false;
    }
  }

  async get() {
    return await this.doc.get();
  }

  async delete() {
    const existing = await this.doc.get();

    if (existing) {
      await this.doc.delete();
      this.log.debug('Deleted the document');
    } else {
      this.log.debug('Cannot delete user, does not exist');
    }

    return this.doc;
  }

  async save(data?: object) {
    try {
      await this.doc.get();
      await await this.doc.update({ ...this.data, ...data });
      this.log.debug('Updated an existing document');
    } catch (err) {
      this.log.warn(err);
      await this.doc.set({ ...this.data, ...data });
      this.log.debug('Entered new data into the document');
    }

    return this.doc;
  }

  async register() {
    if (await this.exists()) {
      const document = await this.get();
      const docData = document.data() as CreateUserParams;
      this.data = { ...this.data, ...docData };
    } else {
      await this.save();
    }

    await this.findOrCreateStripeCustomer();
  }

  public async findOrCreateStripeCustomer(): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const findCustomer = await this.findStripeCustomer();

    this.log.debug('Finding customer', findCustomer);

    if (findCustomer) {
      return findCustomer;
    } else {
      return await this.createStripeCustomer();
    }
  }

  public async createStripeCustomer(): Promise<Stripe.Customer> {
    const params: Stripe.CustomerCreateParams = {
      name: this.data.name,
      email: this.data.email,
      // metadata: this.data,
      description: this.data.nickname || this.data.name
    };

    const customer: Stripe.Customer = await this.app.stripe.customers.create(params);

    this.log.debug('Created stripe customer:', customer);

    this.data.stripe_customer_id = customer.id;

    await this.save();

    return customer;
  }

  public async findStripeCustomer(): Promise<Stripe.Customer | Stripe.DeletedCustomer | null> {
    if (this.data.stripe_customer_id) {
      const customer: Stripe.Customer | Stripe.DeletedCustomer = await this.app.stripe.customers.retrieve(
        this.data.stripe_customer_id
      );

      this.log.debug('Retrieved stripe customer:', customer);

      return customer;
    } else {
      return null;
    }
  }
}

declare module 'jose' {
  export interface UserClaimsPayload extends jose.JWTPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    iat?: number;
    exp?: number;
    nonce?: string;
    name?: string;
    email?: string;
    picture?: string;
    nickname?: string;
    updated_at?: Date;
    email_verified?: boolean;
  }
}

// interface ExampleApiResponse {
//   message: string;
// }

// Better logger?
// From: https://github.com/expressjs/express/blob/master/examples/cookies/index.js
//-----------------------------------
// var logger = require('morgan');

//-----------------------------------
// Custom session interface typing
//-----------------------------------
declare module 'express-session' {
  export interface SessionData {
    user: CreateUserParams;
  }
}

export class SockzWebApp extends SockzBase implements ISockzWebApp {
  public stripe: Stripe;
  public server: Express;
  public database: Firestore;

  constructor(public ctl: SockzController, public cors?: cors.CorsOptions) {
    super();

    this.server = express();
    this.stripe = this.ctl.stripe;
    this.database = this.ctl.database;

    this.init();
    this.views();
    this.auth();
    this.routes();
    this.static();
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

  public get corsDefault(): cors.CorsOptions {
    return {
      origin: '*',
      optionsSuccessStatus: 200
    };
  }

  public init() {
    this.server.use(cors(this.corsOptions()));

    this.server.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
      })
    );

    // this.server.use(cookieSession({ secret: SESSION_SECRET }));
    // this.server.use(cookieParser(SESSION_SECRET));

    // do something with the session
    this.server.use(this.count.bind(this));

    // parses x-www-form-urlencoded
    // this.server.use(express.urlencoded({ extended: false }));

    // parses json data
    // this.server.use(express.json());

    this.server.get('/health', this.health.bind(this));
  }

  public corsOptions(extra?: cors.CorsOptions): cors.CorsOptions {
    const opts = this.cors || this.corsDefault;

    return { ...opts, ...extra };
  }

  private count(req, res, next) {
    this.log.debug('count()', req.session);
    req.session.count = (req.session.count || 0) + 1;
    this.log.debug('session viewed ' + req.session.count + ' times\n', req.session);
    next();
  }

  private health(req, res) {
    res.send('true');
  }

  private auth(): void {
    this.server.use(
      auth({
        issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
        baseURL: process.env.BASE_URL,
        clientID: process.env.AUTH0_CLIENT_ID,
        secret: process.env.SESSION_SECRET,
        authRequired: false,
        auth0Logout: true,
        clientSecret: process.env.CLIENT_SECRET,
        authorizationParams: {
          response_type: 'code',
          audience: process.env.AUTH0_AUDIENCE
        },
        afterCallback: async (req, res, session) => {
          const claims: jose.UserClaimsPayload = jose.decodeJwt(session.id_token); // using jose library to decode JWT
          // if (claims.org_id !== 'Required Organization') {
          //   throw new Error('User is not a part of the Required Organization');
          // }

          this.log.debug('session', session);
          this.log.debug('claims', claims);

          const data = jose.decodeJwt(session.access_token);
          const message = JSON.stringify(data, null, 2);

          this.log.debug(message);

          const user = new SockzUser(this, claims);
          await user.register();

          req.session.user = user.data;

          this.log.warn('afterCallback session', req.session, session);

          return session;
        }
      })
    );

    this.server.use((req, res, next) => {
      res.locals.isAuthenticated = req.oidc.isAuthenticated();
      res.locals.activeRoute = req.originalUrl.replace(/^\//, '');

      next();
    });

    // > Sign Up

    this.server.get('/sign-up', (req, res) => {
      res.oidc.login({
        authorizationParams: {
          screen_hint: 'signup'
        }
      });
    });

    // > Home

    this.server.get('/', (req, res) => {
      res.render('home');
    });

    // > Profile

    this.server.get('/profile', requiresAuth(), async (req, res) => {
      this.log.debug(req.oidc.idTokenClaims);
      this.log.debug(req.session);

      if (req.session.user) {
        const user = new SockzUser(this, req.session.user);
        const customer = await user.findStripeCustomer();

        res.render('profile', {
          user: req.oidc.user,
          sockz: req.session.user,
          customer: customer
        });
      } else {
        res.render('profile', {
          user: req.oidc.user
        });
      }
    });

    this.server.get('/pricing', requiresAuth(), async (req, res) => {
      const plans = await this.stripe.plans.list();

      this.log.warn('Loaded plans', plans);

      res.render('pricing', {
        plans: plans.data
      });
    });

    // > External API

    this.server.get('/external-api', (req, res) => {
      res.render('external-api');
    });

    this.server.get('/external-api/public-message', async (req, res) => {
      const message = 'no';

      // try {
      //   const body: ExampleApiResponse = await got.get(
      //     `${process.env.SERVER_URL}/api/messages/public-message`,
      //   ).json();

      //   message = body.message;
      // } catch (e) {
      //   message = 'Unable to retrieve message.';
      // }

      res.render('external-api', { message });
    });

    this.server.get('/external-api/protected-message', requiresAuth(), async (req, res) => {
      const { token_type, access_token } = req.oidc.accessToken as { token_type: string; access_token: string };
      const data = jose.decodeJwt(access_token);
      const message = JSON.stringify({ data, token_type, access_token }, null, 2);

      this.log.debug(message);

      // try {
      //   const body: ExampleApiResponse = await got.get(
      //     `${process.env.SERVER_URL}/api/messages/protected-message`,
      //     {
      //       headers: {
      //         Authorization: `${token_type} ${access_token}`,
      //       },
      //     },
      //   ).json();

      //   message = body.message;
      // } catch (e) {
      //   message = 'Unable to retrieve message.';
      // }

      res.render('external-api', { message });
    });

    this.server.get('/sign-up/:page/:section?', (req, res) => {
      const { page, section } = req.params;

      res.oidc.login({
        returnTo: section ? `${page}/${section}` : page,
        authorizationParams: {
          screen_hint: 'signup'
        }
      });
    });

    this.server.get('/login/:page/:section?', (req, res) => {
      const { page, section } = req.params;

      res.oidc.login({
        returnTo: section ? `${page}/${section}` : page
      });
    });

    this.server.get('/logout/:page/:section?', (req, res) => {
      // const { page } = req.params;

      res.oidc.logout();
    });
  }

  private static(dir?: string): void {
    const staticDir = dir || this.hasBuild ? this.buildDir : this.publicDir;

    this.server.use(express.static(staticDir));
  }

  private views(): void {
    this.server.set('views', path.join(__dirname, 'views'));
    this.server.set('view engine', 'pug');
  }

  private routes(): void {
    // this.server.get('/test', (req, res) => {
    //   if (req.cookies.remember) {
    //     res.send('Remembered :). Click to <a href="/forget">forget</a>!.');
    //   } else {
    //     res.send(
    //       '<form action="/remember" method="post"><p>Check to <label>' +
    //         '<input type="checkbox" name="remember"/> remember me</label> ' +
    //         '<input type="submit" value="Submit"/>.</p></form>'
    //     );
    //   }
    // });
    // this.server.get('/forget', (req, res) => {
    //   res.clearCookie('remember');
    //   res.redirect('back');
    // });
    // this.server.post('/remember', (req, res) => {
    //   const minute = 60000;
    //   if (req.body.remember) res.cookie('remember', 1, { maxAge: minute });
    //   res.redirect('back');
    // });
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
  //     if (!module.parent) this.log.debug('authenticating %s:%s', name, pass);
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
