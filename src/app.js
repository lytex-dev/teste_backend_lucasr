/* eslint-disable no-console,no-undef*/
import express     from 'express';
import bodyParser  from 'body-parser';
import compression from 'compression';
import morgan      from 'morgan';

// Config
import ApiConfig from './config/api.conf';

// Define environment object
const config = new ApiConfig();
const environment = config.getEnv();

// Core
import Cors         from './core/Cors';
import Routers      from './core/Routers';
import Database     from './core/Database';
import RequestQuery from './core/RequestQuery';
import SSL          from './core/SSL';
import Security     from './core/Security';
import Response     from './core/Response';
import Locales      from './core/Locales';
import Validator    from './core/Validator';
import LogsManager  from './core/LogsManager';
import Routines     from './core/Routines';


// Classes & app
const app = express();
const cors = new Cors();
const routers = new Routers();
const database = new Database();
const requestQuery = new RequestQuery();
const ssl = new SSL();
const security = new Security();
const response = new Response();
const locales = new Locales(environment.app.locale);
const validator = new Validator();
const logsManager = new LogsManager(environment);
const routines = new Routines();

process.env.TZ = environment.app.timezone;

process.prependListener('uncaughtException', error => {
    if (config.getEnvName() === 'development') throw error;
    else logsManager.log(error.stack);
});

// Set express app in Response class
response.setApp(app);

/**
 * Setup validator with Joi
 * @private
 */
const _setupValidator = () => {
    // Set locale in validator
    validator.setLocale(locales.locale, locales.getLocaleObject('joi'));
    validator.syncSettings();
};

/**
 * Use routes in app
 * @private
 */
const _setupRouters = () => {
    routers.syncRouters(app);
};

/**
 * Console log output
 * @param text
 * @private
 */
const _appLog = (text) => {
    if (config.getEnvName() !== 'test') {
        console.log(text);
    }
};

/**
 * Set the HTTP headers for cors and others
 * @private
 */
const _setupCors = () => {
    environment.server.cors['x-powered-by'] = environment.app.name;
    cors.setCors(app, environment.server.cors);
};

/**
 * Set databases properties and connect
 * @private
 */
const _setupDatabase = () => {

    // Define cors headers
    _setupCors();

    // Define validator configs
    _setupValidator();

    // Connect to databases
    if (Object.keys(environment.databases).length) {

        // Define languages
        database.setMongooseLocale(locales.getLocaleObject('mongoose'));

        database
            .connectDatabases(
                environment.databases,
                config.getEnvName() !== 'test'
            )
            .then(() => {
                return _setupRouters();
            })
            .catch(err => {
                throw err;
            });

    } else {
        _appLog('[!]\t No database to connect.');
        _setupRouters();
    }
};

/**
 * After Express listen with success run the setups functions...
 * @private
 */
const _listenSuccess = () => {

    // Init databases
    _setupDatabase();

    // Print in console app status
    _appLog(`\n${environment.app.name} on at ${environment.server.host}:${environment.server.port}\n`);

    // Detect if app is running in secure mode and print this
    if (environment.server.secure) {
        _appLog('[SSL_ON]\tSecure');
    } else {
        _appLog('[SSL_OFF]\tNOT SECURE (!)');
    }
};

// No use logs in test environment!
if (config.getEnvName() !== 'test') {
    app.use(morgan(config.getEnvName() === 'development' ? 'dev' : 'combined'));
}

// Express global usages and middlewares
app.use(bodyParser.json());
app.use(requestQuery.parseQuery);
app.use(compression({threshold: 100}));

// Security middlewares with helmet
security.makeSecure(app, environment.server.ssl.hpkpKeys);

// Create secure server or insecure server (see your *.env.js)
const server = environment.server.secure ? ssl.getHTTPSServer(app, environment.server.ssl) : app;

// Listen server
server.listen(environment.server.port, environment.server.host, _listenSuccess);

routines._setupRoutines();

export default app;