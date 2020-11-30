"user strict";
// Database
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'postgres',
		password: 'postgres',
		database: 'chatapp'
	}
});

// Cache
const redis = require('redis');
const promises = require('bluebird');
redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
redis.Multi.prototype = promises.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient();
redisClient.on('error', function(error) {
	console.error(error);
	throw error;
});

// Webserver
const Koa = require('koa');
const app = new Koa();
app.keys = ['supersecretkey123'];

// Set up middlewares
const cookieFieldName = 'chatapp!session!id';

// 1. Body Parser
const bodyParser = require('koa-bodyparser');
app.use(bodyParser());

// 2. Session
app.use(async (ctxt, next) => {
	const sessionId = ctxt.cookies.get(cookieFieldName, {
		'signed': true
	});

	if(!sessionId) {
		await next();
		return;
	}

	let sessionData = await redisClient.getAsync(sessionId);

	if(!sessionData) {
		ctxt.cookies.set(cookieFieldName);
		await next();
		return;
	}

	sessionData = JSON.parse(sessionData);

	let user = await knex.raw('SELECT id, user_name, name FROM users WHERE id = ?', [sessionData.user_id]);
	user = user.rows.length ? user.rows.shift() : null;

	if(!user){
		redisClient.del(sessionId);
		ctxt.cookies.set(cookieFieldName);
		await next();
		return;
	}

	await redisClient.setexAsync(sessionId, (24 * 60 * 60), JSON.stringify(sessionData));

	ctxt.cookies.set(cookieFieldName, sessionId, {
		'maxAge': (24 * 60 * 60 * 1000),
		'signed': true,
		'secure': false,
		'httpOnly': true,
		'overwrite': true	
	});

	ctxt.state.user = user;
	await next();
});

const ensureLoggedIn = async (ctxt, next) => {
	if(!ctxt.state.user) {
		ctxt.redirect('/login');
		return;
	}

	await next();
};

// Set up routes
const Router = require('koa-router');
const router = new Router();

/*
router.get('/', ensureLoggedIn, async (ctxt, next) => {
	// Selects default user, sends it to frontend
	const defaultUser = await knex('users')
	.where({
		'id': ctxt.state.user.id
	})
	.select();

	ctxt.body = `
<!DOCTYPE html>
<head>
	Chatapp
</head>
<body>
	Welcome User ${defaultUser[0].name}
	<form method="post" action="/logout">
		<div class="container">
			<button type="submit">Logout</button>
		</div>
	</form>
</body>`
});
*/

router.get('/user', async(ctxt, next) => {
	ctxt.body = 'Hello';
	if(ctxt.state.user)
		ctxt.body = JSON.stringify(ctxt.state.user);
	return;
});


router.get('/login', async (ctxt, next) => {
	if(ctxt.state.user) {
		ctxt.redirect('/')
		return;
	}

	const loginTemplate = `
<!DOCTYPE html>
<head>
	Chatapp
</head>
<body>
	<form method="post">
		<div class="container">
			<label for="uname"><b>Username</b></label>
			<input type="text" placeholder="Enter Username" name="uname" required>

			<label for="psw"><b>Password</b></label>
			<input type="password" placeholder="Enter Password" name="psw" required>

			<button type="submit">Login</button>
		</div>
	</form>
</body>
`;
	ctxt.body = loginTemplate; 
});

const uuid = require('uuid');

router.post('/login', async (ctxt, next) => {
	if(ctxt.state.user) {
		ctxt.redirect('/');
		return;
	}

	let user = await knex.raw(`SELECT * FROM users WHERE user_name = ?`, [ctxt.request.body['uname']]);
	user = user.rows.length ? user.rows.shift() : null;

	if(!user) {
		ctxt.throw(401, 'Invalid Credentials');
		return;
	}

	const passwordMatch = (user.password === ctxt.request.body.psw)// await bcrypt.compare(ctxt.request.body.psswd, user['password']);
	if(!passwordMatch) {
		ctxt.throw(401, 'Invalid Credentials');
		return;
	}

	// store session data in cache;
	const sessionData = JSON.stringify({
		'user_id': user.id
	});

	const sessionKey = uuid.v4();
	await redisClient.setexAsync(sessionKey, (24 * 60 * 60), sessionData);
	ctxt.cookies.set(cookieFieldName, sessionKey, {
		'maxAge': (24 * 60 * 60 * 1000),
		'signed': true,
		'secure': false,
		'httpOnly': true,
		'overwrite': true
	});

	ctxt.redirect('/');
	ctxt.body = 'Logged In Succesfully';
});

router.post('/logout', async (ctxt, next) => {
	if(!ctxt.state.user) {
		ctxt.redirect('/login')
		return;
	}

	const sessionId = ctxt.cookies.get(cookieFieldName, {
		'secure': false
	});

	if(!sessionId) {
		ctxt.redirect('/login')
		return;
	}

	ctxt.cookies.set(cookieFieldName);
	await redisClient.delAsync(sessionId);

	ctxt.redirect('/login');
	ctxt.body = 'Logged Out';
});

// Serve static files
const send = require('koa-send');
router.get('/public', async (ctxt, next) => {
	console.log('hit');
	const path = require('path');
	const root = path.join(path.dirname(__dirname), 'frontend/public');
	console.log(root, ctxt.path);
	const filePath = path.relative('/public', ctxt.path);

	if(!filePath) {
		ctxt.throw(404, 'No Path Specified');
		return;
	}



	await send(ctxt, filePath, { root: root});
});

/*
router.get('/', async (ctxt, next) => {
	await send(ctxt, 'frontend/index.html');
});
*/

app
.use(router.routes())
.use(router.allowedMethods());

app.listen(8080);
console.log('listening on 8080..');
