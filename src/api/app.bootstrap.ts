require('module-alias/register');

import {Application} from '@config/app.config';
import {Database} from '@config/database.config';
import {Server} from '@config/server.config';
import {TYPEORM} from '@config/environment.config';

Database.connect(TYPEORM);

const application = Application;
const server = Server.init(application).listen() as unknown;

export {application, server};
