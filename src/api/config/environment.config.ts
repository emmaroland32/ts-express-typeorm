import { ENVIRONMENT } from '@enums/environment.enum';
import { ARCHIVE_MIME_TYPE, AUDIO_MIME_TYPE, DOCUMENT_MIME_TYPE, IMAGE_MIME_TYPE, VIDEO_MIME_TYPE, CONTENT_MIME_TYPE, MIME_TYPE } from '@enums/mime-type.enum';
import { list } from '@utils/enum.util';
import { existsSync } from 'fs';

/**
 * Configure dotenv with variables.env file before app, to allow process.env accessibility in
 * app.js
 *
 * @dependency dotenv
 *
 * @see https://www.npmjs.com/package/dotenv
 *
 * FIXME: encrypt confidential data on env variables (ie typeorm)
 */
class EnvironmentConfiguration {

  /**
   * @description Current environment (default development)
   */
  static environment: string = ENVIRONMENT.development;

  /**
   * @description Current root dir
   */
  static base: string;

  /**
   * @description Set env according to args, and load .env file
   */
  static load() {
    if (process.argv && process.argv.indexOf('--env') !== -1 ) {
      EnvironmentConfiguration.environment = ENVIRONMENT[process.argv[process.argv.indexOf('--env') + 1]] as string || ENVIRONMENT.development;
    }
    switch (EnvironmentConfiguration.environment) {
      case ENVIRONMENT.development:
        EnvironmentConfiguration.base = 'dist';
      break;
      case ENVIRONMENT.staging:
        EnvironmentConfiguration.base = '';
      break;
      case ENVIRONMENT.production:
        EnvironmentConfiguration.base = '';
      break;
      case ENVIRONMENT.test:
        EnvironmentConfiguration.base = 'dist';
      break;
    }
    const path = `${process.cwd()}/${EnvironmentConfiguration.base}/env/${EnvironmentConfiguration.environment}.env`;
    if (!existsSync(path)) {
      throw new Error(`.env file not found on ${path}`);
    }
    const dtv: { config: (options) => void, parse: () => void } = require('dotenv') as { config: () => void, parse: () => void };
    dtv.config( { path} );
  }

}

EnvironmentConfiguration.load();

/**
 * @description Authorized remote(s) host(s)
 */
const authorized = ((value: string) => {
  if (!value) {
    throw new Error('AUTHORIZED not found. Please fill this value in your .env file to indicate allowed hosts.');
  }
  return value;
})(process.env.AUTHORIZED);

/**
 * @description Supported Content-Type as application/json | application/vnd.api+json | multipart/form-data
 */
 const contentType = ((value: string) => {
  if (value && !CONTENT_MIME_TYPE[value]) {
    throw new Error(`CONTENT_TYPE bad value. Supported Content-Type must be one of ${list(CONTENT_MIME_TYPE).join(',')}`);
  }
  return value || CONTENT_MIME_TYPE['application/json'];
})(process.env.CONTENT_TYPE);

/**
 * @description Current runtime environment as development | staging | production | test
 */
 const env = EnvironmentConfiguration.environment;

/**
 * @description JWT exiration duration in minutes
 */
 const jwtExpirationInterval = ((value: string) => {
  if (!value) {
    throw new Error('JWT_EXPIRATION_MINUTES not found. Please fill this value in your .env file to indicate the life duration of JSON web token.');
  }
  if (isNaN(parseInt(value, 10))) {
    throw new Error('JWT_EXPIRATION_MINUTES bad value. Expiration value must be a duration expressed as a number');
  }
  return parseInt(value, 10);
})(process.env.JWT_EXPIRATION_MINUTES);

/**
 * @description JWT secret token
 */
 const jwtSecret = ((value: string) => {
  if (!value) {
    throw new Error('JWT_SECRET not found. Please fill this value in your .env file to strengthen the encryption.');
  }
  return value;
})(process.env.JWT_SECRET);

/**
 * @description Logs configuration
 *
 *  - token: morgan output pattern. Default: dev
 *  - path: root directory for logs. Default: logs
 */
const logs = Object.freeze({
  token: EnvironmentConfiguration.environment === 'production' ? 'combined' : process.env.LOGS_MORGAN_TOKEN || 'dev',
  path: `${process.cwd()}/${EnvironmentConfiguration.base}/${process.env.LOGS_PATH || 'logs'}`
});

/**
 * @description Listened port. Default 8001
 */
 const port = ((value: string) => {
  if (value && isNaN(parseInt(value,10))) {
    throw new Error('PORT bad value. Port value must be a number');
  }
  return value;
})(process.env.PORT);

/**
 * @description Image resize configuration
 *
 *  - isActive: enable|disable image resize feature. Default: disabled
 *  - destinations: destination paths for images
 *    - master: directory for original copy (required). Default: master-copy
 *    - scale: directory for resizes. Default: rescale
 *  - sizes: image sizes definitions. Default: 260, 320, 768, 1024, 1366
 */
 const resize = Object.freeze({
  isActive: !!parseInt(process.env.RESIZE_IS_ACTIVE, 10) || false,
  destinations: {
    master: process.env.RESIZE_PATH_MASTER || 'master-copy',
    scale: process.env.RESIZE_PATH_SCALE || 'rescale'
  },
  sizes: {
    xs: parseInt(process.env.RESIZE_SIZE_XS, 10) || 280,
    sm: parseInt(process.env.RESIZE_SIZE_SM, 10) || 320,
    md: parseInt(process.env.RESIZE_SIZE_MD, 10) || 768,
    lg: parseInt(process.env.RESIZE_SIZE_LG, 10) || 1024,
    xl: parseInt(process.env.RESIZE_SIZE_XL, 10) || 1366
  }
});

/**
 * @description HTTPS configuration
 *
 *  - isActive: enable|disable HTTPS. Default: disabled
 *  - key: path to private key
 *  - cert: path to SSL certificate
 */
const ssl = ((isActive: string, key: string, cert: string) => {
  const is = !!parseInt(isActive, 10);
  if (is && !existsSync(key)) {
    throw new Error('HTTPS_KEY bad value or private key not found. Please check your .env file configuration.')
  }
  if (is && !existsSync(cert)) {
    throw new Error('HTTPS_CERT bad value or SSL certificate not found. Please check your .env file configuration.')
  }
  return Object.freeze({
    isActive: is,
    key: is ? key || null : null,
    cert: is ? cert || null : null
  });
})(process.env.HTTPS_IS_ACTIVE, process.env.HTTPS_KEY, process.env.HTTPS_CERT);

/**
 * @description TypeORM configuration
 *
 *  - type: database server type (mysql, postgresql, ...)
 *  - name: connection name
 *  - port: database server port
 *  - host: database server host address
 *  - database: database name
 *  - user: database user
 *  - pwd: database user password
 *  - sync: enable|disable typeorm schema synchronization (by default disabled in production)
 *  - log: enable|disable typeorm logs
 *  - entities: directory path of models that should be managed by typeorm
 */
const typeormParams = Object.keys(process.env)
  .filter(key => key.lastIndexOf('TYPEORM') !== -1)
  .reduce( (acc, current) => {
    acc[current] = process.env[current];
    return acc;
  }, {});

const typeorm = ((args: Record<string,unknown>, environment: string) => {
  if(!args.TYPEORM_TYPE) {
    throw new Error('TYPEORM_TYPE not found. Please fill it in your .env file to define the database engine type.');
  }
  if(!args.TYPEORM_PORT) {
    throw new Error('TYPEORM_PORT not found. Please fill it in your .env file to define the database server port.');
  }
  if(!args.TYPEORM_HOST) {
    throw new Error('TYPEORM_HOST not found. Please fill it in your .env file to define the database server host.');
  }
  if(!args.TYPEORM_DB) {
    throw new Error('TYPEORM_DB not found. Please fill it in your .env file to define the targeted database.');
  }
  if(!args.TYPEORM_USER) {
    throw new Error('TYPEORM_USER not found. Please fill it in your .env file to define the user of the database.');
  }
  if(!args.TYPEORM_PWD && environment !== ENVIRONMENT.test) {
    throw new Error('TYPEORM_PWD not found. Please fill it in your .env file to define the password of the database.');
  }
  return Object.freeze({
    type: process.env.TYPEORM_TYPE,
    name: process.env.TYPEORM_NAME || 'default',
    port: process.env.TYPEORM_PORT,
    host: process.env.TYPEORM_HOST,
    database: process.env.TYPEORM_DB,
    user: process.env.TYPEORM_USER,
    pwd: process.env.TYPEORM_PWD,
    sync: environment === ENVIRONMENT.production ? false : !!process.env.TYPEORM_SYNC,
    log: !!process.env.TYPEORM_LOG,
    entities: `${process.cwd()}/${EnvironmentConfiguration.base}/api/models/**/*.js`,
    migrations: `${process.cwd()}/${EnvironmentConfiguration.base}/migrations/**/*.js`,
    subscribers: `${process.cwd()}/${EnvironmentConfiguration.base}/api/subscribers/**/*.subscriber.js`
  });
})(typeormParams, env);

/**
 * @description File upload default configuration. Can be setted on the fly when you define upload middleware options
 *
 *  - destination: upload directory path
 *  - filesize: max filesize
 *  - wildcards: accepted mime-type
 *  - maxFiles: max number of files by request
 */
const uploadParams = Object.keys(process.env)
  .filter(key => key.lastIndexOf('UPLOAD') !== -1)
  .reduce( (acc, current) => {
    acc[current] = process.env[current];
    return acc;
  }, {});

const upload = ((args: Record<string, unknown>) => {
  const mimes = { AUDIO: AUDIO_MIME_TYPE, ARCHIVE: ARCHIVE_MIME_TYPE, DOCUMENT: DOCUMENT_MIME_TYPE, IMAGE: IMAGE_MIME_TYPE, VIDEO: VIDEO_MIME_TYPE };
  const input = args.UPLOAD_WILDCARDS ? args.UPLOAD_WILDCARDS.toString().split(',') : Object.keys(mimes);
  const wildcards = input
    .filter(key => mimes[key])
    .map(key => mimes[key] as Record<string,unknown> )
    .reduce((acc,current) => {
      return [...acc as string[], ...list(current)] as string[];
    }, []);
  return {
    destination: `${process.cwd()}/${EnvironmentConfiguration.base}/${args.UPLOAD_PATH as string || 'public'}`,
    filesize: parseInt(args.UPLOAD_MAX_FILE_SIZE as string, 10) || 1000000,
    wildcards,
    maxFiles: parseInt(args.UPLOAD_MAX_FILES as string, 10) || 5
  };
})(uploadParams);

/**
 * @description Current API version
 */
const version = process.env.API_VERSION || 'v1';

export { env, port, authorized, contentType, ssl, jwtSecret, jwtExpirationInterval, version, logs, typeorm, upload, resize };