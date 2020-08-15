"user strict";
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'postgres',
		password: 'postgres',
		database: 'chatapp'
	}
});

const Koa = require('koa');
const app = new Koa();

// Set up middlewares

const bodyParser = require('koa-bodyparser');
app.use(bodyParser());

// Set up routes
const Router = require('koa-router');
const router = new Router();

router.get('/', async (ctxt, next) => {
	// Selects default user, sends it to frontend
	const defaultUser = await knex('users')
	.where({
		'user_name': 'root'
	})
	.select();

	ctxt.body = `Welcome User ${defaultUser[0].name}`;
});

router.get('/login', async (ctxt, next) => {
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

router.post('/login', async (ctxt, next) => {
	console.log('got params:', ctxt.request.body);
	ctxt.status = 301;
	ctxt.redirect('/');
});


app
.use(router.routes())
.use(router.allowedMethods());

app.listen(8080);
console.log('listening on 8080..');
